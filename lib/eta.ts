import { distanceMeters, pointAlongPath, projectOnPath, type Point } from "./geo";
import type { LineWithStops } from "./queries";
import type { VehiclePosition } from "./schemas";

// Velocidade média usada na previsão. Usamos o mesmo valor do simulador para
// a demonstração bater. Com dados reais, o ideal é usar a média histórica
// de cada trecho e horário (isso vem numa fase futura).
export const AVERAGE_SPEED_KMH = 25;

// Ônibus mais longe que isto da rota é ignorado (desvio, GPS ruim, garagem)
const MAX_OFF_ROUTE_METERS = 150;

// O GPS oscila. Se o ônibus acabou de passar da parada (até esta distância),
// consideramos que ele está NA parada, em vez de mandá-lo dar a volta inteira.
const PASSED_TOLERANCE_METERS = 15;

export type Arrival = {
  vehicleId: string;
  lineCode: string;
  distanceMeters: number;
  etaSeconds: number;
};

// Distância acumulada desde o início até cada ponto do trajeto
function cumulativeDistances(points: Point[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + distanceMeters(points[i - 1], points[i]));
  }
  return cumulative;
}

// O trajeto a partir de "distance" metros do início (para encaixar a próxima
// parada só do ponto da anterior em diante)
function pathFrom(
  loop: Point[],
  cumulative: number[],
  distance: number
): Point[] {
  let k = 0;
  while (k < loop.length - 2 && cumulative[k + 1] <= distance) k++;
  const { point } = pointAlongPath(loop, distance);
  return [point, ...loop.slice(k + 1)];
}

// Monta o circuito da linha: caminho fechado e a distância de cada parada
// desde o ponto de partida, medida ao longo do caminho.
export function buildRoute(line: LineWithStops) {
  // 1. Com traçado pelas ruas salvo, usa ele (já vem fechando o circuito)
  if (line.geometry && line.geometry.length >= 3) {
    const loop: Point[] = line.geometry.map(([latitude, longitude]) => ({
      latitude,
      longitude,
    }));
    const cumulative = cumulativeDistances(loop);

    // Cada parada é encaixada no traçado, sempre à frente da anterior
    let previous = 0;
    const stopDistances = line.stops.map((stop, index) => {
      if (index === 0) return 0; // a primeira parada é o início do circuito
      const rest = pathFrom(loop, cumulative, previous);
      previous += projectOnPath(rest, stop).distanceAlong;
      return previous;
    });

    return { loop, stopDistances, total: cumulative[cumulative.length - 1] };
  }

  // 2. Sem traçado: liga as paradas e curvas em linha reta
  const nodes: Point[] = line.path ?? line.stops;
  const loop = nodes.length > 0 ? [...nodes, nodes[0]] : [];
  const cumulative = cumulativeDistances(loop);

  const stopDistances = line.stops.map(
    (stop, index) => cumulative[stop.pathIndex ?? index] ?? 0
  );

  return { loop, stopDistances, total: cumulative[cumulative.length - 1] };
}

// Previsão de chegada de cada ônibus da linha a uma parada, do mais próximo
// para o mais distante.
export function computeArrivals(
  line: LineWithStops,
  stopId: number,
  vehicles: VehiclePosition[]
): Arrival[] {
  const stopIndex = line.stops.findIndex((stop) => stop.id === stopId);
  if (stopIndex === -1 || line.stops.length < 2) return [];

  const { loop, stopDistances, total } = buildRoute(line);
  const metersPerSecond = (AVERAGE_SPEED_KMH * 1000) / 3600;
  const arrivals: Arrival[] = [];

  for (const vehicle of vehicles) {
    if (vehicle.lineCode !== line.code) continue;

    const { distanceAlong, offsetMeters } = projectOnPath(loop, vehicle);
    if (offsetMeters > MAX_OFF_ROUTE_METERS) continue;

    // Metros que faltam, andando pela rota até a parada
    let distance = stopDistances[stopIndex] - distanceAlong;
    if (distance < -PASSED_TOLERANCE_METERS) {
      distance += total; // já passou: precisa dar a volta no circuito
    } else if (distance < 0) {
      distance = 0; // acabou de passar: conta como "na parada"
    }

    arrivals.push({
      vehicleId: vehicle.vehicleId,
      lineCode: vehicle.lineCode,
      distanceMeters: Math.round(distance),
      etaSeconds: Math.round(distance / metersPerSecond),
    });
  }

  return arrivals.sort((a, b) => a.etaSeconds - b.etaSeconds);
}

// Texto amigável para mostrar ao passageiro
export function formatEta(seconds: number): string {
  if (seconds < 30) return "chegando";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}