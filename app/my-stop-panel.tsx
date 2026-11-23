"use client";

import { useEffect, useState } from "react";
import { formatEta, type Arrival } from "@/lib/eta";
import { setMyStop, useMyStop } from "@/lib/my-stop";

export type PanelLine = {
  code: string;
  name: string;
  color: string;
  stops: { id: number; name: string }[];
};

type Result = { stopId: number; arrivals: Arrival[] } | "error";

export function MyStopPanel({ lines }: { lines: PanelLine[] }) {
  const stopId = useMyStop();
  const [result, setResult] = useState<Result | null>(null);

  // Busca a previsão do ponto salvo, de 5 em 5 segundos
  useEffect(() => {
    if (stopId === null) return;
    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/arrivals?stopId=${stopId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Falha na resposta");
        const data: { arrivals: Arrival[] } = await res.json();
        if (active) setResult({ stopId: stopId!, arrivals: data.arrivals });
      } catch {
        if (active) setResult("error");
      }
    }

    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [stopId]);

  const lineByCode = new Map(lines.map((l) => [l.code, l] as const));
  const stopName = lines
    .flatMap((l) => l.stops)
    .find((s) => s.id === stopId)?.name;

  // Só mostra o resultado se for do ponto que está selecionado agora
  const current =
    result !== null && result !== "error" && result.stopId === stopId
      ? result
      : null;
  const failed = result === "error";
  const [first, ...others] = current?.arrivals ?? [];

  return (
    <section
      aria-labelledby="my-stop-title"
      className="relative z-10 -mt-5 rounded-t-3xl border-t border-line bg-card p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.12)] lg:sticky lg:top-20 lg:order-first lg:mt-0 lg:self-start lg:rounded-2xl lg:border lg:shadow-sm"
    >
      {/* "alça" do painel, só no celular */}
      <div
        aria-hidden="true"
        className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-line lg:hidden"
      />

      <h2 id="my-stop-title" className="text-lg font-bold">
        Meu ponto
      </h2>

      <label className="mt-3 block">
        <span className="sr-only">Escolha o seu ponto</span>
        <select
          value={stopId ?? ""}
          onChange={(event) =>
            setMyStop(event.target.value ? Number(event.target.value) : null)
          }
          className="min-h-12 w-full rounded-xl border border-line bg-card-2 px-3 text-base text-ink"
        >
          <option value="">Escolha onde você espera o ônibus…</option>
          {lines.map((line) => (
            <optgroup key={line.code} label={`${line.code} · ${line.name}`}>
              {line.stops.map((stop) => (
                <option key={`${line.code}-${stop.id}`} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {stopId === null && (
        <p className="mt-3 text-sm text-muted">
          Escolha um ponto (ou toque nele no mapa). Ele fica salvo neste
          celular: da próxima vez, a previsão já aparece ao abrir.
        </p>
      )}

      {stopId !== null && !current && !failed && (
        <div className="mt-4 space-y-2" aria-hidden="true">
          <div className="h-24 animate-pulse rounded-2xl bg-card-2" />
          <div className="h-12 animate-pulse rounded-xl bg-card-2" />
        </div>
      )}

      {stopId !== null && failed && (
        <p role="alert" className="mt-4 text-sm text-amber-600">
          Não foi possível obter a previsão agora. Tentando de novo…
        </p>
      )}

      {current && !first && (
        <p className="mt-4 rounded-xl bg-card-2 p-4 text-sm text-muted">
          Nenhum ônibus a caminho de {stopName ?? "este ponto"} no momento.
        </p>
      )}

      <div aria-live="polite">
        {first && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card-2">
            <div
              className="h-1.5"
              style={{ backgroundColor: lineByCode.get(first.lineCode)?.color }}
            />
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Próximo ônibus
                </p>
                <p className="mt-1 truncate font-semibold">
                  {first.lineCode} · {lineByCode.get(first.lineCode)?.name}
                </p>
                <p className="text-xs text-muted">
                  {first.distanceMeters} m de distância · {first.vehicleId}
                </p>
              </div>
              <p className="shrink-0 text-4xl font-extrabold leading-none tabular-nums text-brand-ink">
                {formatEta(first.etaSeconds)}
              </p>
            </div>
          </div>
        )}

        {others.length > 0 && (
          <ul className="mt-2 space-y-2">
            {others.slice(0, 3).map((arrival) => {
              const line = lineByCode.get(arrival.lineCode);
              return (
                <li
                  key={`${arrival.lineCode}-${arrival.vehicleId}`}
                  className="flex items-center gap-3 rounded-xl border border-line px-3 py-3"
                >
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: line?.color ?? "#475569" }}
                  >
                    {arrival.lineCode}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {arrival.distanceMeters} m · {arrival.vehicleId}
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatEta(arrival.etaSeconds)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {stopId !== null && (
        <button
          type="button"
          onClick={() => setMyStop(null)}
          className="mt-4 min-h-11 text-sm text-muted underline"
        >
          Esquecer este ponto
        </button>
      )}
    </section>
  );
}