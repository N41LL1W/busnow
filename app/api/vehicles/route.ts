import { connection, NextResponse } from "next/server";
import { getVehiclePositions } from "@/lib/positions";

export async function GET() {
  // Avisa o Next que esta resposta depende do momento da requisição
  // (necessário com Cache Components, pois usamos o horário atual)
  await connection();

  try {
    const vehicles = await getVehiclePositions();
    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      vehicles,
    });
  } catch (error) {
    console.error("Erro ao obter posições:", error);
    return NextResponse.json(
      { error: "Não foi possível obter as posições dos veículos." },
      { status: 502 }
    );
  }
}