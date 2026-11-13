"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { buildRoute, formatEta, type Arrival } from "@/lib/eta";
import type { LineWithStops } from "@/lib/queries";
import { useVehicles } from "@/lib/use-vehicles";

type Leaflet = typeof import("leaflet");

// Atenção: o Leaflet usa [latitude, longitude] (o MapLibre usava o contrário)
const DEFAULT_CENTER: [number, number] = [-20.988, -47.657];

// Busca a previsão da parada e escreve o resultado dentro do balão.
// (Usamos <div> e não <p>: o CSS do Leaflet coloca margens grandes em <p>.)
async function showArrivals(stopId: number, target: HTMLElement) {
  try {
    const res = await fetch(`/api/arrivals?stopId=${stopId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Falha na resposta");
    const data: { arrivals: Arrival[] } = await res.json();

    target.replaceChildren();

    if (data.arrivals.length === 0) {
      target.textContent = "Nenhum ônibus a caminho no momento.";
      return;
    }

    for (const arrival of data.arrivals.slice(0, 3)) {
      const row = document.createElement("div");
      row.textContent = `${arrival.vehicleId}: ${formatEta(arrival.etaSeconds)} (${arrival.distanceMeters} m)`;
      target.append(row);
    }
  } catch {
    target.textContent = "Não foi possível obter a previsão.";
  }
}

export function BusMap({ lines }: { lines: LineWithStops[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const libRef = useRef<Leaflet | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  const { vehicles, updatedAt, failed } = useVehicles(5000);

  // Efeito 1: cria o mapa UMA vez, desenha trajeto e paradas
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    let popupTimer: number | undefined;
    const markers = markersRef.current;

    async function init() {
      // Import dinâmico: o Leaflet só é carregado no navegador
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const instance = L.map(containerRef.current).setView(DEFAULT_CENTER, 14);
      map = instance;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(instance);

      // Trajeto: o caminho completo da linha (paradas + curvas), fechando o
      // circuito. É o mesmo caminho que o simulador e a previsão usam.
      for (const line of lines) {
        const { loop } = buildRoute(line);
        if (loop.length < 3) continue;
        const path = loop.map(
          (p) => [p.latitude, p.longitude] as [number, number]
        );
        L.polyline(path, { color: line.color, weight: 4, opacity: 0.8 }).addTo(
          instance
        );
      }

      // Paradas: clicar abre o balão com a previsão, atualizada a cada 5 s
      const drawnStops = new Set<number>();
      for (const line of lines) {
        for (const stop of line.stops) {
          if (drawnStops.has(stop.id)) continue;
          drawnStops.add(stop.id);

          // Conteúdo montado com textContent (seguro contra texto malicioso)
          const content = document.createElement("div");
          const title = document.createElement("div");
          title.className = "font-semibold";
          title.textContent = stop.name;
          const body = document.createElement("div");
          body.className = "mt-1 text-sm";
          content.append(title, body);

          L.circleMarker([stop.latitude, stop.longitude], {
            radius: 7,
            color: "#1e293b",
            weight: 2,
            fillColor: "#ffffff",
            fillOpacity: 1,
          })
            .addTo(instance)
            .bindPopup(content)
            .on("popupopen", () => {
              body.textContent = "Buscando previsão...";
              showArrivals(stop.id, body);
              window.clearInterval(popupTimer);
              popupTimer = window.setInterval(
                () => showArrivals(stop.id, body),
                5000
              );
            })
            .on("popupclose", () => {
              window.clearInterval(popupTimer);
            });
        }
      }

      // Enquadra o mapa para mostrar todas as paradas
      const points = lines
        .flatMap((line) => line.stops)
        .map((s) => [s.latitude, s.longitude] as [number, number]);
      if (points.length > 0) {
        instance.fitBounds(L.latLngBounds(points), {
          padding: [60, 60],
          maxZoom: 16,
        });
      }

      libRef.current = L;
      mapRef.current = instance;
      setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      window.clearInterval(popupTimer);
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map?.remove();
      mapRef.current = null;
      libRef.current = null;
      setMapReady(false);
    };
  }, [lines]);

  // Efeito 2: a cada nova posição, move (ou cria/remove) os ônibus no mapa
  useEffect(() => {
    const map = mapRef.current;
    const L = libRef.current;
    if (!mapReady || !map || !L) return;

    const colorByCode = new Map(
      lines.map((line) => [line.code, line.color] as const)
    );
    const markers = markersRef.current;
    const seen = new Set<string>();

    for (const v of vehicles) {
      seen.add(v.vehicleId);
      const label = `${v.vehicleId} (${v.lineCode}) · ${v.speedKmh} km/h`;
      const existing = markers.get(v.vehicleId);

      if (existing) {
        existing.setLatLng([v.latitude, v.longitude]);
        const popupContent = existing.getPopup()?.getContent();
        if (popupContent instanceof HTMLElement) {
          popupContent.textContent = label;
        }
      } else {
        const el = document.createElement("div");
        el.className =
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-base shadow-lg";
        el.style.backgroundColor = colorByCode.get(v.lineCode) ?? "#2563eb";
        el.textContent = "🚌";

        const popupContent = document.createElement("div");
        popupContent.textContent = label;

        const marker = L.marker([v.latitude, v.longitude], {
          icon: L.divIcon({
            html: el,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        })
          .bindPopup(popupContent, { offset: [0, -12] })
          .addTo(map);

        markers.set(v.vehicleId, marker);
      }
    }

    // Remove marcadores de veículos que saíram da lista
    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [vehicles, mapReady, lines]);

  return (
    // isolate: mantém as camadas internas do Leaflet (que usam z-index alto)
    // dentro deste bloco, sem passar por cima do resto da página
    <div className="relative isolate h-[70vh] w-full overflow-hidden rounded-lg text-slate-900">
      <div ref={containerRef} className="h-full w-full" />

      {/* Selo de status no canto superior DIREITO, pois o botão de zoom do
          Leaflet fica no esquerdo. z-[1000] para ficar acima do mapa. */}
      <div className="absolute right-3 top-3 z-1000 rounded-md bg-slate-900/85 px-3 py-2 text-xs text-white shadow">
        <p className="font-semibold">{vehicles.length} veículo(s) em operação</p>
        {updatedAt && (
          <p className="text-slate-300">
            Atualizado às {new Date(updatedAt).toLocaleTimeString("pt-BR")}
          </p>
        )}
        {failed && (
          <p className="text-amber-400">
            Conexão instável. Mostrando a última posição conhecida.
          </p>
        )}
      </div>
    </div>
  );
}