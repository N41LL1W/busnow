"use server";

import { eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lines, lineStops, stops, vehicles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { contrastWithWhite, isHexColor, MIN_CONTRAST } from "@/lib/color";
import type { FormState } from "../form-state";
import { recordAudit } from "@/lib/audit";

const text = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

const toId = (value: FormDataEntryValue | null): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// A cor da linha leva texto branco (selo "C1"): precisa de contraste
function checkColor(color: string): string | null {
  if (!isHexColor(color)) return "Escolha uma cor válida.";
  const ratio = contrastWithWhite(color);
  if (ratio < MIN_CONTRAST) {
    return "Esta cor é clara demais para o selo da linha (texto branco). Escolha uma mais escura.";
  }
  return null;
}

// ---------- Linhas ----------

export async function createLineAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireAdmin();

  const code = text(formData, "code").toUpperCase();
  const name = text(formData, "name");
  const color = text(formData, "color").toLowerCase();

  if (!/^[A-Z0-9-]{1,10}$/.test(code)) {
    return { error: "Código: de 1 a 10 letras, números ou hífen (ex.: C3)." };
  }
  if (!name || name.length > 60) {
    return { error: "O nome precisa ter de 1 a 60 caracteres." };
  }
  const colorError = checkColor(color);
  if (colorError) return { error: colorError };

  const [existing] = await db
    .select({ id: lines.id })
    .from(lines)
    .where(eq(lines.code, code))
    .limit(1);
  if (existing) return { error: `Já existe uma linha com o código ${code}.` };

  await db.insert(lines).values({ code, name, color });
  revalidatePath("/admin/cadastros");
  await recordAudit(admin, "line.create", `Linha ${code} criada: ${name}`, { color });
  return { ok: true };
}

export async function updateLineAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireAdmin();

  const id = toId(formData.get("id"));
  const name = text(formData, "name");
  const color = text(formData, "color").toLowerCase();

  if (!id) return { error: "Linha inválida." };
  if (!name || name.length > 60) {
    return { error: "O nome precisa ter de 1 a 60 caracteres." };
  }
  const colorError = checkColor(color);
  if (colorError) return { error: colorError };

  await db
  const active = formData.get("active") === "on";
  const [updated] = await db
    .update(lines)
    .set({ name, color, active })
    .where(eq(lines.id, id))
    .returning({ code: lines.code });

  revalidatePath("/admin/cadastros");
  if (updated) {
    await recordAudit(admin, "line.update", `Linha ${updated.code} atualizada`, {
      name,
      color,
      active,
    });
  }
  return { ok: true };
}

// Apagar uma linha leva junto os pontos do trajeto e os horários dela.
// Por isso pede uma confirmação marcada.
export async function deleteLineAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireAdmin();

  const id = toId(formData.get("id"));
  if (!id) return { error: "Linha inválida." };
  if (formData.get("confirm") !== "on") {
    return { error: "Marque a confirmação para apagar." };
  }

    const [line] = await db
    .select({ code: lines.code, name: lines.name })
    .from(lines)
    .where(eq(lines.id, id))
    .limit(1);
  if (!line) return { error: "Linha não encontrada." };

  // 1) apaga a linha (pontos do trajeto e horários saem junto; os veículos
  //    apenas ficam sem linha) 2) apaga as paradas que ninguém mais usa
  await db.batch([
    db.delete(lines).where(eq(lines.id, id)),
    db
      .delete(stops)
      .where(
        notInArray(
          stops.id,
          db.select({ id: lineStops.stopId }).from(lineStops)
        )
      ),
  ]);

  revalidatePath("/admin/cadastros");
  await recordAudit(admin, "line.delete", `Linha ${line.code} apagada (${line.name})`);
  return { ok: true };
}

// ---------- Veículos ----------

async function parseLineChoice(
  value: FormDataEntryValue | null
): Promise<{ lineId: number | null } | { error: string }> {
  if (value === null || value === "") return { lineId: null };
  const lineId = toId(value);
  if (!lineId) return { error: "Linha inválida." };

  const [line] = await db
    .select({ id: lines.id })
    .from(lines)
    .where(eq(lines.id, lineId))
    .limit(1);
  return line ? { lineId } : { error: "Linha não encontrada." };
}

export async function createVehicleAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireAdmin();

  const externalId = text(formData, "externalId");
  const label = text(formData, "label");

  if (!/^[A-Za-z0-9._-]{1,40}$/.test(externalId)) {
    return {
      error: "Identificador: de 1 a 40 letras, números, ponto, hífen ou sublinhado.",
    };
  }
  if (!label || label.length > 60) {
    return { error: "O nome precisa ter de 1 a 60 caracteres." };
  }
  const choice = await parseLineChoice(formData.get("lineId"));
  if ("error" in choice) return choice;

  const [existing] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.externalId, externalId))
    .limit(1);
  if (existing) {
    return { error: `Já existe um veículo com o identificador ${externalId}.` };
  }

  await db.insert(vehicles).values({ externalId, label, lineId: choice.lineId });
  revalidatePath("/admin/cadastros");
  await recordAudit(admin, "vehicle.create", `Veículo ${externalId} cadastrado: ${label}`, {
    lineId: choice.lineId,
  });
  return { ok: true };
}

export async function updateVehicleAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireAdmin();

  const id = toId(formData.get("id"));
  const label = text(formData, "label");

  if (!id) return { error: "Veículo inválido." };
  if (!label || label.length > 60) {
    return { error: "O nome precisa ter de 1 a 60 caracteres." };
  }
  const choice = await parseLineChoice(formData.get("lineId"));
  if ("error" in choice) return choice;

  await db
  const active = formData.get("active") === "on";
  const [updated] = await db
    .update(vehicles)
    .set({ label, lineId: choice.lineId, active })
    .where(eq(vehicles.id, id))
    .returning({ externalId: vehicles.externalId });

  revalidatePath("/admin/cadastros");
  if (updated) {
    await recordAudit(admin, "vehicle.update", `Veículo ${updated.externalId} atualizado`, {
      label,
      lineId: choice.lineId,
      active,
    });
  }
  return { ok: true };
}

export async function deleteVehicleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = toId(formData.get("id"));
  if (!id) return;

  const [removed] = await db
    .delete(vehicles)
    .where(eq(vehicles.id, id))
    .returning({ externalId: vehicles.externalId, label: vehicles.label });
  revalidatePath("/admin/cadastros");
  if (removed) {
    await recordAudit(
      admin,
      "vehicle.delete",
      `Veículo ${removed.externalId} excluído (${removed.label})`
    );
  }
}