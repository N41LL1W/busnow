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

// O contrário de pointAlongPath: dado um ponto (a posição do GPS), descobre
// em que ponto do trajeto ele está.
//   distanceAlong = metros percorridos desde o início do trajeto
//   offsetMeters  = distância do ponto até a rota (quanto ele está "fora" dela)
export function projectOnPath(
  points: Point[],
  p: Point
): { distanceAlong: number; offsetMeters: number } {
  let walked = 0;
  let best = { distanceAlong: 0, offsetMeters: Infinity };

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

    const offset = Math.hypot(P.x - t * B.x, P.y - t * B.y);

    if (offset < best.offsetMeters) {
      best = { distanceAlong: walked + t * segment, offsetMeters: offset };
    }
    walked += segment;
  }

  return best;
}