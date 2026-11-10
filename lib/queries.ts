import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lines, lineStops, stops } from "@/db/schema";

export type StopPoint = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  position: number;
};

export type LineWithStops = {
  id: number;
  code: string;
  name: string;
  color: string;
  stops: StopPoint[];
};

// Linhas ativas com suas paradas, na ordem (sentido ida)
export async function getLinesWithStops(): Promise<LineWithStops[]> {
  const rows = await db
    .select({
      lineId: lines.id,
      code: lines.code,
      name: lines.name,
      color: lines.color,
      stopId: stops.id,
      stopName: stops.name,
      latitude: stops.latitude,
      longitude: stops.longitude,
      position: lineStops.position,
    })
    .from(lineStops)
    .innerJoin(lines, eq(lineStops.lineId, lines.id))
    .innerJoin(stops, eq(lineStops.stopId, stops.id))
    .where(and(eq(lines.active, true), eq(lineStops.direction, 0)))
    .orderBy(asc(lines.id), asc(lineStops.position));

  // Agrupa as linhas: cada linha recebe sua lista de paradas
  const byLine = new Map<number, LineWithStops>();

  for (const row of rows) {
    let line = byLine.get(row.lineId);
    if (!line) {
      line = {
        id: row.lineId,
        code: row.code,
        name: row.name,
        color: row.color,
        stops: [],
      };
      byLine.set(row.lineId, line);
    }
    line.stops.push({
      id: row.stopId,
      name: row.stopName,
      latitude: row.latitude,
      longitude: row.longitude,
      position: row.position,
    });
  }

  return [...byLine.values()];
}