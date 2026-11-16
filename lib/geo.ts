export type Point = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

// Distância em metros entre dois pontos (fórmula de Haversine)
export function distanceMeters(a: Point, b: Point): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Direção (0 a 360 graus) para ir do ponto a ao ponto b
export function bearingDegrees(a: Point, b: Point): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Comprimento total de um trajeto (lista de pontos), em metros
export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distanceMeters(points[i], points[i + 1]);
  }
  return total;
}

// Ponto que fica a "distance" metros do início do trajeto, e a direção ali
export function pointAlongPath(
  points: Point[],
  distance: number
): { point: Point; heading: number } {
  let walked = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segment = distanceMeters(a, b);

    if (distance <= walked + segment) {
      const t = segment === 0 ? 0 : (distance - walked) / segment;
      return {
        point: {
          latitude: a.latitude + (b.latitude - a.latitude) * t,
          longitude: a.longitude + (b.longitude - a.longitude) * t,
        },
        heading: bearingDegrees(a, b),
      };
    }
    walked += segment;
  }

  const last = points[points.length - 1];
  return { point: last, heading: 0 };
}

// Diferença entre dois ângulos, de 0 a 180 graus
function angleDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Trechos até esta distância do mais próximo contam como "o mesmo lugar"
const SAME_PLACE_METERS = 20;

// O contrário de pointAlongPath: dado um ponto (a posição do GPS), descobre
// em que ponto do trajeto ele está.
//   distanceAlong = metros percorridos desde o início do trajeto
//   offsetMeters  = distância do ponto até a rota (quanto ele está "fora" dela)
//
// Se o circuito passa duas vezes pela mesma rua (ida e volta), vários trechos
// ficam igualmente perto. Com a direção do ônibus ("heading"), escolhemos o
// trecho que aponta para o mesmo lado em que ele anda.
export function projectOnPath(
  points: Point[],
  p: Point,
  heading?: number
): { distanceAlong: number; offsetMeters: number } {
  type Candidate = {
    distanceAlong: number;
    offsetMeters: number;
    bearing: number;
  };
  const candidates: Candidate[] = [];
  let walked = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segment = distanceMeters(a, b);

    // Em distâncias curtas, tratamos a Terra como um plano (x, y em metros),
    // com a origem no ponto "a". Fica simples e preciso o bastante.
    const cosLat = Math.cos(toRad(a.latitude));
    const toXY = (q: Point) => ({
      x: toRad(q.longitude - a.longitude) * cosLat * EARTH_RADIUS_M,
      y: toRad(q.latitude - a.latitude) * EARTH_RADIUS_M,
    });
    const B = toXY(b);
    const P = toXY(p);

    // t = em que fração do segmento (0 a 1) fica o ponto mais próximo de P
    const lengthSquared = B.x * B.x + B.y * B.y;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, (P.x * B.x + P.y * B.y) / lengthSquared));

    candidates.push({
      distanceAlong: walked + t * segment,
      offsetMeters: Math.hypot(P.x - t * B.x, P.y - t * B.y),
      bearing: bearingDegrees(a, b),
    });
    walked += segment;
  }

  if (candidates.length === 0) return { distanceAlong: 0, offsetMeters: Infinity };

  let minOffset = Infinity;
  for (const c of candidates) {
    if (c.offsetMeters < minOffset) minOffset = c.offsetMeters;
  }

  // Sem direção: o trecho mais próximo (o primeiro, se houver empate)
  let best = candidates.find((c) => c.offsetMeters === minOffset) as Candidate;

  if (heading !== undefined) {
    const close = candidates.filter(
      (c) => c.offsetMeters <= minOffset + SAME_PLACE_METERS
    );
    best = close.reduce((a, b) => {
      const diffA = angleDifference(a.bearing, heading);
      const diffB = angleDifference(b.bearing, heading);
      // Direções quase iguais (trechos em sequência): vale o mais próximo
      if (Math.abs(diffA - diffB) <= 5) {
        return b.offsetMeters < a.offsetMeters ? b : a;
      }
      return diffB < diffA ? b : a;
    });
  }

  return { distanceAlong: best.distanceAlong, offsetMeters: best.offsetMeters };
}