"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { holidays } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { nationalHolidays } from "@/lib/national-holidays";
import type { FormState } from "../form-state";

// "2026-11-20" existe de verdade? (barra "2026-02-30")
function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function createHolidayAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const treatAs = String(formData.get("treatAs") ?? "");

  if (!isRealDate(date)) return { error: "Informe uma data válida." };
  if (!name || name.length > 80) {
    return { error: "O nome precisa ter de 1 a 80 caracteres." };
  }
  if (treatAs !== "sunday" && treatAs !== "saturday") {
    return { error: "Escolha quais horários valem nesse dia." };
  }

  const [existing] = await db
    .select({ name: holidays.name })
    .from(holidays)
    .where(eq(holidays.date, date))
    .limit(1);
  if (existing) {
    return { error: `Essa data já está cadastrada (${existing.name}).` };
  }

  await db.insert(holidays).values({ date, name, treatAs });
  revalidatePath("/admin/feriados");
  return { ok: true };
}

export async function deleteHolidayAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await db.delete(holidays).where(eq(holidays.id, id));
  revalidatePath("/admin/feriados");
}

// Cadastra os feriados nacionais do ano; os que já existem ficam como estão
export async function importNationalAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { error: "Ano inválido." };
  }

  const rows = nationalHolidays(year).map((item) => ({
    date: item.date,
    name: item.name,
    treatAs: "sunday" as const,
  }));

  const inserted = await db
    .insert(holidays)
    .values(rows)
    .onConflictDoNothing({ target: holidays.date })
    .returning({ id: holidays.id });

  revalidatePath("/admin/feriados");
  return inserted.length === 0
    ? { error: `Os feriados nacionais de ${year} já estavam cadastrados.` }
    : { ok: true };
}