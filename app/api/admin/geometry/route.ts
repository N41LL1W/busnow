import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lines, lineStops, stops } from "@/db/schema";
import { getCurrentAdmin, requireAdminApi } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { bearingDegrees, distanceMeters } from "@/lib/geo";
import { nodesHash, routeThrough } from "@/lib/routing";

// Gerar o traçado faz várias consultas ao serviço de rotas, com pausa entre
// elas. No site publicado, isso pede mais tempo que o padrão (em segundos).
export const maxDuration = 60;

const bodySchema = z.object({ lineId: z.number().int().positive() });

// Ponto mais longe que isto da rua mais próxima merece conferência
const FAR_FROM_STREET_METERS = 40;

// Volta mais fechada que isto (em graus) parece ordem trocada
const REVERSAL_DEGREES = 150;

type NodeRow = {
  id: number;
  kind: "stop" | "waypoint";
  name: string;
  latitude: number;
  longitude: number;
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Como chamar o item numa mensagem (curva: diz depois de qual parada vem).
// As duas formas são femininas, então "A ..." e "Na ..." funcionam nas frases.
function describe(nodes: NodeRow[], index: number): string {
  const node = nodes[index];
  if (node.kind === "stop") return `parada "${node.name}"`;

  for (let i = index - 1; i >= 0; i--) {
    if (nodes[i].kind === "stop") {
      return `curva depois da parada "${nodes[i].name}"`;
    }
  }
  return "curva no início da lista";
}

// Onde o caminho (ligando os pontos em reta) volta quase para trás
function findReversals(nodes: NodeRow[]): string[] {
  const warnings: string[] = [];
  const count = nodes.length;

  for (let i = 0; i < count; i++) {
    const before = nodes[(i + count - 1) % count];
    const here = nodes[i];
    const after = nodes[(i + 1) % count];

    // Ignora pontos quase colados (a direção fica instável)
    if (distanceMeters(before, here) < 15 || distanceMeters(here, after) < 15) {
      continue;
    }

    const diff = Math.abs(bearingDegrees(before, here) - bearingDegrees(here, after));
    const turn = diff > 180 ? 360 - diff : diff;

    if (turn > REVERSAL_DEGREES) {
      warnings.push(
        `Na ${describe(nodes, i)} o caminho volta quase para trás. A ordem está certa?`
      );
    }
  }

  return warnings;
}

export async function POST(request: Request) {
  // Só administradores logados, e só pedidos vindos do próprio site
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("Corpo inválido.", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail("Linha inválida.", 400);
  const { lineId } = parsed.data;

  const nodes: NodeRow[] = await db
    .select({
      id: lineStops.id,
      kind: stops.kind,
      name: stops.name,
      latitude: stops.latitude,
      longitude: stops.longitude,
    })
    .from(lineStops)
    .innerJoin(stops, eq(lineStops.stopId, stops.id))
    .where(and(eq(lineStops.lineId, lineId), eq(lineStops.direction, 0)))
    .orderBy(asc(lineStops.position), asc(lineStops.id));

  if (nodes.length < 2) {
    return fail("A linha precisa de pelo menos 2 pontos.", 400);
  }

  try {
    // Fecha o circuito: depois do último ponto, volta ao primeiro
    const result = await routeThrough([...nodes, nodes[0]]);

    const warnings: string[] = [];

    // Pontos longe de qualquer rua (o último valor repete o primeiro ponto)
    nodes.forEach((_, index) => {
      const snap = result.snapDistances[index];
      if (snap !== undefined && snap > FAR_FROM_STREET_METERS) {
        warnings.push(
          `A ${describe(nodes, index)} fica a ${Math.round(snap)} m da rua mais próxima.`
        );
      }
    });

    warnings.push(...findReversals(nodes));

    await db
      .update(lines)
      .set({
        geometry: result.geometry,
        geometryHash: nodesHash(nodes),
      })
      .where(eq(lines.id, lineId));

    const admin = await getCurrentAdmin();
    if (admin) {
      await recordAudit(admin, "route.geometry", `Traçado pelas ruas gerado (linha ${lineId})`, {
        lineId,
        points: result.geometry.length,
        warnings: warnings.length,
      });
    }

    return NextResponse.json({
      points: result.geometry.length,
      kilometers: Math.round(result.distanceMeters / 100) / 10,
      warnings,
    });
  } catch (error) {
    console.error("Erro ao gerar traçado:", error);
    return fail(
      error instanceof Error ? error.message : "Não foi possível gerar o traçado.",
      502
    );
  }
}