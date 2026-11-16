import { createHash } from "node:crypto";

export type LatLng = [number, number]; // [latitude, longitude]
type NodePoint = { latitude: number; longitude: number };

// Para usar um servidor próprio no futuro, defina OSRM_URL no .env.local
const OSRM_URL = process.env.OSRM_URL ?? "https://router.project-osrm.org";

// TROQUE pelo seu e-mail: o serviço público pede identificação de quem consulta
const USER_AGENT = "BusNow-Brodowski/0.1 (SEU-EMAIL@exemplo.com)";

const CHUNK_SIZE = 25; // pontos por consulta

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

// "Impressão digital" dos pontos de uma linha (id, ordem e posição).
// Se qualquer ponto mudar, mudar de lugar ou trocar de ordem, ela muda.
export function nodesHash(
  nodes: { id: number; latitude: number; longitude: number }[]
): string {
  const text = nodes
    .map((n) => `${n.id}:${n.latitude.toFixed(6)}:${n.longitude.toFixed(6)}`)
    .join("|");
  return createHash("sha1").update(text).digest("hex");
}

type OsrmResponse = {
  code: string;
  message?: string;
  routes?: { geometry: { coordinates: [number, number][] }; distance: number }[];
  waypoints?: { distance: number }[];
};

// Uma consulta ao OSRM, com nova tentativa se o serviço estiver ocupado
async function routeChunk(points: NodePoint[]): Promise<OsrmResponse> {
  // Atenção: o OSRM usa longitude,latitude (a ordem inversa da nossa)
  const coords = points
    .map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`)
    .join(";");
  // continue_straight=true: não faz retorno (U) nos pontos
  const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson&continue_straight=true&steps=false`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

    if (res.status === 429 || res.status === 503 || res.status === 504) {
      await sleep(attempt * 5000);
      continue;
    }

    try {
      // O OSRM responde com JSON até quando não acha rota (código 400)
      return (await res.json()) as OsrmResponse;
    } catch {
      throw new Error(`O serviço de rotas respondeu ${res.status}.`);
    }
  }

  throw new Error(
    "O serviço de rotas está ocupado. Tente de novo em alguns minutos."
  );
}

// Traça a rota pelas ruas passando pelos pontos, na ordem
export async function routeThrough(points: NodePoint[]) {
  const geometry: LatLng[] = [];
  const snapDistances: number[] = []; // distância de cada ponto até a rua
  let distanceMeters = 0;

  for (let start = 0; start < points.length - 1; start += CHUNK_SIZE - 1) {
    const end = Math.min(start + CHUNK_SIZE - 1, points.length - 1);
    const chunk = points.slice(start, end + 1);

    if (start > 0) await sleep(1100); // no máximo ~1 consulta por segundo

    const data = await routeChunk(chunk);
    const route = data.routes?.[0];

    if (data.code !== "Ok" || !route) {
      throw new Error(
        `Não foi possível traçar os itens ${start + 1} a ${end + 1} da lista (${data.message ?? data.code}).`
      );
    }

    route.geometry.coordinates.forEach(([lon, lat], i) => {
      // O primeiro ponto de cada pedaço repete o último do anterior
      if (start > 0 && i === 0) return;
      geometry.push([round5(lat), round5(lon)]);
    });

    (data.waypoints ?? []).forEach((waypoint, i) => {
      if (start > 0 && i === 0) return;
      snapDistances.push(waypoint.distance);
    });

    distanceMeters += route.distance;
  }

  // Tira pontos repetidos em sequência
  const clean = geometry.filter(
    (p, i) => i === 0 || p[0] !== geometry[i - 1][0] || p[1] !== geometry[i - 1][1]
  );

  return { geometry: clean, snapDistances, distanceMeters };
}