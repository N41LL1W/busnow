import { Suspense } from "react";
import { db } from "@/db";
import { lines } from "@/db/schema";
import { LiveVehicles } from "./live-vehicles";

// Componente que busca no banco. Roda no servidor.
async function LinesList() {
  const allLines = await db.select().from(lines);

  return (
    <ul className="space-y-3">
      {allLines.map((line) => (
        <li
          key={line.id}
          className="flex items-center gap-3 rounded-lg bg-slate-800 p-4"
        >
          <span
            className="rounded px-2 py-1 text-sm font-bold"
            style={{ backgroundColor: line.color }}
          >
            {line.code}
          </span>
          <span>{line.name}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <h1 className="mb-6 text-3xl font-bold">BusNow Brodowski</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Linhas</h2>
        <Suspense
          fallback={<p className="text-slate-400">Carregando linhas...</p>}
        >
          <LinesList />
        </Suspense>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Veículos (simulação)</h2>
        <LiveVehicles />
      </section>
    </main>
  );
}