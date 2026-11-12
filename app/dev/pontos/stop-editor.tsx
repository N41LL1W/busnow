"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  EditorLine,
  ResolvedStop,
  StopSource,
} from "@/db/data/positions";

type Leaflet = typeof import("leaflet");
type ApiData = { stops: ResolvedStop[]; lines: EditorLine[] };
type SaveState = "idle" | "saving" | "saved" | "error";
type LatLng = [number, number];

// Atenção: o Leaflet usa [latitude, longitude]
const TOWN_CENTER: LatLng = [-20.9886, -47.6578];

const COLORS: Record<StopSource, string> = {
  manual: "#16a34a",
  endereco: "#2563eb",
  rua: "#f59e0b",
  nenhum: "#dc2626",
};

const LABELS: Record<StopSource, string> = {
  manual: "Confirmado",
  endereco: "Endereço exato (não conferido)",
  rua: "Só a rua (aproximado)",
  nenhum: "Sem posição",
};

// Posição inicial de cada ponto na tela. Pontos que caem no mesmo lugar são
// espalhados em espiral, para todos ficarem visíveis. Quem não tem posição
// começa no centro da cidade. (Isso é só visual: nada é salvo até você
// arrastar ou confirmar.)
function initialPositions(stops: ResolvedStop[]): Record<string, LatLng> {
  const seen = new Map<string, number>();
  const result: Record<string, LatLng> = {};

  for (const stop of stops) {
    const base: LatLng =
      stop.latitude !== null && stop.longitude !== null
        ? [stop.latitude, stop.longitude]
        : TOWN_CENTER;

    const id = `${base[0].toFixed(5)},${base[1].toFixed(5)}`;
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);

    if (n === 0) {
      result[stop.key] = base;
      continue;
    }

    const angle = n * 2.4; // cerca de 137 graus entre um e outro
    const radius = 0.0002 * Math.sqrt(n); // uns 22 m a mais a cada volta
    result[stop.key] = [
      base[0] + Math.sin(angle) * radius,
      base[1] + Math.cos(angle) * radius,
    ];
  }

  return result;
}

