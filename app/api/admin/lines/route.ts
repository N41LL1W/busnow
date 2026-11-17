import { asc, eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { lines, lineStops, stops } from "@/db/schema";
import { requireAdminApi } from "@/lib/auth";
import { nodesHash } from "@/lib/routing";

export async function GET() {
  await connection();

  // Só administradores logados
  const denied = await requireAdminApi();
  if (denied) return denied;

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
    lines: allLines.map((line) => {
      const lineRows = rows.filter((row) => row.lineId === line.id);

      // O traçado está desatualizado se os pontos mudaram depois de gerá-lo
      const currentHash = nodesHash(
        lineRows.map((row) => ({
          id: row.lineStopId,
          latitude: row.latitude,
          longitude: row.longitude,
        }))
      );

      return {
        id: line.id,
        code: line.code,
        name: line.name,
        color: line.color,
        geometry: line.geometry,
        geometryStale: line.geometry !== null && line.geometryHash !== currentHash,
        nodes: lineRows.map((row) => ({
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
      };
    }),
  });
}