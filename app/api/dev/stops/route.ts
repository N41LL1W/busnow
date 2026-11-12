import { connection, NextResponse } from "next/server";
import { z } from "zod";
import {
  editorLines,
  resolveStops,
  saveManualPosition,
} from "@/db/data/positions";

// Ferramenta só para desenvolvimento: ela grava arquivos do projeto,
// então em produção simplesmente não existe.
function notAvailable() {
  return NextResponse.json({ error: "Indisponível." }, { status: 404 });
}

// Só aceita posições dentro da região de Brodowski (barra erro de arrasto)
const bodySchema = z.object({
  key: z.string().min(1),
  latitude: z.number().min(-21.09).max(-20.89),
  longitude: z.number().min(-47.76).max(-47.56),
});

export async function GET() {
  if (process.env.NODE_ENV === "production") return notAvailable();
  await connection();

  return NextResponse.json({
    stops: resolveStops(),
    lines: editorLines(),
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return notAvailable();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Posição inválida (precisa ficar na região de Brodowski)." },
      { status: 400 }
    );
  }

  const { key, latitude, longitude } = parsed.data;

  // A chave precisa ser de um ponto que existe nas linhas
  if (!resolveStops().some((stop) => stop.key === key)) {
    return NextResponse.json({ error: "Ponto desconhecido." }, { status: 404 });
  }

  saveManualPosition(key, latitude, longitude);
  return NextResponse.json({ saved: key });
}