export function StopEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const libRef = useRef<Leaflet | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const routesRef = useRef<Map<string, Polyline>>(new Map());

  const [mapReady, setMapReady] = useState(false);
  const [data, setData] = useState<ApiData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [positions, setPositions] = useState<Record<string, LatLng>>({});
  const [statuses, setStatuses] = useState<Record<string, StopSource>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Grava a posição no arquivo (cada arrasto e cada confirmação)
  const persist = useCallback(
    async (key: string, latitude: number, longitude: number) => {
      setSaveState("saving");
      try {
        const res = await fetch("/api/dev/stops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, latitude, longitude }),
        });
        if (!res.ok) throw new Error("Falha ao salvar");
        setStatuses((prev) => ({ ...prev, [key]: "manual" }));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    []
  );

  // 1. Carrega os pontos e as linhas
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/dev/stops", { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao carregar");
        const json: ApiData = await res.json();
        if (!active) return;

        setData(json);
        setPositions(initialPositions(json.stops));
        setStatuses(
          Object.fromEntries(json.stops.map((s) => [s.key, s.source] as const))
        );
      } catch {
        if (active) setLoadFailed(true);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  // 2. Cria o mapa UMA vez
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    const markers = markersRef.current;
    const routes = routesRef.current;

    async function init() {
      // Import dinâmico: o Leaflet só é carregado no navegador
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const instance = L.map(containerRef.current).setView(TOWN_CENTER, 15);
      map = instance;

      const streets = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }
      );
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Imagens &copy; Esri" }
      );

      streets.addTo(instance);
      L.control.layers({ Mapa: streets, Satélite: satellite }).addTo(instance);

      libRef.current = L;
      mapRef.current = instance;
      setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      markers.clear();
      routes.clear();
      map?.remove();
      mapRef.current = null;
      libRef.current = null;
      setMapReady(false);
    };
  }, []);

  // 3. Cria um marcador arrastável para cada ponto
  useEffect(() => {
    const map = mapRef.current;
    const L = libRef.current;
    if (!mapReady || !map || !L || !data) return;

    const markers = markersRef.current;
    const start = initialPositions(data.stops);

    for (const stop of data.stops) {
      const marker = L.marker(start[stop.key], {
        draggable: true,
        icon: L.divIcon({
          html: '<div style="width:18px;height:18px;border-radius:9999px;border:2px solid #fff"></div>',
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);

      // Nome ao passar o mouse (textContent: seguro contra texto estranho)
      const tip = document.createElement("div");
      tip.textContent = stop.name;
      marker.bindTooltip(tip, { direction: "top", offset: [0, -10] });

      marker.on("click", () => setSelectedKey(stop.key));
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        setPositions((prev) => ({ ...prev, [stop.key]: [lat, lng] }));
        setSelectedKey(stop.key);
        persist(stop.key, lat, lng);
      });

      markers.set(stop.key, marker);
    }

    map.fitBounds(L.latLngBounds(Object.values(start)), { padding: [40, 40] });

    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
    };
  }, [mapReady, data, persist]);

  // 4. Pinta cada marcador conforme a situação e a seleção
  useEffect(() => {
    markersRef.current.forEach((marker, key) => {
      const dot = marker.getElement()?.firstElementChild as
        | HTMLElement
        | null
        | undefined;
      if (!dot) return;

      const selected = key === selectedKey;
      dot.style.backgroundColor = COLORS[statuses[key] ?? "nenhum"];
      dot.style.boxShadow = selected
        ? "0 0 0 4px rgba(15,23,42,0.55)"
        : "0 1px 3px rgba(0,0,0,0.5)";
      dot.style.transform = selected ? "scale(1.4)" : "scale(1)";
      marker.setZIndexOffset(selected ? 1000 : 0);
    });
  }, [statuses, selectedKey, data, mapReady]);

  // 5. Linhas tracejadas ligando os pontos na ordem (acompanham o arrasto)
  useEffect(() => {
    const map = mapRef.current;
    const L = libRef.current;
    if (!mapReady || !map || !L || !data) return;

    const routes = routesRef.current;

    for (const line of data.lines) {
      const keys = [...line.stopKeys, line.stopKeys[0]]; // circuito fechado
      const points = keys
        .map((key) => positions[key])
        .filter((point): point is LatLng => Boolean(point));

      const existing = routes.get(line.code);
      if (existing) {
        existing.setLatLngs(points);
      } else {
        routes.set(
          line.code,
          L.polyline(points, {
            color: line.color,
            weight: 3,
            opacity: 0.7,
            dashArray: "6 6",
            interactive: false,
          }).addTo(map)
        );
      }
    }
  }, [mapReady, data, positions]);

  function selectFromList(key: string) {
    setSelectedKey(key);
    const map = mapRef.current;
    const position = positions[key];
    if (map && position) map.setView(position, Math.max(map.getZoom(), 17));
  }

  const selected = data?.stops.find((stop) => stop.key === selectedKey);
  const selectedPosition = selectedKey ? positions[selectedKey] : undefined;
  const selectedStatus = selected ? (statuses[selected.key] ?? "nenhum") : null;

  const visibleStops = (data?.stops ?? []).filter(
    (stop) => !onlyPending || statuses[stop.key] !== "manual"
  );
  const confirmed = Object.values(statuses).filter((s) => s === "manual").length;

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-700">
        <div className="border-b border-slate-700 p-4">
          <h1 className="text-lg font-bold">Posição dos pontos</h1>
          <p className="mt-1 text-xs text-slate-400">
            Arraste cada marcador até o lugar certo. Salva sozinho a cada
            movimento.
          </p>

          {loadFailed && (
            <p className="mt-2 text-sm text-red-400">
              Não foi possível carregar. Esta página só funciona com{" "}
              <code>npm run dev</code>.
            </p>
          )}

          {data && (
            <p className="mt-2 text-sm">
              Confirmados: <strong>{confirmed}</strong> de {data.stops.length}
            </p>
          )}

          <p className="mt-1 h-4 text-xs">
            {saveState === "saving" && (
              <span className="text-slate-400">Salvando...</span>
            )}
            {saveState === "saved" && (
              <span className="text-green-400">Salvo ✓</span>
            )}
            {saveState === "error" && (
              <span className="text-red-400">
                Não foi possível salvar. O servidor está rodando?
              </span>
            )}
          </p>

          <ul className="mt-3 space-y-1 text-xs text-slate-300">
            {(Object.keys(COLORS) as StopSource[]).map((source) => (
              <li key={source} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[source] }}
                />
                {LABELS[source]}
              </li>
            ))}
          </ul>

          <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            Mostrar só os pendentes
          </label>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {visibleStops.map((stop) => (
            <li key={stop.key}>
              <button
                onClick={() => selectFromList(stop.key)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-slate-800 ${
                  selectedKey === stop.key ? "bg-slate-800" : ""
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[statuses[stop.key] ?? "nenhum"] }}
                />
                <span className="truncate">{stop.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {selected && selectedStatus && (
          <div className="border-t border-slate-700 p-4 text-sm">
            <p className="font-semibold">{selected.name}</p>
            <p className="text-xs text-slate-400">
              Linhas: {selected.lineCodes.join(", ")}
            </p>
            <p className="mt-1 text-xs">{LABELS[selectedStatus]}</p>
            {selectedPosition && (
              <p className="text-xs text-slate-400">
                {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                disabled={selectedStatus === "nenhum" || !selectedPosition}
                title={
                  selectedStatus === "nenhum"
                    ? "Arraste o marcador primeiro"
                    : "Confirma a posição atual"
                }
                onClick={() =>
                  selectedPosition &&
                  persist(selected.key, selectedPosition[0], selectedPosition[1])
                }
                className="rounded bg-green-600 px-3 py-2 text-xs font-semibold disabled:opacity-40"
              >
                Está certo ✓
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${selected.street} ${selected.number ?? ""}, Brodowski, SP`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-slate-700 px-3 py-2 text-xs"
              >
                Google Maps
              </a>
            </div>
          </div>
        )}
      </aside>

      {/* text-slate-900: os controles do Leaflet herdam a cor do texto, e sem
          isso ficariam branco sobre branco nesta página escura */}
      <div className="relative min-w-0 flex-1 text-slate-900">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}