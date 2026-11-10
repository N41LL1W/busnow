import { z } from "zod";

// O formato OFICIAL de uma posição de veículo no BusNow.
// Qualquer fonte de dados (simulador, API da empresa) precisa entregar isto.
export const vehiclePositionSchema = z.object({
  vehicleId: z.string(), // identificador do veículo (externalId)
  lineCode: z.string(), // código da linha, ex.: "C1"
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0),
  heading: z.number().min(0).max(360), // direção em graus (0 = norte)
  timestamp: z.string(), // horário da leitura, em ISO 8601
});

export const vehiclePositionsSchema = z.array(vehiclePositionSchema);

// O tipo TypeScript nasce da própria regra: uma fonte única de verdade
export type VehiclePosition = z.infer<typeof vehiclePositionSchema>;