import { Suspense } from "react";
import { NoticeBanner } from "@/components/notice-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLinesWithStops } from "@/lib/queries";
import { BusMap } from "./bus-map";
import { InstallPrompt } from "./install-prompt";

// Componente de SERVIDOR: busca no banco e entrega os dados ao mapa
async function MapSection() {
  const lines = await getLinesWithStops();
  return <BusMap lines={lines} />;
}

export default function Home() {
  const simulated = (process.env.BUS_PROVIDER ?? "simulator") === "simulator";

  return (
    <main className="min-h-screen bg-slate-900 p-4 text-white sm:p-8">
      <SiteHeader />
      <NoticeBanner />

      {simulated && (
        <p className="mb-2 text-xs text-amber-300">
          Modo demonstração: as posições dos ônibus são simuladas.
        </p>
      )}

      <Suspense
        fallback={<div className="h-[70vh] animate-pulse rounded-lg bg-slate-800" />}
      >
        <MapSection />
      </Suspense>

      <InstallPrompt />
      <SiteFooter />
    </main>
  );
}