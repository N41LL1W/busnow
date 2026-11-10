import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lines, lineStops, stops, vehicles } from "@/db/schema";
import { pathLength, pointAlongPath } from "@/lib/geo";
import type { VehiclePosition } from "@/lib/schemas";

const SPEED_KMH = 25;

export async function getSimulatedPositions(): Promise<VehiclePosition[]> {
  // 1. Veículos ativos que têm linha
  const fleet = await db
    .select({
      externalId: vehicles.externalId,
      lineId: lines.id,
      lineCode: lines.code,
    })
    .from(vehicles)
    .innerJoin(lines, eq(vehicles.lineId, lines.id))
    .where(eq(vehicles.active, true))
    .orderBy(asc(vehicles.id));

  // 2. Agrupa os veículos por linha
  const byLine = new Map<number, typeof fleet>();
  for (const bus of fleet) {
    const group = byLine.get(bus.lineId) ?? [];
    group.push(bus);
    byLine.set(bus.lineId, group);
  }

  const positions: VehiclePosition[] = [];
  const metersPerSecond = (SPEED_KMH * 1000) / 3600;
  const nowMs = Date.now();

  for (const [lineId, group] of byLine) {
    // 3. Paradas da linha, na ordem (sentido ida)
    const routeStops = await db
      .select({ latitude: stops.latitude, longitude: stops.longitude })
      .from(lineStops)
      .innerJoin(stops, eq(lineStops.stopId, stops.id))
      .where(and(eq(lineStops.lineId, lineId), eq(lineStops.direction, 0)))
      .orderBy(asc(lineStops.position));

    if (routeStops.length < 2) continue;

    // 4. Circular: o trajeto fecha voltando à primeira parada
    const loop = [...routeStops, routeStops[0]];
    const total = pathLength(loop);
    const traveled = (nowMs / 1000) * metersPerSecond;

    // 5. Cada ônibus fica espaçado igualmente ao longo do circuito
    group.forEach((bus, index) => {
      const offset = (total / group.length) * index;
      const distance = (traveled + offset) % total;
      const { point, heading } = pointAlongPath(loop, distance);

      positions.push({
        vehicleId: bus.externalId,
        lineCode: bus.lineCode,
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