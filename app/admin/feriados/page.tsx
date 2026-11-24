import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-guard";
import { getHolidaysForAdmin } from "@/lib/holidays";
import { getSaoPauloDateKey } from "@/lib/time";
import { HolidayManager } from "./holiday-manager";

async function Gate() {
  await requireAdmin();
  const rows = await getHolidaysForAdmin();

  // Anos oferecidos para o cadastro dos feriados nacionais: este e o próximo
  const thisYear = Number(getSaoPauloDateKey().slice(0, 4));
  const years = [thisYear, thisYear + 1];

  return <HolidayManager rows={rows} years={years} />;
}

export default function HolidaysPage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Feriados</h1>
        <p className="mt-1 text-sm text-slate-400">
          Nos feriados valem os horários de domingo (ou de sábado, se você
          escolher). O app e a previsão passam a usar essa tabela no dia.
        </p>
        <Suspense
          fallback={<div className="mt-6 h-72 animate-pulse rounded-lg bg-slate-800" />}
        >
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}