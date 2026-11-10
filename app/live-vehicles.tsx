"use client";

import { useEffect, useState } from "react";
import type { VehiclePosition } from "@/lib/schemas";

type ApiResponse = {
  updatedAt: string;
  vehicles: VehiclePosition[];
};

export function LiveVehicles() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (!res.ok) throw new Error("Falha na resposta");
        const json: ApiResponse = await res.json();
        if (active) {
          setData(json);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    }

    load();
    const timer = setInterval(load, 5000); // atualiza a cada 5 segundos

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (failed && !data) {
    return <p className="text-red-400">Não foi possível carregar os veículos.</p>;
  }

  if (!data) {
    return <p className="text-slate-400">Buscando veículos...</p>;
  }

  return (
    <div className="space-y-3">
      {failed && (
        <p className="text-sm text-amber-400">
          Conexão instável. Mostrando a última posição conhecida.
        </p>
      )}

      {data.vehicles.map((v) => (
        <div key={v.vehicleId} className="rounded-lg bg-slate-800 p-4">
          <p className="font-bold">
            {v.vehicleId} <span className="text-slate-400">({v.lineCode})</span>
          </p>
          <p className="text-sm text-slate-300">
            {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)} ·{" "}
            {v.speedKmh} km/h · direção {Math.round(v.heading)}°
          </p>
        </div>
      ))}

      <p className="text-xs text-slate-500">
        Atualizado às {new Date(data.updatedAt).toLocaleTimeString("pt-BR")}
      </p>
    </div>
  );
}