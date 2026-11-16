import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTimetables } from "@/lib/timetable";
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
    <main className="min-h-screen bg-slate-900 p-4 text-white sm:p-8">
      <Link href="/" className="text-sm text-blue-400">
        ← Mapa em tempo real
      </Link>
      <h1 className="mb-4 mt-2 text-3xl font-bold">Horários</h1>

      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-800" />}
      >
        <TimetableSection />
      </Suspense>
    </main>
  );
}