import { distanceMeters, projectOnPath, type Point } from "./geo";

// Distância acumulada, desde o início, até cada vértice do trajeto
export function cumulativeDistances(path: Point[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    cumulative.push(cumulative[i - 1] + distanceMeters(path[i - 1], path[i]));
  }
  return cumulative;
}

// Distância ao longo do trajeto de cada ponto da lista, SEM nunca voltar atrás:
// cada ponto só é procurado dali para a frente. Isso evita errar quando o
// circuito passa duas vezes pela mesma rua.
export function projectInOrder(path: Point[], points: Point[]): number[] {
  if (path.length < 2) return points.map(() => 0);

  const cumulative = cumulativeDistances(path);
  const result: number[] = [];
  let previous = 0;

  for (const point of points) {
    // Primeiro vértice do trecho em que a posição anterior está
    let start = 0;
    while (start < cumulative.length - 2 && cumulative[start + 1] <= previous) {
      start++;
    }

    const { distanceAlong } = projectOnPath(path.slice(start), point);
    const distance = Math.max(cumulative[start] + distanceAlong, previous);

    result.push(distance);
    previous = distance;
  }

  return result;
}

// Em que lugar da lista de pontos um clique no mapa deve entrar?
// Devolve o índice do ponto que fica ANTES do novo, e o quão longe do
// trajeto o clique foi.
export function insertionIndex(
  path: Point[],
  nodes: Point[],
  click: Point
): { afterIndex: number; offsetMeters: number } {
  if (path.length < 2 || nodes.length === 0) {
    return { afterIndex: nodes.length - 1, offsetMeters: 0 };
  }

  const distances = projectInOrder(path, nodes);
  const { distanceAlong, offsetMeters } = projectOnPath(path, click);

  let afterIndex = 0;
  distances.forEach((distance, index) => {
    if (distance <= distanceAlong) afterIndex = index;
  });

  return { afterIndex, offsetMeters };
}