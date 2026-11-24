"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lines, lineStops, schedules, stops } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import type { FormState } from "../form-state";

const DAYS = [
  { key: "weekday", label: "Segunda a sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

const MAX_PER_DAY = 150;

function parseLineId(formData: FormData): number | null {
  const id = Number(formData.get("lineId"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Aceita "6:00", "06:00", separados por espaço, vírgula, ponto e vírgula
// ou quebra de linha. Devolve "HH:MM" ordenado e sem repetidos, ou o texto
// que não entendeu.
function parseTimes(
  text: string
): { times: string[] } | { invalid: string } {
  const tokens = text.split(/[\s,;]+/).filter(Boolean);
  const set = new Set<string>();

  for (const token of tokens) {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(token);
    if (!match) return { invalid: token };
    set.add(`${match[1].padStart(2, "0")}:${match[2]}`);
  }

  return { times: [...set].sort() };
}

export async function saveDeparturesAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const lineId = parseLineId(formData);
  if (!lineId) return { error: "Linha inválida." };

  const [line] = await db
    .select({ id: lines.id })
    .from(lines)
    .where(eq(lines.id, lineId))
    .limit(1);
  if (!line) return { error: "Linha não encontrada." };

  const rows: { lineId: number; direction: number; dayType: "weekday" | "saturday" | "sunday"; departureTime: string }[] = [];

  for (const day of DAYS) {
    const parsed = parseTimes(String(formData.get(day.key) ?? ""));
    if ("invalid" in parsed) {
      return {
        error: `${day.label}: "${parsed.invalid}" não é um horário válido. Use o formato 06:30.`,
      };
    }
    if (parsed.times.length > MAX_PER_DAY) {
      return { error: `${day.label}: no máximo ${MAX_PER_DAY} horários.` };
    }
    for (const time of parsed.times) {
      rows.push({ lineId, direction: 0, dayType: day.key, departureTime: time });
    }
  }

  // Apaga as saídas antigas e grava as novas de uma vez (tudo ou nada)
  const remove = db
    .delete(schedules)
    .where(and(eq(schedules.lineId, lineId), eq(schedules.direction, 0)));

  if (rows.length === 0) {
    await remove;
  } else {
    await db.batch([remove, db.insert(schedules).values(rows)]);
  }

  revalidatePath("/admin/horarios");
  return { ok: true };
}

export async function saveMinutesAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const lineId = parseLineId(formData);
  if (!lineId) return { error: "Linha inválida." };

  const trip = Number(formData.get("tripMinutes"));
  if (!Number.isInteger(trip) || trip < 5 || trip > 300) {
    return { error: "Duração da volta: informe de 5 a 300 minutos." };
  }

  // As paradas vêm do banco (não do formulário): só valem as da própria linha
  const lineStopRows = await db
    .select({ id: lineStops.id, name: stops.name })
    .from(lineStops)
    .innerJoin(stops, eq(lineStops.stopId, stops.id))
    .where(
      and(
        eq(lineStops.lineId, lineId),
        eq(lineStops.direction, 0),
        eq(stops.kind, "stop")
      )
    )
    .orderBy(asc(lineStops.position), asc(lineStops.id));

  if (lineStopRows.length === 0) {
    return { error: "Esta linha não tem paradas." };
  }

  const minutes: number[] = [];
  for (const [index, row] of lineStopRows.entries()) {
    // A primeira parada é a saída do terminal: sempre minuto 0
    const value = index === 0 ? 0 : Number(formData.get(`m-${row.id}`));

    if (!Number.isInteger(value) || value < 0) {
      return { error: `"${row.name}": informe os minutos como número inteiro.` };
    }
    if (index > 0 && value <= minutes[index - 1]) {
      return {
        error: `"${row.name}": os minutos precisam ser maiores que os da parada anterior (${minutes[index - 1]}).`,
      };
    }
    if (value >= trip) {
      return {
        error: `"${row.name}": precisa ser menor que a duração da volta (${trip} min).`,
      };
    }
    minutes.push(value);
  }

  await db.batch([
    db.update(lines).set({ tripMinutes: trip }).where(eq(lines.id, lineId)),
    ...lineStopRows.map((row, index) =>
      db
        .update(lineStops)
        .set({ offsetMinutes: minutes[index] })
        .where(eq(lineStops.id, row.id))
    ),
  ]);

  revalidatePath("/admin/horarios");
  return { ok: true };
}