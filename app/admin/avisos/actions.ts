"use server";

import { eq, not } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { notices } from "@/db/settings-schema";
import { requireAdmin } from "@/lib/admin-guard";
import type { FormState } from "../form-state";

// O campo datetime-local manda "2026-11-20T08:30", sem fuso. O app atende
// cidades de SP (UTC-3, sem horário de verão desde 2019): lemos assim.
function parseLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem do aviso.")
    .max(200, "Mensagem: no máximo 200 caracteres."),
  severity: z.enum(["info", "warning", "critical"], "Escolha o tipo do aviso."),
});

export async function createNoticeAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    message: String(formData.get("message") ?? ""),
    severity: String(formData.get("severity") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const startsAt = parseLocal(String(formData.get("startsAt") ?? ""));
  if (!startsAt) return { error: "Informe quando o aviso começa." };

  const endsRaw = String(formData.get("endsAt") ?? "");
  let endsAt: Date | null = null;
  if (endsRaw !== "") {
    endsAt = parseLocal(endsRaw);
    if (!endsAt) return { error: "Data de término inválida." };
    if (endsAt <= startsAt) {
      return { error: "O término precisa ser depois do início." };
    }
  }

  await db.insert(notices).values({ ...parsed.data, startsAt, endsAt });
  updateTag("notices");
  return { ok: true };
}

// Liga/desliga um aviso sem apagar
export async function toggleNoticeAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await db
    .update(notices)
    .set({ active: not(notices.active) })
    .where(eq(notices.id, id));
  updateTag("notices");
}

export async function deleteNoticeAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await db.delete(notices).where(eq(notices.id, id));
  updateTag("notices");
}