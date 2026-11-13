"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type Leaflet = typeof import("leaflet");
type NodeKind = "stop" | "waypoint";
type Mode = "idle" | "add-stop" | "add-waypoint";

type AdminNode = {
  id: number; // id do item dentro da linha
  kind: NodeKind;
  name: string;
  latitude: number;
  longitude: number;
  confirmed: boolean;
  sharedWith: string[]; // outras linhas que usam este mesmo ponto
};

type AdminLine = {
  id: number;
  code: string;
  name: string;
  color: string;
  nodes: AdminNode[];
};

// Atenção: o Leaflet usa [latitude, longitude]
const TOWN_CENTER: [number, number] = [-20.9886, -47.6578];
const GREEN = "#16a34a";
const AMBER = "#f59e0b";
const GRAY = "#64748b";

// Busca as linhas e os pontos no banco. Só devolve os dados: não mexe em
// estado, por isso pode ser usada dentro de um efeito sem problema.
async function fetchLines(): Promise<AdminLine[]> {
  const res = await fetch("/api/admin/lines", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar");
  const json: { lines: AdminLine[] } = await res.json();
  return json.lines;
}

export function LineEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const libRef = useRef<Leaflet | null>(null);
  const fittedRef = useRef<string | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [lines, setLines] = useState<AdminLine[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLine = lines.find((line) => line.code === activeCode) ?? lines[0];
  const nodes = activeLine?.nodes ?? [];
  const selectedIndex = nodes.findIndex((node) => node.id === selectedId);
  const selected = selectedIndex >= 0 ? nodes[selectedIndex] : undefined;

  // Recarrega do banco (usada depois de cada edição)
  const reload = useCallback(async () => {
    try {
      setLines(await fetchLines());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  // Primeira carga, ao abrir a página
  useEffect(() => {
    let active = true;

    fetchLines()
      .then((loaded) => {
        if (!active) return;
        setLines(loaded);
        setLoadFailed(false);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Envia uma edição ao servidor e recarrega o que está salvo
  const edit = useCallback(
    async (body: object): Promise<{ lineStopId?: number } | null> => {
      setBusy(true);
      try {
        const res = await fetch("/api/admin/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao salvar.");
        setError(null);
        await reload();
        return json;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
        await reload(); // volta a mostrar o que está salvo de verdade
        return null;
      } finally {
        setBusy(false);
      }
    },
    [reload]
  );

  // Efeito 1: cria o mapa UMA vez
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;

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
      L.control.layers({ Mapa: streets, "Satélite": satellite }).addTo(instance);

      libRef.current = L;
      mapRef.current = instance;
      setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      libRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Efeito 2: enquadra o mapa na linha, só na primeira vez que ela aparece
  useEffect(() => {
    const map = mapRef.current;
    const L = libRef.current;
    if (!mapReady || !map || !L || !activeLine || activeLine.nodes.length === 0) {
      return;
    }
    if (fittedRef.current === activeLine.code) return;
    fittedRef.current = activeLine.code;

    const points = activeLine.nodes.map(
      (node) => [node.latitude, node.longitude] as [number, number]
    );
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [mapReady, activeLine]);

  // Efeito 3: desenha a linha e os pontos (redesenha a cada mudança)
  useEffect(() => {
    const map = mapRef.current;
    const L = libRef.current;
    if (!mapReady || !map || !L || !activeLine) return;

    const group = L.layerGroup().addTo(map);
    const lineNodes = activeLine.nodes;
    const loop = lineNodes.length > 1 ? [...lineNodes, lineNodes[0]] : [];

    // Trechos entre pontos. Clicar num trecho cria uma curva ali.
    for (let i = 0; i < loop.length - 1; i++) {
      const from = loop[i];
      const to = loop[i + 1];

      L.polyline(
        [
          [from.latitude, from.longitude],
          [to.latitude, to.longitude],
        ],
        {
          color: activeLine.color,
          weight: 5,
          opacity: 0.7,
          interactive: mode === "idle",
        }
      )
        .bindTooltip("Clique para adicionar uma curva aqui", { sticky: true })
        .on("click", (e: LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          edit({
            action: "addNode",
            lineId: activeLine.id,
            kind: "waypoint",
            afterLineStopId: from.id,
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          }).then((result) => {
            if (result?.lineStopId) setSelectedId(result.lineStopId);
          });
        })
        .addTo(group);
    }

    // Pontos: paradas (círculo numerado) e curvas (losango cinza)
    let stopNumber = 0;
    for (const node of lineNodes) {
      const isStop = node.kind === "stop";
      if (isStop) stopNumber++;
      const isSelected = node.id === selectedId;
      const shadow = isSelected
        ? "0 0 0 4px rgba(15,23,42,.55)"
        : "0 1px 3px rgba(0,0,0,.5)";

      const el = document.createElement("div");
      if (isStop) {
        el.textContent = String(stopNumber);
        el.style.cssText = `width:22px;height:22px;border-radius:9999px;border:2px solid #fff;background:${
          node.confirmed ? GREEN : AMBER
        };color:#fff;font:700 11px/18px system-ui;text-align:center;box-shadow:${shadow}`;
      } else {
        el.style.cssText = `width:12px;height:12px;margin:2px;border:2px solid #fff;background:${GRAY};transform:rotate(45deg);box-shadow:${shadow}`;
      }

      const marker = L.marker([node.latitude, node.longitude], {
        draggable: true,
        icon: L.divIcon({
          html: el,
          className: "",
          iconSize: isStop ? [22, 22] : [16, 16],
          iconAnchor: isStop ? [11, 11] : [8, 8],
        }),
        zIndexOffset: isSelected ? 1000 : isStop ? 100 : 0,
      }).addTo(group);

      // Nome ao passar o mouse (textContent: seguro contra texto estranho)
      const tip = document.createElement("div");
      tip.textContent = isStop ? node.name : "Curva (só o admin vê)";
      marker.bindTooltip(tip, { direction: "top", offset: [0, -10] });

      marker.on("click", () => setSelectedId(node.id));
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        setSelectedId(node.id);
        edit({
          action: "updateNode",
          lineStopId: node.id,
          latitude: lat,
          longitude: lng,
          confirmed: true,
        });
      });
    }

    // Modo "adicionar": o próximo clique no mapa cria o ponto
    const onMapClick = (e: LeafletMouseEvent) => {
      if (mode === "idle") return;
      const kind = mode === "add-stop" ? "stop" : "waypoint";
      const after = lineNodes.some((node) => node.id === selectedId)
        ? selectedId
        : null;
      setMode("idle");
      edit({
        action: "addNode",
        lineId: activeLine.id,
        kind,
        afterLineStopId: after,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      }).then((result) => {
        if (result?.lineStopId) setSelectedId(result.lineStopId);
      });
    };

    map.on("click", onMapClick);
    map.getContainer().style.cursor = mode === "idle" ? "" : "crosshair";

    return () => {
      map.off("click", onMapClick);
      map.getContainer().style.cursor = "";
      group.remove();
    };
  }, [mapReady, activeLine, selectedId, mode, edit]);

  function switchLine(code: string) {
    setActiveCode(code);
    setSelectedId(null);
    setMode("idle");
  }

  function selectFromList(node: AdminNode) {
    setSelectedId(node.id);
    const map = mapRef.current;
    if (map) {
      map.setView([node.latitude, node.longitude], Math.max(map.getZoom(), 17));
    }
  }

  // Move o item da posição "from" para a posição "to" (começando em 0)
  function reorder(from: number, to: number) {
    if (!activeLine || from === to || to < 0 || to >= nodes.length) return;
    const ids = nodes.map((node) => node.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    edit({ action: "reorder", lineId: activeLine.id, orderedIds: ids });
  }

  async function remove(node: AdminNode) {
    const label = node.kind === "stop" ? `o ponto "${node.name}"` : "esta curva";
    const text =
      node.sharedWith.length > 0
        ? `Remover ${label} só desta linha? Ele continua em ${node.sharedWith.join(", ")}.`
        : `Excluir ${label}?`;
    if (!window.confirm(text)) return;

    await edit({ action: "deleteNode", lineStopId: node.id });
    setSelectedId(null);
  }

  const stopCount = nodes.filter((node) => node.kind === "stop").length;
  const curveCount = nodes.length - stopCount;

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-700">
        <div className="border-b border-slate-700 p-4">
          <h1 className="text-lg font-bold">Editor de linhas</h1>

          {loadFailed && (
            <p className="mt-2 text-sm text-red-400">
              Não foi possível carregar. Esta página só funciona com{" "}
              <code>npm run dev</code>.
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {lines.map((line) => (
              <button
                key={line.code}
                onClick={() => switchLine(line.code)}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  activeLine?.code === line.code ? "text-white" : "bg-slate-800 text-slate-300"
                }`}
                style={
                  activeLine?.code === line.code
                    ? { backgroundColor: line.color }
                    : undefined
                }
              >
                {line.code}
              </button>
            ))}
          </div>

          {activeLine && (
            <p className="mt-2 text-xs text-slate-400">
              {activeLine.name}: {stopCount} paradas e {curveCount} curvas
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setMode(mode === "add-stop" ? "idle" : "add-stop")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                mode === "add-stop" ? "bg-amber-600" : "bg-blue-600"
              }`}
            >
              + Parada
            </button>
            <button
              onClick={() =>
                setMode(mode === "add-waypoint" ? "idle" : "add-waypoint")
              }
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                mode === "add-waypoint" ? "bg-amber-600" : "bg-slate-600"
              }`}
            >
              + Curva
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            {mode === "idle"
              ? "Dica: para criar uma curva no meio de um trecho, clique direto na linha. Arraste qualquer ponto para mover."
              : "Clique no mapa para posicionar. O novo ponto entra depois do item selecionado (ou no fim, se não houver seleção)."}
          </p>

          <p className="mt-1 h-4 text-xs">
            {busy && <span className="text-slate-400">Salvando...</span>}
            {!busy && error && <span className="text-red-400">{error}</span>}
          </p>

          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: GREEN }} />
              Parada confirmada
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: AMBER }} />
              Parada não conferida
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rotate-45" style={{ backgroundColor: GRAY }} />
              Curva (só o admin vê)
            </li>
          </ul>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {nodes.map((node, index) => (
            <li
              key={node.id}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs ${
                node.id === selectedId ? "bg-slate-800" : ""
              }`}
            >
              <button
                onClick={() => selectFromList(node)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="w-6 shrink-0 text-right text-slate-500">
                  {index + 1}
                </span>
                <span
                  className={
                    node.kind === "stop"
                      ? "h-3 w-3 shrink-0 rounded-full"
                      : "h-2.5 w-2.5 shrink-0 rotate-45"
                  }
                  style={{
                    backgroundColor:
                      node.kind === "stop" ? (node.confirmed ? GREEN : AMBER) : GRAY,
                  }}
                />
                <span className="truncate">
                  {node.kind === "stop" ? node.name : "Curva"}
                </span>
              </button>
              <button
                disabled={busy || index === 0}
                onClick={() => reorder(index, index - 1)}
                title="Subir"
                className="rounded px-1.5 py-0.5 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                disabled={busy || index === nodes.length - 1}
                onClick={() => reorder(index, index + 1)}
                title="Descer"
                className="rounded px-1.5 py-0.5 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="space-y-2 border-t border-slate-700 p-4 text-sm">
            <p className="text-xs text-slate-400">
              {selected.kind === "stop" ? "Parada" : "Curva"} nº {selectedIndex + 1} ·{" "}
              {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
            </p>

            {selected.kind === "stop" && (
              <input
                key={`${selected.id}-${selected.name}`}
                defaultValue={selected.name}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== selected.name) {
                    edit({ action: "updateNode", lineStopId: selected.id, name: value });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-full rounded bg-slate-800 px-2 py-1.5 text-xs"
                aria-label="Nome da parada"
              />
            )}

            {selected.sharedWith.length > 0 && (
              <p className="text-xs text-amber-300">
                Este ponto também é usado em {selected.sharedWith.join(", ")}.
                Mover ou renomear muda nas duas linhas.
              </p>
            )}

            <label className="flex items-center gap-2 text-xs text-slate-300">
              Mover para a posição nº
              <input
                key={`${selected.id}-${selectedIndex}`}
                type="number"
                min={1}
                max={nodes.length}
                defaultValue={selectedIndex + 1}
                onBlur={(e) => reorder(selectedIndex, Number(e.target.value) - 1)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-16 rounded bg-slate-800 px-2 py-1"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {selected.kind === "stop" && !selected.confirmed && (
                <button
                  onClick={() =>
                    edit({ action: "updateNode", lineStopId: selected.id, confirmed: true })
                  }
                  className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold"
                >
                  Está certo ✓
                </button>
              )}
              <button
                onClick={() => remove(selected)}
                className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold"
              >
                Excluir
              </button>
              {selected.kind === "stop" && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selected.name}, Brodowski, SP`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs"
                >
                  Google Maps
                </a>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* text-slate-900: os controles do Leaflet herdam a cor do texto, e sem
          isso ficariam branco sobre branco nesta página escura */}
      <div className="relative isolate min-w-0 flex-1 text-slate-900">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}