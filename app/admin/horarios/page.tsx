import { and, asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { lines, lineStops, schedules, stops } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { ScheduleEditor, type EditorLine } from "./schedule-editor";

async function Gate() {
  await requireAdmin();

  const [lineRows, stopRows, scheduleRows] = await Promise.all([
    db
      .select({
        id: lines.id,
        code: lines.code,
        name: lines.name,
        color: lines.color,
        tripMinutes: lines.tripMinutes,
      })
      .from(lines)
      .orderBy(asc(lines.id)),
    db
      .select({
        lineId: lineStops.lineId,
        lineStopId: lineStops.id,
        name: stops.name,
        minute: lineStops.offsetMinutes,
      })
      .from(lineStops)
      .innerJoin(stops, eq(lineStops.stopId, stops.id))
      .where(and(eq(lineStops.direction, 0), eq(stops.kind, "stop")))
      .orderBy(asc(lineStops.lineId), asc(lineStops.position), asc(lineStops.id)),
    db
      .select({
        lineId: schedules.lineId,
        dayType: schedules.dayType,
        departureTime: schedules.departureTime,
      })
      .from(schedules)
      .where(eq(schedules.direction, 0))
      .orderBy(asc(schedules.departureTime)),
  ]);

  const editorLines: EditorLine[] = lineRows.map((line) => {
    const departures: EditorLine["departures"] = {
      weekday: [],
      saturday: [],
      sunday: [],
    };
    for (const row of scheduleRows) {
      // o banco devolve "06:30:00"; mostramos "06:30"
      if (row.lineId === line.id) {
        departures[row.dayType].push(row.departureTime.slice(0, 5));
      }
    }

    return {
      ...line,
      departures,
      stops: stopRows
        .filter((row) => row.lineId === line.id)
        .map(({ lineStopId, name, minute }) => ({ lineStopId, name, minute })),
    };
  });

  return <ScheduleEditor lines={editorLines} />;
}

export default function SchedulesPage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Horários</h1>
        <p className="mt-1 text-sm text-slate-400">
          Saídas do terminal, minutos de cada parada e duração da volta. As
          mudanças aparecem no app na hora.
        </p>

        <Suspense
          fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-slate-800" />}
        >
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}