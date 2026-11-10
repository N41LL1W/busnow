import { vehiclePositionsSchema, type VehiclePosition } from "@/lib/schemas";
import { getSimulatedPositions } from "@/lib/providers/simulator";

// Único ponto do sistema que sabe de onde vêm as posições.
// Quando a API da empresa chegar, criamos lib/providers/empresa.ts
// e adicionamos mais um "case" aqui.
export async function getVehiclePositions(): Promise<VehiclePosition[]> {
  const source = process.env.BUS_PROVIDER ?? "simulator";

  let raw: unknown;
  switch (source) {
    case "simulator":
      raw = await getSimulatedPositions();
      break;
    default:
      throw new Error(`Provedor de posições desconhecido: ${source}`);
  }

  // Valida SEMPRE, venha de onde vier: dado ruim é barrado aqui
  return vehiclePositionsSchema.parse(raw);
}