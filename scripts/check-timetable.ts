import assert from "node:assert/strict";
import {
  buildRoute,
  computeArrivals,
  distanceAtMinutes,
  minutesAtDistance,
} from "../lib/eta";
import type { LineWithStops } from "../lib/queries";
import type { VehiclePosition } from "../lib/schemas";
import { getSaoPauloNow, minutesToTime, timeToMinutes } from "../lib/time";

// Volta de 20 minutos; paradas A, B, C, D passam aos 0, 5, 12 e 18 minutos
const line: LineWithStops = {
  id: 1,
  code: "C1",
  name: "Linha de teste",
  color: "#2563eb",
  tripMinutes: 20,
  stops: [
    { id: 1, name: "A", latitude: -20.9876, longitude: -47.6567, position: 1, offsetMinutes: 0 },
    { id: 2, name: "B", latitude: -20.989, longitude: -47.655, position: 2, offsetMinutes: 5 },
    { id: 3, name: "C", latitude: -20.991, longitude: -47.653, position: 3, offsetMinutes: 12 },
    { id: 4, name: "D", latitude: -20.9935, longitude: -47.651, position: 4, offsetMinutes: 18 },
  ],
};

function bus(id: string, latitude: number, longitude: number): VehiclePosition {
  return {
    vehicleId: id,
    lineCode: "C1",
    latitude,
    longitude,
    speedKmh: 20,
    heading: 0,
    timestamp: new Date().toISOString(),
  };
}

function near(actual: number, expected: number, tolerance: number) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `esperado ~${expected}, veio ${actual}`
  );
}

const { timeline, stopDistances, total } = buildRoute(line);
if (!timeline) throw new Error("A linha do tempo não foi montada.");

// 1) A linha do tempo usa os minutos da tabela e fecha com a volta
assert.deepEqual(timeline.minutes, [0, 5, 12, 18, 20]);
assert.equal(timeline.distances.length, 5);
assert.equal(timeline.distances[1], stopDistances[1]);

// 2) Distância -> minutos
near(minutesAtDistance(timeline, 0), 0, 0.001);
near(minutesAtDistance(timeline, stopDistances[1]), 5, 0.001);
near(minutesAtDistance(timeline, stopDistances[2]), 12, 0.001);
near(minutesAtDistance(timeline, total), 20, 0.001);
// no meio do trecho B -> C (5 a 12 min), o horário é a média: 8,5
near(
  minutesAtDistance(timeline, (stopDistances[1] + stopDistances[2]) / 2),
  8.5,
  0.001
);

// 3) Minutos -> distância (o caminho de volta) e limites
near(distanceAtMinutes(timeline, 5), stopDistances[1], 0.01);
near(minutesAtDistance(timeline, distanceAtMinutes(timeline, 8.5)), 8.5, 0.001);
assert.equal(distanceAtMinutes(timeline, -3), 0);
near(distanceAtMinutes(timeline, 25), total, 0.001);

// 4) Previsão pela tabela: ônibus exatamente na parada B (minuto 5 da tabela)
const atB = bus("T1", line.stops[1].latitude, line.stops[1].longitude);
const eta = (stopId: number) => computeArrivals(line, stopId, [atB])[0].etaSeconds;

near(eta(2), 0, 3); // na própria parada B
near(eta(3), (12 - 5) * 60, 3); // até C: 7 min
near(eta(4), (18 - 5) * 60, 3); // até D: 13 min
near(eta(1), (20 - 5) * 60, 3); // até A: precisa fechar a volta (15 min)

// 5) Sem a duração da volta, cai na velocidade fixa
const noTrip: LineWithStops = { ...line, tripMinutes: null };
assert.equal(buildRoute(noTrip).timeline, null);
const fixedSpeed = (25 * 1000) / 3600;
near(
  computeArrivals(noTrip, 3, [atB])[0].etaSeconds,
  (stopDistances[2] - stopDistances[1]) / fixedSpeed,
  1
);

// 6) Parada nova, sem minuto informado (0): o horário dela é estimado
const withNewStop: LineWithStops = {
  ...line,
  stops: line.stops.map((stop) =>
    stop.id === 3 ? { ...stop, offsetMinutes: 0 } : stop
  ),
};
const estimated = buildRoute(withNewStop);
assert.deepEqual(estimated.timeline?.minutes, [0, 5, 18, 20]);
const estimatedMinute = minutesAtDistance(
  estimated.timeline!,
  estimated.stopDistances[2]
);
assert.ok(estimatedMinute > 5 && estimatedMinute < 18);

// 7) Texto dos horários
assert.equal(minutesToTime(425), "07:05");
assert.equal(minutesToTime(60 * 24 + 5), "00:05");
assert.equal(timeToMinutes("06:30"), 390);
assert.equal(timeToMinutes("06:30:00"), 390);

// 8) Relógio de Brasília, com datas fixas (o fuso do computador não importa)
// sábado 14/11/2026, 15:00 UTC = 12:00 em Brasília
assert.deepEqual(getSaoPauloNow(new Date("2026-11-14T15:00:00Z")), {
  dayType: "saturday",
  secondsOfDay: 12 * 3600,
});
// 02:30 UTC de segunda = 23:30 de DOMINGO em Brasília
assert.deepEqual(getSaoPauloNow(new Date("2026-11-16T02:30:00Z")), {
  dayType: "sunday",
  secondsOfDay: 23 * 3600 + 30 * 60,
});
// segunda 16/11/2026, 12:00 UTC = 09:00 em Brasília
assert.deepEqual(getSaoPauloNow(new Date("2026-11-16T12:00:00Z")), {
  dayType: "weekday",
  secondsOfDay: 9 * 3600,
});

console.log("Todos os testes passaram.");