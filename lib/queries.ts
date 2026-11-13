import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lines, lineStops, stops } from "@/db/schema";
import type { Point } from "@/lib/geo";

export type StopPoint = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  position: number;
  // posição desta parada dentro de "path" (que também tem as curvas)
  pathIndex?: number;
};

export type LineWithStops = {
  id: number;
  code: string;
  name: string;
  color: string;
  // só as paradas: é o que o passageiro vê no mapa
  stops: StopPoint[];
  // caminho completo, na ordem: paradas + curvas. As curvas só servem para
  // desenhar o caminho; nunca aparecem como ponto na tela pública.
  path?: Point[];
};

// Linhas ativas com seus pontos, na ordem (sentido ida)
export async function getLinesWithStops(): Promise<LineWithStops[]> {
  const rows = await db
    .select({
      lineId: lines.id,
      code: lines.code,
      name: lines.name,
      color: lines.color,
      stopId: stops.id,
      stopName: stops.name,
      kind: stops.kind,
      latitude: stops.latitude,
      longitude: stops.longitude,
      position: lineStops.position,
    })
    .from(lineStops)
    .innerJoin(lines, eq(lineStops.lineId, lines.id))
    .innerJoin(stops, eq(lineStops.stopId, stops.id))
    .where(and(eq(lines.active, true), eq(lineStops.direction, 0)))
    .orderBy(asc(lines.id), asc(lineStops.position), asc(lineStops.id));

  type Entry = LineWithStops & { path: Point[] };
  const byLine = new Map<number, Entry>();

  for (const row of rows) {
    let line = byLine.get(row.lineId);
    if (!line) {
      line = {
        id: row.lineId,
        code: row.code,
        name: row.name,
        color: row.color,
        stops: [],
        path: [],
      };
      byLine.set(row.lineId, line);
    }

    // Todo ponto (parada ou curva) entra no caminho
    const pathIndex = line.path.length;
    line.path.push({ latitude: row.latitude, longitude: row.longitude });

    // Só as paradas entram na lista pública
    if (row.kind === "stop") {
      line.stops.push({
        id: row.stopId,
        name: row.stopName,
        latitude: row.latitude,
        longitude: row.longitude,
        position: row.position,
        pathIndex,
      });
    }
  }

  return [...byLine.values()];
}