import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { buildRoute } from "@/lib/eta";
import { pointAlongPath } from "@/lib/geo";
import { getLinesWithStops } from "@/lib/queries";
import type { VehiclePosition } from "@/lib/schemas";

const SPEED_KMH = 25;

export async function getSimulatedPositions(): Promise<VehiclePosition[]> {
  const [fleet, allLines] = await Promise.all([
    db
      .select({ externalId: vehicles.externalId, lineId: vehicles.lineId })
      .from(vehicles)
      .where(eq(vehicles.active, true))
      .orderBy(asc(vehicles.id)),
    getLinesWithStops(),
  ]);

  const metersPerSecond = (SPEED_KMH * 1000) / 3600;
  const nowMs = Date.now();
  const positions: VehiclePosition[] = [];

  for (const line of allLines) {
    const buses = fleet.filter((bus) => bus.lineId === line.id);
    if (buses.length === 0) continue;

    // O mesmo caminho (com curvas) que a previsão de chegada usa
    const { loop, total } = buildRoute(line);
    if (loop.length < 3 || total === 0) continue;

    const traveled = (nowMs / 1000) * metersPerSecond;

    // Cada ônibus fica espaçado igualmente ao longo do circuito
    buses.forEach((bus, index) => {
      const offset = (total / buses.length) * index;
      const distance = (traveled + offset) % total;
      const { point, heading } = pointAlongPath(loop, distance);

      positions.push({
        vehicleId: bus.externalId,
        lineCode: line.code,
        latitude: point.latitude,
        longitude: point.longitude,
        speedKmh: SPEED_KMH,
        heading,
        timestamp: new Date(nowMs).toISOString(),
      });
    });
  }

  return positions;
}