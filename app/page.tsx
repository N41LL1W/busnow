import { Suspense } from "react";
import { getLinesWithStops } from "@/lib/queries";
import { Branded } from "./brand";
import { BusMap } from "./bus-map";
import { InstallPrompt } from "./install-prompt";

// Componente de SERVIDOR: busca no banco e entrega os dados ao mapa
async function MapSection() {
  const lines = await getLinesWithStops();
  return <BusMap lines={lines} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <Branded>
        <main className="mx-auto max-w-5xl p-4 sm:p-8">
          <h1 className="text-2xl font-bold">Onde estão os ônibus agora</h1>
          <p className="mb-4 mt-1 text-sm text-slate-400">
            Posição dos circulares em tempo real (dados de simulação).
          </p>

          <Suspense
            fallback={
              <div className="h-[70vh] animate-pulse rounded-lg bg-slate-800" />
            }
          >
            <MapSection />
          </Suspense>

          <InstallPrompt />
        </main>
      </Branded>
    </Suspense>
  );
}