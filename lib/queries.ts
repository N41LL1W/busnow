import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lines, lineStops, schedules, stops } from "@/db/schema";
import type { Point } from "@/lib/geo";
import { timeToMinutes, type DayType } from "@/lib/time";

export type StopPoint = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  position: number;
  // posição desta parada dentro de "path" (que também tem as curvas)
  pathIndex?: number;
  // minutos depois da saída do terminal em que o ônibus passa aqui (do PDF)
  offsetMinutes?: number;
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
  // traçado pelas ruas gerado no painel, como [latitude, longitude]
  // (null ou ausente = ainda não gerado)
  geometry?: [number, number][] | null;
  // minutos da volta completa até o terminal (null/ausente = não informado)
  tripMinutes?: number | null;
};

// Linhas ativas com seus pontos, na ordem (sentido ida)
export async function getLinesWithStops(): Promise<LineWithStops[]> {
  const rows = await db
    .select({
      lineId: lines.id,
      code: lines.code,
      name: lines.name,
      color: lines.color,
      geometry: lines.geometry,
      tripMinutes: lines.tripMinutes,
      stopId: stops.id,
      stopName: stops.name,
      kind: stops.kind,
      latitude: stops.latitude,
      longitude: stops.longitude,
      position: lineStops.position,
      offsetMinutes: lineStops.offsetMinutes,
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
        geometry: row.geometry,
        tripMinutes: row.tripMinutes,
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
        offsetMinutes: row.offsetMinutes,
      });
    }
  }

  return [...byLine.values()];
}

// Horários de saída do terminal, por linha e por tipo de dia,
// em minutos desde a meia-noite (06:30 = 390)
export type Departures = Record<DayType, number[]>;

export async function getDepartures(): Promise<Map<number, Departures>> {
  const rows = await db
    .select({
      lineId: schedules.lineId,
      dayType: schedules.dayType,
      departureTime: schedules.departureTime,
    })
    .from(schedules)
    .where(eq(schedules.direction, 0))
    .orderBy(asc(schedules.departureTime));

  const byLine = new Map<number, Departures>();

  for (const row of rows) {
    let entry = byLine.get(row.lineId);
    if (!entry) {
      entry = { weekday: [], saturday: [], sunday: [] };
      byLine.set(row.lineId, entry);
    }
    entry[row.dayType].push(timeToMinutes(row.departureTime));
  }

  return byLine;
}