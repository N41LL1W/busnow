import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { computeArrivals } from "@/lib/eta";
import { getVehiclePositions } from "@/lib/positions";
import { getLinesWithStops } from "@/lib/queries";

// Tudo que vem de fora (a URL) é validado: nunca confie no que chega
const querySchema = z.object({
  stopId: z.coerce.number().int().positive(),
});

export async function GET(request: Request) {
  await connection();

  const parsed = querySchema.safeParse({
    stopId: new URL(request.url).searchParams.get("stopId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetro stopId inválido." },
      { status: 400 }
    );
  }

  const { stopId } = parsed.data;

  try {
    const [lines, vehicles] = await Promise.all([
      getLinesWithStops(),
      getVehiclePositions(),
    ]);

    // Uma parada pode ser atendida por mais de uma linha
    const servingLines = lines.filter((line) =>
      line.stops.some((stop) => stop.id === stopId)
    );

    if (servingLines.length === 0) {
      return NextResponse.json(
        { error: "Parada não encontrada." },
        { status: 404 }
      );
    }

    const stopName =
      servingLines[0].stops.find((stop) => stop.id === stopId)?.name ?? "Parada";

    const arrivals = servingLines
      .flatMap((line) => computeArrivals(line, stopId, vehicles))
      .sort((a, b) => a.etaSeconds - b.etaSeconds);

    return NextResponse.json({
      stopId,
      stopName,
      updatedAt: new Date().toISOString(),
      arrivals,
    });
  } catch (error) {
    console.error("Erro ao calcular previsões:", error);
    return NextResponse.json(
      { error: "Não foi possível calcular as previsões." },
      { status: 502 }
    );
  }
}