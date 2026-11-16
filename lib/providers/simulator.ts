import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { buildRoute, distanceAtMinutes } from "@/lib/eta";
import { pointAlongPath } from "@/lib/geo";
import { getDepartures, getLinesWithStops } from "@/lib/queries";
import type { VehiclePosition } from "@/lib/schemas";
import { getSaoPauloNow, timeToMinutes, type DayType } from "@/lib/time";

// Só usada quando a linha ainda não tem a duração da volta (tripMinutes)
const FALLBACK_SPEED_KMH = 25;

// Depois de completar a volta, o ônibus espera no terminal até a próxima saída
const LAYOVER_MINUTES = 5;

// Para o relógio de teste (SIM_AT): quando a simulação começou
let simStartMs: number | null = null;

// Que dia e que hora (em minutos desde a meia-noite) a simulação considera
function readClock(nowMs: number): { dayType: DayType; minutes: number } {
  // Só em desenvolvimento: SIM_AT="09:30" faz o relógio da simulação começar
  // nesse horário e andar normalmente a partir dali. SIM_DAY escolhe o dia
  // ("weekday", "saturday" ou "sunday"; o padrão é dia útil).
  const simAt =
    process.env.NODE_ENV !== "production" ? process.env.SIM_AT : undefined;

  if (simAt) {
    if (simStartMs === null) simStartMs = nowMs;
    const simDay = process.env.SIM_DAY;
    const dayType: DayType =
      simDay === "saturday" || simDay === "sunday" ? simDay : "weekday";
    return {
      dayType,
      minutes: timeToMinutes(simAt) + (nowMs - simStartMs) / 60000,
    };
  }

  const { dayType, secondsOfDay } = getSaoPauloNow(new Date(nowMs));
  return { dayType, minutes: secondsOfDay / 60 };
}

export async function getSimulatedPositions(): Promise<VehiclePosition[]> {
  const [fleet, allLines, allDepartures] = await Promise.all([
    db
      .select({ externalId: vehicles.externalId, lineId: vehicles.lineId })
      .from(vehicles)
      .where(eq(vehicles.active, true))
      .orderBy(asc(vehicles.id)),
    getLinesWithStops(),
    getDepartures(),
  ]);

  const nowMs = Date.now();
  const clock = readClock(nowMs);
  const timestamp = new Date(nowMs).toISOString();
  const positions: VehiclePosition[] = [];

  for (const line of allLines) {
    // Linha sem veículo cadastrado: nada a simular
    const baseId = fleet.find((bus) => bus.lineId === line.id)?.externalId;
    if (!baseId) continue;

    const { loop, total, timeline } = buildRoute(line);
    if (loop.length < 3 || total === 0) continue;

    // Sem a duração da volta: volta contínua em velocidade fixa
    if (!timeline) {
      const metersPerSecond = (FALLBACK_SPEED_KMH * 1000) / 3600;
      const distance = ((nowMs / 1000) * metersPerSecond) % total;
      const { point, heading } = pointAlongPath(loop, distance);

      positions.push({
        vehicleId: baseId,
        lineCode: line.code,
        latitude: point.latitude,
        longitude: point.longitude,
        speedKmh: FALLBACK_SPEED_KMH,
        heading,
        timestamp,
      });
      continue;
    }

    // Com a tabela: viagens em andamento agora
    const departures = allDepartures.get(line.id)?.[clock.dayType] ?? [];
    const trip = timeline.tripMinutes;

    let running = departures.filter(
      (departure) => clock.minutes >= departure && clock.minutes < departure + trip
    );

    // Sem viagem em andamento: o ônibus da última viagem espera no terminal
    if (running.length === 0) {
      const waiting = [...departures]
        .reverse()
        .find(
          (departure) =>
            clock.minutes >= departure + trip &&
            clock.minutes < departure + trip + LAYOVER_MINUTES
        );
      if (waiting !== undefined) running = [waiting];
    }

    running.forEach((departure, index) => {
      // Minutos desde a saída (parado no fim da volta, se estiver esperando)
      const minute = Math.min(clock.minutes - departure, trip);
      const distance = distanceAtMinutes(timeline, minute);
      const { point, heading } = pointAlongPath(loop, distance);

      // Velocidade do trecho: quanto a tabela anda no último e no próximo minuto
      const from = Math.max(minute - 1, 0);
      const to = Math.min(minute + 1, trip);
      const metersPerMinute =
        to > from
          ? (distanceAtMinutes(timeline, to) - distanceAtMinutes(timeline, from)) /
            (to - from)
          : 0;
      const speedKmh = Math.round(((metersPerMinute * 60) / 1000) * 10) / 10;

      positions.push({
        vehicleId: index === 0 ? baseId : `${baseId}.${index + 1}`,
        lineCode: line.code,
        latitude: point.latitude,
        longitude: point.longitude,
        speedKmh,
        heading,
        timestamp,
      });
    });
  }

  return positions;
}