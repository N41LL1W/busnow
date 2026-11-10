import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  // Import dinâmico: garante que o .env.local já foi carregado
  const { db } = await import("./index");
  const { lines, stops, lineStops, schedules } = await import("./schema");

  // ATENÇÃO: limpa as tabelas. Use só em desenvolvimento.
  await db.delete(schedules);
  await db.delete(lineStops);
  await db.delete(stops);
  await db.delete(lines);

  const [linha] = await db
    .insert(lines)
    .values({
      code: "C1",
      name: "Circular Centro - Bairros",
      color: "#2563eb",
    })
    .returning();

  // Coordenadas FICTÍCIAS, apenas para teste. Troque pelas reais depois.
  const paradas = await db
    .insert(stops)
    .values([
      { name: "Terminal (exemplo)", latitude: -20.9876, longitude: -47.6567 },
      { name: "Praça central (exemplo)", latitude: -20.989, longitude: -47.655 },
      { name: "Escola (exemplo)", latitude: -20.991, longitude: -47.653 },
      { name: "Posto de saúde (exemplo)", latitude: -20.9935, longitude: -47.651 },
    ])
    .returning();

  await db.insert(lineStops).values(
    paradas.map((p, i) => ({
      lineId: linha.id,
      stopId: p.id,
      direction: 0,
      position: i + 1,
    }))
  );

  await db.insert(schedules).values([
    { lineId: linha.id, direction: 0, dayType: "weekday", departureTime: "06:30" },
    { lineId: linha.id, direction: 0, dayType: "weekday", departureTime: "07:30" },
    { lineId: linha.id, direction: 0, dayType: "weekday", departureTime: "08:30" },
    { lineId: linha.id, direction: 0, dayType: "saturday", departureTime: "08:00" },
  ]);

  console.log("Seed concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});