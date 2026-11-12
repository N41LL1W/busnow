import { config } from "dotenv";
import { lines as lineData, stopKey } from "./data/lines";
import { resolveStops } from "./data/positions";

config({ path: ".env.local" });

async function main() {
  // Posição de cada ponto: ajuste manual > coordenada achada pelo geocode
  const resolved = new Map(
    resolveStops().map((stop) => [stop.key, stop] as const)
  );

  // 1. Confere se TODO ponto tem posição ANTES de mexer no banco
  const missing = [...resolved.values()].filter(
    (stop) => stop.latitude === null || stop.longitude === null
  );
  if (missing.length > 0) {
    console.error(`Faltam posições para ${missing.length} ponto(s):`);
    missing.forEach((stop) => console.error(`  - ${stop.name}`));
    console.error(
      "\nAbra http://localhost:3000/dev/pontos (com `npm run dev` rodando) e arraste esses pontos para o lugar certo."
    );
    process.exit(1);
  }

  // Import dinâmico: garante que o .env.local já foi carregado
  const { db } = await import("./index");
  const { lines, stops, lineStops, schedules, vehicles } = await import(
    "./schema"
  );

  // ATENÇÃO: limpa as tabelas. Use só em desenvolvimento.
  await db.delete(vehicles);
  await db.delete(schedules);
  await db.delete(lineStops);
  await db.delete(stops);
  await db.delete(lines);

  // Paradas já criadas (o terminal é compartilhado entre as linhas)
  const stopIds = new Map<string, number>();

  for (const [lineIndex, line] of lineData.entries()) {
    const [createdLine] = await db
      .insert(lines)
      .values({ code: line.code, name: line.name, color: line.color })
      .returning();

    // 2. Cria só as paradas que ainda não existem
    const newStops = line.stops.filter((stop) => !stopIds.has(stopKey(stop)));

    if (newStops.length > 0) {
      const created = await db
        .insert(stops)
        .values(
          newStops.map((stop) => {
            const point = resolved.get(stopKey(stop))!;
            return {
              name: point.name,
              latitude: point.latitude as number,
              longitude: point.longitude as number,
            };
          })
        )
        .returning();

      newStops.forEach((stop, i) => stopIds.set(stopKey(stop), created[i].id));
    }

    // 3. Liga as paradas à linha, na ordem, com os minutos de cada uma
    await db.insert(lineStops).values(
      line.stops.map((stop, i) => ({
        lineId: createdLine.id,
        stopId: stopIds.get(stopKey(stop)) as number,
        direction: 0,
        position: i + 1,
        offsetMinutes: stop.offset,
      }))
    );

    // 4. Horários de saída do terminal
    await db.insert(schedules).values([
      ...line.weekdayDepartures.map((time) => ({
        lineId: createdLine.id,
        direction: 0,
        dayType: "weekday" as const,
        departureTime: time,
      })),
      ...line.saturdayDepartures.map((time) => ({
        lineId: createdLine.id,
        direction: 0,
        dayType: "saturday" as const,
        departureTime: time,
      })),
    ]);

    // 5. Um ônibus simulado por linha (cada linha tem um só veículo)
    await db.insert(vehicles).values({
      externalId: `SIM-${String(lineIndex + 1).padStart(3, "0")}`,
      label: `Ônibus ${line.code}`,
      lineId: createdLine.id,
    });

    console.log(`Linha ${line.code}: ${line.stops.length} pontos.`);
  }

  const pending = [...resolved.values()].filter(
    (stop) => stop.source !== "manual"
  ).length;
  console.log("Seed concluído.");
  console.log(
    `${pending} de ${resolved.size} pontos ainda não foram conferidos em /dev/pontos.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});