import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lines, lineStops, stops } from "@/db/schema";

// Só aceita posições dentro da região de Brodowski (barra erro de clique)
const latitude = z.number().min(-21.09).max(-20.89);
const longitude = z.number().min(-47.76).max(-47.56);
const id = z.number().int().positive();
const name = z.string().trim().min(1).max(120);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addNode"),
    lineId: id,
    kind: z.enum(["stop", "waypoint"]),
    name: name.optional(),
    latitude,
    longitude,
    // entra depois deste item; null = no fim da lista
    afterLineStopId: id.nullable(),
  }),
  z.object({
    action: z.literal("updateNode"),
    lineStopId: id,
    name: name.optional(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
    confirmed: z.boolean().optional(),
  }),
  z.object({ action: z.literal("deleteNode"), lineStopId: id }),
  z.object({
    action: z.literal("reorder"),
    lineId: id,
    orderedIds: z.array(id).min(1),
  }),
]);

type Action = z.infer<typeof actionSchema>;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Ids dos itens da linha, na ordem atual
async function currentOrder(lineId: number): Promise<number[]> {
  const rows = await db
    .select({ id: lineStops.id })
    .from(lineStops)
    .where(and(eq(lineStops.lineId, lineId), eq(lineStops.direction, 0)))
    .orderBy(asc(lineStops.position), asc(lineStops.id));
  return rows.map((row) => row.id);
}

// Regrava as posições 1..n na ordem dada, tudo de uma vez (atômico)
async function writeOrder(ids: number[]) {
  const updates = ids.map((lineStopId, index) =>
    db
      .update(lineStops)
      .set({ position: index + 1 })
      .where(eq(lineStops.id, lineStopId))
  );
  if (updates.length === 0) return;
  const [first, ...rest] = updates;
  await db.batch([first, ...rest]);
}

async function addNode(input: Extract<Action, { action: "addNode" }>) {
  const [line] = await db
    .select({ id: lines.id })
    .from(lines)
    .where(eq(lines.id, input.lineId))
    .limit(1);
  if (!line) return fail("Linha não encontrada.", 404);

  const ids = await currentOrder(input.lineId);
  let index = ids.length; // padrão: no fim
  if (input.afterLineStopId !== null) {
    const at = ids.indexOf(input.afterLineStopId);
    if (at === -1) return fail("O item de referência não é desta linha.", 404);
    index = at + 1;
  }

  const [stop] = await db
    .insert(stops)
    .values({
      name: input.name ?? (input.kind === "waypoint" ? "Curva" : "Novo ponto"),
      latitude: input.latitude,
      longitude: input.longitude,
      kind: input.kind,
      confirmed: true, // quem clicou no mapa escolheu o lugar
    })
    .returning();

  const [membership] = await db
    .insert(lineStops)
    .values({
      lineId: input.lineId,
      stopId: stop.id,
      direction: 0,
      position: ids.length + 1,
      offsetMinutes: 0,
    })
    .returning();

  ids.splice(index, 0, membership.id);
  await writeOrder(ids);

  return NextResponse.json({ lineStopId: membership.id });
}

async function updateNode(input: Extract<Action, { action: "updateNode" }>) {
  const [row] = await db
    .select({ stopId: lineStops.stopId })
    .from(lineStops)
    .where(eq(lineStops.id, input.lineStopId))
    .limit(1);
  if (!row) return fail("Ponto não encontrado.", 404);

  const changes: Partial<typeof stops.$inferInsert> = {};
  if (input.name !== undefined) changes.name = input.name;
  if (input.latitude !== undefined) changes.latitude = input.latitude;
  if (input.longitude !== undefined) changes.longitude = input.longitude;
  if (input.confirmed !== undefined) changes.confirmed = input.confirmed;

  if (Object.keys(changes).length > 0) {
    // Se o ponto é compartilhado (o terminal), muda nas duas linhas: é o
    // mesmo lugar físico.
    await db.update(stops).set(changes).where(eq(stops.id, row.stopId));
  }

  return NextResponse.json({ lineStopId: input.lineStopId });
}

async function deleteNode(input: Extract<Action, { action: "deleteNode" }>) {
  const [row] = await db
    .select({ lineId: lineStops.lineId, stopId: lineStops.stopId })
    .from(lineStops)
    .where(eq(lineStops.id, input.lineStopId))
    .limit(1);
  if (!row) return fail("Ponto não encontrado.", 404);

  await db.delete(lineStops).where(eq(lineStops.id, input.lineStopId));

  // Se nenhuma outra linha usa o ponto, apaga o ponto de vez
  const stillUsed = await db
    .select({ id: lineStops.id })
    .from(lineStops)
    .where(eq(lineStops.stopId, row.stopId))
    .limit(1);
  if (stillUsed.length === 0) {
    await db.delete(stops).where(eq(stops.id, row.stopId));
  }

  await writeOrder(await currentOrder(row.lineId));
  return NextResponse.json({ deleted: input.lineStopId });
}

async function reorder(input: Extract<Action, { action: "reorder" }>) {
  const current = await currentOrder(input.lineId);
  const wanted = new Set(input.orderedIds);

  // A nova ordem precisa ter exatamente os mesmos itens da linha
  const sameItems =
    wanted.size === current.length &&
    input.orderedIds.length === current.length &&
    current.every((lineStopId) => wanted.has(lineStopId));
  if (!sameItems) return fail("A lista não confere com a linha.", 400);

  await writeOrder(input.orderedIds);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  // Painel só para desenvolvimento por enquanto (login vem na Fase 10)
  if (process.env.NODE_ENV === "production") {
    return fail("Indisponível.", 404);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("Corpo inválido.", 400);
  }

  const parsed = actionSchema.safeParse(json);
  if (!parsed.success) {
    return fail(
      "Dados inválidos (a posição precisa ficar na região de Brodowski).",
      400
    );
  }

  const input = parsed.data;

  try {
    switch (input.action) {
      case "addNode":
        return await addNode(input);
      case "updateNode":
        return await updateNode(input);
      case "deleteNode":
        return await deleteNode(input);
      case "reorder":
        return await reorder(input);
    }
  } catch (error) {
    console.error("Erro no painel:", error);
    return fail("Erro ao salvar no banco.", 500);
  }
}