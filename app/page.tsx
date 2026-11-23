import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { getLinesWithStops } from "@/lib/queries";
import { BusMap } from "./bus-map";
import { InstallPrompt } from "./install-prompt";
import { MyStopPanel } from "./my-stop-panel";

// Componente de SERVIDOR: busca no banco e entrega os dados ao mapa
async function MapSection() {
  const lines = await getLinesWithStops();
  // O painel só precisa de nome, cor e paradas (menos dados para o navegador)
  const panelLines = lines.map((line) => ({
    code: line.code,
    name: line.name,
    color: line.color,
    stops: line.stops.map((stop) => ({ id: stop.id, name: stop.name })),
  }));

  return (
    <>
      <BusMap lines={lines} />
      <MyStopPanel lines={panelLines} />
    </>
  );
}

export default function Home() {
  const simulated = (process.env.BUS_PROVIDER ?? "simulator") === "simulator";

  return (
    <AppShell>
      {simulated && (
        <p className="mx-auto max-w-7xl px-4 pt-3 text-xs text-muted sm:px-6">
          Modo demonstração: as posições dos ônibus são simuladas.
        </p>
      )}

      {/* Celular: mapa em cima, painel sobreposto por baixo.
          Computador: painel à esquerda, mapa à direita. */}
      <div className="mx-auto mt-3 max-w-7xl lg:grid lg:grid-cols-[400px_1fr] lg:gap-5 lg:px-6">
        <Suspense
          fallback={
            <>
              <div
                aria-hidden="true"
                className="h-[52dvh] min-h-72 animate-pulse bg-card-2 lg:h-[calc(100dvh-9rem)] lg:rounded-2xl"
              />
              <div
                aria-hidden="true"
                className="relative -mt-5 h-48 animate-pulse rounded-t-3xl bg-card lg:order-first lg:mt-0 lg:rounded-2xl"
              />
            </>
          }
        >
          <MapSection />
        </Suspense>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <InstallPrompt />
      </div>
    </AppShell>
  );
}