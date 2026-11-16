import { distanceMeters, pointAlongPath, projectOnPath, type Point } from "./geo";
import type { LineWithStops } from "./queries";
import type { VehiclePosition } from "./schemas";

// Velocidade usada na previsão quando a linha não tem a duração da volta
// (tripMinutes). Com a tabela, a velocidade sai dos horários do PDF.
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

// Relação entre a posição no trajeto e o horário da tabela.
// distances[i] metros depois da saída = minutes[i] minutos depois da saída.
// Os dois vetores crescem sempre, e o último par é a volta ao terminal.
export type Timeline = {
  distances: number[];
  minutes: number[];
  tripMinutes: number;
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

// Com traçado pelas ruas salvo (já vem fechando o circuito)
function routeFromGeometry(line: LineWithStops, geometry: [number, number][]) {
  const loop: Point[] = geometry.map(([latitude, longitude]) => ({
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

// Sem traçado: liga as paradas e curvas em linha reta
function routeFromNodes(line: LineWithStops) {
  const nodes: Point[] = line.path ?? line.stops;
  const loop = nodes.length > 0 ? [...nodes, nodes[0]] : [];
  const cumulative = cumulativeDistances(loop);

  const stopDistances = line.stops.map(
    (stop, index) => cumulative[stop.pathIndex ?? index] ?? 0
  );

  return { loop, stopDistances, total: cumulative[cumulative.length - 1] };
}

// Monta a linha do tempo com os minutos do PDF. Paradas com minuto repetido
// ou fora de ordem (por exemplo, paradas novas ainda sem horário) não viram
// ponto de referência: o horário delas é estimado entre os vizinhos.
function buildTimeline(
  line: LineWithStops,
  stopDistances: number[],
  total: number
): Timeline | null {
  const trip = line.tripMinutes;
  if (!trip || trip <= 0 || total <= 0) return null;

  const distances = [0];
  const minutes = [0];

  line.stops.forEach((stop, index) => {
    if (index === 0) return;
    const minute = stop.offsetMinutes ?? 0;
    const distance = stopDistances[index];

    if (
      minute > minutes[minutes.length - 1] &&
      minute < trip &&
      distance > distances[distances.length - 1] &&
      distance < total
    ) {
      distances.push(distance);
      minutes.push(minute);
    }
  });

  distances.push(total);
  minutes.push(trip);

  return { distances, minutes, tripMinutes: trip };
}

// Monta o circuito da linha: caminho fechado, a distância de cada parada
// desde o ponto de partida e (se houver a duração da volta) a linha do tempo.
export function buildRoute(line: LineWithStops) {
  const base =
    line.geometry && line.geometry.length >= 3
      ? routeFromGeometry(line, line.geometry)
      : routeFromNodes(line);

  return {
    ...base,
    timeline: buildTimeline(line, base.stopDistances, base.total),
  };
}

// Minutos depois da saída em que o ônibus (seguindo a tabela) está a
// "distance" metros do início do circuito
export function minutesAtDistance(timeline: Timeline, distance: number): number {
  const { distances, minutes } = timeline;
  const last = distances.length - 1;

  if (distance <= 0) return 0;
  if (distance >= distances[last]) return minutes[last];

  let k = 0;
  while (k < last - 1 && distances[k + 1] <= distance) k++;

  const span = distances[k + 1] - distances[k];
  const fraction = span === 0 ? 0 : (distance - distances[k]) / span;
  return minutes[k] + fraction * (minutes[k + 1] - minutes[k]);
}

// O contrário: a que distância do início o ônibus está "minute" minutos
// depois da saída
export function distanceAtMinutes(timeline: Timeline, minute: number): number {
  const { distances, minutes } = timeline;
  const last = minutes.length - 1;

  if (minute <= 0) return 0;
  if (minute >= minutes[last]) return distances[last];

  let k = 0;
  while (k < last - 1 && minutes[k + 1] <= minute) k++;

  const span = minutes[k + 1] - minutes[k];
  const fraction = span === 0 ? 0 : (minute - minutes[k]) / span;
  return distances[k] + fraction * (distances[k + 1] - distances[k]);
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

  const { loop, stopDistances, total, timeline } = buildRoute(line);
  const metersPerSecond = (AVERAGE_SPEED_KMH * 1000) / 3600;
  const arrivals: Arrival[] = [];

  for (const vehicle of vehicles) {
    if (vehicle.lineCode !== line.code) continue;

    const { distanceAlong, offsetMeters } = projectOnPath(loop, vehicle);
    if (offsetMeters > MAX_OFF_ROUTE_METERS) continue;

    // Metros que faltam, andando pela rota até a parada
    let distance = stopDistances[stopIndex] - distanceAlong;
    let wrapped = false;
    if (distance < -PASSED_TOLERANCE_METERS) {
      distance += total; // já passou: precisa dar a volta no circuito
      wrapped = true;
    } else if (distance < 0) {
      distance = 0; // acabou de passar: conta como "na parada"
    }

    let etaSeconds: number;
    if (timeline) {
      // Com a tabela: tempo que ela leva entre onde o ônibus está e a parada
      const vehicleMinute = minutesAtDistance(timeline, distanceAlong);
      const stopMinute = minutesAtDistance(timeline, stopDistances[stopIndex]);
      const minutes =
        distance === 0
          ? 0
          : stopMinute - vehicleMinute + (wrapped ? timeline.tripMinutes : 0);
      etaSeconds = Math.max(0, Math.round(minutes * 60));
    } else {
      // Sem a tabela: velocidade fixa
      etaSeconds = Math.round(distance / metersPerSecond);
    }

    arrivals.push({
      vehicleId: vehicle.vehicleId,
      lineCode: vehicle.lineCode,
      distanceMeters: Math.round(distance),
      etaSeconds,
    });
  }

  return arrivals.sort((a, b) => a.etaSeconds - b.etaSeconds);
}

// Texto amigável para mostrar ao passageiro
export function formatEta(seconds: number): string {
  if (seconds < 30) return "chegando";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}