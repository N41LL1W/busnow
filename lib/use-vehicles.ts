"use client";

import { useEffect, useState } from "react";
import type { VehiclePosition } from "@/lib/schemas";

type ApiResponse = {
  updatedAt: string;
  vehicles: VehiclePosition[];
};

export function useVehicles(intervalMs = 5000) {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (!res.ok) throw new Error("Falha na resposta");
        const json: ApiResponse = await res.json();
        if (active) {
          setVehicles(json.vehicles);
          setUpdatedAt(json.updatedAt);
          setFailed(false);
        }
      } catch {
        // Mantém os veículos anteriores: melhor a última posição que tela vazia
        if (active) setFailed(true);
      }
    }

    load();
    const timer = setInterval(load, intervalMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { vehicles, updatedAt, failed };
}