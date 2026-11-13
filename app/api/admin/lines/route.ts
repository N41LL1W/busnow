import { asc, eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { lines, lineStops, stops } from "@/db/schema";

export async function GET() {
  // Painel só para desenvolvimento por enquanto (login vem na Fase 10)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Indisponível." }, { status: 404 });
  }
  await connection();

  const [allLines, rows] = await Promise.all([
    db.select().from(lines).orderBy(asc(lines.id)),
    db
      .select({
        lineStopId: lineStops.id,
        lineId: lineStops.lineId,
        stopId: stops.id,
        kind: stops.kind,
        name: stops.name,
        latitude: stops.latitude,
        longitude: stops.longitude,
        confirmed: stops.confirmed,
      })
      .from(lineStops)
      .innerJoin(stops, eq(lineStops.stopId, stops.id))
      .where(eq(lineStops.direction, 0))
      .orderBy(asc(lineStops.lineId), asc(lineStops.position), asc(lineStops.id)),
  ]);

  const codeByLineId = new Map(allLines.map((line) => [line.id, line.code] as const));

  // Quais linhas usam cada ponto (o terminal, por exemplo, é de todas)
  const usedBy = new Map<number, number[]>();
  for (const row of rows) {
    usedBy.set(row.stopId, [...(usedBy.get(row.stopId) ?? []), row.lineId]);
  }

  return NextResponse.json({
    lines: allLines.map((line) => ({
      id: line.id,
      code: line.code,
      name: line.name,
      color: line.color,
      nodes: rows
        .filter((row) => row.lineId === line.id)
        .map((row) => ({
          id: row.lineStopId,
          kind: row.kind,
          name: row.name,
          latitude: row.latitude,
          longitude: row.longitude,
          confirmed: row.confirmed,
          sharedWith: (usedBy.get(row.stopId) ?? [])
            .filter((lineId) => lineId !== line.id)
            .map((lineId) => codeByLineId.get(lineId) ?? "?"),
        })),
    })),
  });
}