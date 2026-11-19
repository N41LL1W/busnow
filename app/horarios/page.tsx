import type { Metadata } from "next";
import { Suspense } from "react";
import { NoticeBanner } from "@/components/notice-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getTimetables } from "@/lib/timetable";
import { Timetable } from "./timetable";

export const metadata: Metadata = {
  title: "Horários",
  description: "Horários dos circulares, ponto a ponto.",
};

// Componente de SERVIDOR: busca no banco e entrega os dados à tela
async function TimetableSection() {
  const lines = await getTimetables();
  return <Timetable lines={lines} />;
}

export default function HorariosPage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 text-white sm:p-8">
      <SiteHeader />
      <NoticeBanner />

      <h1 className="mb-4 text-2xl font-bold">Horários</h1>

      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-800" />}
      >
        <TimetableSection />
      </Suspense>

      <SiteFooter />
    </main>
  );
}