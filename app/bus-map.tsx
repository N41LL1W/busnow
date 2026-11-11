"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatEta, type Arrival } from "@/lib/eta";
import type { LineWithStops } from "@/lib/queries";
import { useVehicles } from "@/lib/use-vehicles";

type MapLibre = typeof import("maplibre-gl");

// Atenção: o MapLibre usa [longitude, latitude] (o contrário do que falamos)
const DEFAULT_CENTER: [number, number] = [-47.657, -20.988];

// Busca a previsão da parada e escreve o resultado dentro do balão
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
      const row = document.createElement("p");
      row.textContent = `${arrival.vehicleId}: ${formatEta(arrival.etaSeconds)} (${arrival.distanceMeters} m)`;
      target.append(row);
    }
  } catch {
    target.textContent = "Não foi possível obter a previsão.";
  }
}

export function BusMap({ lines }: { lines: LineWithStops[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  const { vehicles, updatedAt, failed } = useVehicles(5000);

  // Efeito 1: cria o mapa UMA vez, desenha trajeto e paradas
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    const markers = markersRef.current;

    async function init() {
      // Import dinâmico: o MapLibre só é carregado no navegador
      const lib = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      // NOVO: o worker embutido quebra com o Turbopack do Next, então
      // apontamos para o arquivo copiado em public/. Precisa vir ANTES
      // de criar o mapa.
      lib.setWorkerUrl("/maplibre-gl-csp-worker.js");

      const instance = new lib.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 19,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: DEFAULT_CENTER,
        zoom: 14,
      });
      map = instance;

      instance.addControl(new lib.NavigationControl(), "top-right");

      instance.on("load", () => {
        if (cancelled) return;

        // Trajeto: liga as paradas em ordem e fecha o circuito (circular)
        instance.addSource("routes", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: lines
              .filter((line) => line.stops.length >= 2)
              .map((line) => ({
                type: "Feature" as const,
                properties: { color: line.color },
                geometry: {
                  type: "LineString" as const,
                  coordinates: [...line.stops, line.stops[0]].map((s) => [
                    s.longitude,
                    s.latitude,
                  ]),
                },
              })),
          },
        });

        instance.addLayer({
          id: "routes",
          type: "line",
          source: "routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "color"],
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });

        // Paradas (com o id, para buscar a previsão)
        instance.addSource("stops", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: lines.flatMap((line) =>
              line.stops.map((s) => ({
                type: "Feature" as const,
                properties: { id: s.id, name: s.name },
                geometry: {
                  type: "Point" as const,
                  coordinates: [s.longitude, s.latitude],
                },
              }))
            ),
          },
        });

        instance.addLayer({
          id: "stops",
          type: "circle",
          source: "stops",
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#1e293b",
            "circle-stroke-width": 2,
          },
        });

        // Clicar numa parada: mostra o nome e busca a previsão de chegada
        instance.on("click", "stops", (e) => {
          const feature = e.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;

          const [lng, lat] = feature.geometry.coordinates;
          const stopId = Number(feature.properties?.id);
          const stopName = String(feature.properties?.name ?? "Parada");

          // Conteúdo montado com textContent (seguro contra texto malicioso)
          const content = document.createElement("div");
          const title = document.createElement("p");
          title.className = "font-semibold";
          title.textContent = stopName;
          const body = document.createElement("div");
          body.className = "mt-1 text-sm";
          body.textContent = "Buscando previsão...";
          content.append(title, body);

          new lib.Popup({ offset: 10 })
            .setLngLat([lng, lat])
            .setDOMContent(content)
            .addTo(instance);

          showArrivals(stopId, body);
        });
        instance.on("mouseenter", "stops", () => {
          instance.getCanvas().style.cursor = "pointer";
        });
        instance.on("mouseleave", "stops", () => {
          instance.getCanvas().style.cursor = "";
        });

        // Enquadra o mapa para mostrar todas as paradas
        const allStops = lines.flatMap((line) => line.stops);
        if (allStops.length > 0) {
          const bounds = new lib.LngLatBounds();
          allStops.forEach((s) => bounds.extend([s.longitude, s.latitude]));
          instance.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
        }

        libRef.current = lib;
        mapRef.current = instance;
        setMapReady(true);
      });
    }

    init();

    return () => {
      cancelled = true;
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
    const lib = libRef.current;
    if (!mapReady || !map || !lib) return;

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
        existing.setLngLat([v.longitude, v.latitude]);
        existing.getPopup()?.setText(label);
      } else {
        const el = document.createElement("div");
        el.className =
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-base shadow-lg";
        el.style.backgroundColor = colorByCode.get(v.lineCode) ?? "#2563eb";
        el.textContent = "🚌";

        const marker = new lib.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .setPopup(new lib.Popup({ offset: 20 }).setText(label))
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
    // text-slate-900: os balões (popups) do mapa herdam a cor do texto,
    // e sem isso ficariam branco sobre branco nesta página escura
    <div className="relative h-[70vh] w-full overflow-hidden rounded-lg text-slate-900">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute left-3 top-3 rounded-md bg-slate-900/85 px-3 py-2 text-xs text-white shadow">
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