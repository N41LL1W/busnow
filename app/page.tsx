import { Suspense } from "react";
import { getLinesWithStops } from "@/lib/queries";
import { BusMap } from "./bus-map";

// Componente de SERVIDOR: busca no banco e entrega os dados ao mapa
async function MapSection() {
  const lines = await getLinesWithStops();
  return <BusMap lines={lines} />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 text-white sm:p-8">
      <h1 className="mb-1 text-3xl font-bold">BusNow Brodowski</h1>
      <p className="mb-4 text-sm text-slate-400">
        Posição dos circulares em tempo real (dados de simulação).
      </p>

      <Suspense
        fallback={<div className="h-[70vh] animate-pulse rounded-lg bg-slate-800" />}
      >
        <MapSection />
      </Suspense>
    </main>
  );
}