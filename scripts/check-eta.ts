import assert from "node:assert/strict";
import { buildRoute, computeArrivals, formatEta } from "../lib/eta";
import type { LineWithStops } from "../lib/queries";
import type { VehiclePosition } from "../lib/schemas";

const line: LineWithStops = {
  id: 1,
  code: "C1",
  name: "Linha de teste",
  color: "#2563eb",
  stops: [
    { id: 1, name: "A", latitude: -20.9876, longitude: -47.6567, position: 1 },
    { id: 2, name: "B", latitude: -20.989, longitude: -47.655, position: 2 },
    { id: 3, name: "C", latitude: -20.991, longitude: -47.653, position: 3 },
    { id: 4, name: "D", latitude: -20.9935, longitude: -47.651, position: 4 },
  ],
};

function bus(id: string, latitude: number, longitude: number): VehiclePosition {
  return {
    vehicleId: id,
    lineCode: "C1",
    latitude,
    longitude,
    speedKmh: 25,
    heading: 0,
    timestamp: new Date().toISOString(),
  };
}

// Aceita diferença de até 2 metros (arredondamentos)
function near(actual: number, expected: number, tolerance = 2) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `esperado ~${Math.round(expected)} m, veio ${actual} m`
  );
}

const { stopDistances, total } = buildRoute(line);
const [, B, C, D] = line.stops;

// Ônibus parado exatamente na parada B
const atB = bus("T1", B.latitude, B.longitude);

// 1) Na própria parada B: distância ~0
near(computeArrivals(line, 2, [atB])[0].distanceMeters, 0);

// 2) Até a parada C: a distância do trecho B -> C
near(
  computeArrivals(line, 3, [atB])[0].distanceMeters,
  stopDistances[2] - stopDistances[1]
);

// 3) Até a parada A (que ficou para trás): precisa fechar a volta
near(
  computeArrivals(line, 1, [atB])[0].distanceMeters,
  total - stopDistances[1]
);

// 4) Dois ônibus: o mais próximo da parada D aparece primeiro
const atC = bus("T2", C.latitude, C.longitude);
const sorted = computeArrivals(line, 4, [atB, atC]);
assert.equal(sorted[0].vehicleId, "T2");
assert.equal(sorted[1].vehicleId, "T1");

// 5) Ônibus longe da rota (~1 km) é ignorado
const far = bus("T3", D.latitude + 0.01, D.longitude);
assert.equal(computeArrivals(line, 2, [far]).length, 0);

// 6) Parada que não existe na linha
assert.equal(computeArrivals(line, 999, [atB]).length, 0);

// 7) Textos
assert.equal(formatEta(10), "chegando");
assert.equal(formatEta(45), "1 min");
assert.equal(formatEta(300), "5 min");

console.log("Todos os testes passaram.");