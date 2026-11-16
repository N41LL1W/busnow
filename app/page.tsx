import Link from "next/link";
import { Suspense } from "react";
import { getLinesWithStops } from "@/lib/queries";
import { BusMap } from "./bus-map";
import { InstallPrompt } from "./install-prompt";

// Componente de SERVIDOR: busca no banco e entrega os dados ao mapa
async function MapSection() {
  const lines = await getLinesWithStops();
  return <BusMap lines={lines} />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 text-white sm:p-8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">BusNow Brodowski</h1>
        <Link
          href="/horarios"
          className="shrink-0 rounded bg-slate-800 px-3 py-2 text-sm"
        >
          Horários
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Posição dos circulares em tempo real (dados de simulação).
      </p>

      <Suspense
        fallback={<div className="h-[70vh] animate-pulse rounded-lg bg-slate-800" />}
      >
        <MapSection />
      </Suspense>

      <InstallPrompt />
    </main>
  );
}