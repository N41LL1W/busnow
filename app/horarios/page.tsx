import type { Metadata } from "next";
import { Suspense } from "react";
import { getTimetables } from "@/lib/timetable";
import { Branded } from "../brand";
import { Timetable } from "./timetable";

export const metadata: Metadata = {
  title: "Horários - BusNow Brodowski",
  description: "Horários dos circulares de Brodowski, ponto a ponto.",
};

// Componente de SERVIDOR: busca no banco e entrega os dados à tela
async function TimetableSection() {
  const lines = await getTimetables();
  return <Timetable lines={lines} />;
}

export default function HorariosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <Branded>
        <main className="mx-auto max-w-5xl p-4 sm:p-8">
          <h1 className="mb-4 text-2xl font-bold">Horários</h1>

          <Suspense
            fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-800" />}
          >
            <TimetableSection />
          </Suspense>
        </main>
      </Branded>
    </Suspense>
  );
}