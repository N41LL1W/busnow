import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { getTimetables } from "@/lib/timetable";
import { Timetable } from "./timetable";
import { getHolidays } from "@/lib/holidays";

export const metadata: Metadata = {
  title: "Horários",
  description: "Horários dos circulares, ponto a ponto.",
};

// Componente de SERVIDOR: busca no banco e entrega os dados à tela
async function TimetableSection() {
  const [lines, holidays] = await Promise.all([getTimetables(), getHolidays()]);
  return <Timetable lines={lines} holidays={holidays} />;
}

export default function HorariosPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">Horários</h1>
        <p className="mt-1 text-sm text-muted">
          Escolha a linha, o dia e o ponto onde você espera.
        </p>

        <div className="mt-5">
          <Suspense
            fallback={
              <div className="space-y-3" aria-hidden="true">
                <div className="h-12 animate-pulse rounded-xl bg-card-2" />
                <div className="h-12 animate-pulse rounded-xl bg-card-2" />
                <div className="h-64 animate-pulse rounded-2xl bg-card-2" />
              </div>
            }
          >
            <TimetableSection />
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}