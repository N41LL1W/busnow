import { asc, count, eq } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { lines, lineStops, vehicles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { CadastrosEditor } from "./cadastros-editor";

async function Gate() {
  await requireAdmin();

  const [lineRows, pointCounts, vehicleRows] = await Promise.all([
    db
      .select({
        id: lines.id,
        code: lines.code,
        name: lines.name,
        color: lines.color,
        active: lines.active,
      })
      .from(lines)
      .orderBy(asc(lines.id)),
    db
      .select({ lineId: lineStops.lineId, total: count() })
      .from(lineStops)
      .where(eq(lineStops.direction, 0))
      .groupBy(lineStops.lineId),
    db
      .select({
        id: vehicles.id,
        externalId: vehicles.externalId,
        label: vehicles.label,
        lineId: vehicles.lineId,
        active: vehicles.active,
      })
      .from(vehicles)
      .orderBy(asc(vehicles.id)),
  ]);

  const totals = new Map(pointCounts.map((row) => [row.lineId, row.total]));

  return (
    <CadastrosEditor
      lines={lineRows.map((line) => ({
        ...line,
        points: totals.get(line.id) ?? 0,
        vehicles: vehicleRows.filter((v) => v.lineId === line.id).length,
      }))}
      vehicles={vehicleRows}
    />
  );
}

export default function CadastrosPage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Linhas e veículos</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cadastre as linhas e os veículos. Os pontos do trajeto continuam em{" "}
          <strong>Linhas</strong> (mapa) e os horários em <strong>Horários</strong>.
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