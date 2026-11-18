"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notices, siteSettings } from "@/db/settings-schema";
import { getCurrentAdmin } from "@/lib/auth";
import { isHexColor, isSafeWebsite } from "@/lib/settings";
import type { FormState } from "./form-state";

const MAX_LOGO_BYTES = 300 * 1024;
const SEVERITIES = ["info", "warning", "critical"] as const;
type Severity = (typeof SEVERITIES)[number];

// Descobre o tipo da imagem pelo CONTEÚDO (os primeiros bytes do arquivo),
// e não pelo nome ou pelo tipo que o navegador declarou: esses dois podem mentir
function detectImageType(
  bytes: Uint8Array
): "image/png" | "image/jpeg" | "image/webp" | null {
  const startsWith = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  // WebP: "RIFF", 4 bytes de tamanho e "WEBP"
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

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

export async function saveAppearanceAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Sua sessão expirou. Entre de novo." };

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const serviceName = text("serviceName");
  const cityName = text("cityName");
  const primaryColor = text("primaryColor").toLowerCase();
  const phone = text("phone");
  const email = text("email");
  const website = text("website");
  const about = text("about");

  if (!serviceName || serviceName.length > 40) {
    return { error: "O nome do serviço precisa ter de 1 a 40 caracteres." };
  }
  if (!cityName || cityName.length > 60) {
    return { error: "O nome da cidade precisa ter de 1 a 60 caracteres." };
  }
  if (!isHexColor(primaryColor)) {
    return { error: "Escolha uma cor válida." };
  }
  if (phone && !/^[0-9+()\-\s]{6,30}$/.test(phone)) {
    return { error: "Telefone inválido. Use só números, espaços, parênteses, + e -." };
  }
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: "E-mail inválido." };
  }
  if (website && (website.length > 200 || !isSafeWebsite(website))) {
    return { error: "O site precisa começar com http:// ou https://." };
  }
  if (about.length > 1500) {
    return { error: "O texto sobre o serviço pode ter até 1500 caracteres." };
  }

  // Logotipo (opcional): sem arquivo escolhido, o navegador manda um vazio
  let logo: { data: string; type: string } | null = null;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_LOGO_BYTES) {
      return { error: "O logotipo pode ter no máximo 300 KB." };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return { error: "O logotipo precisa ser PNG, JPG ou WebP." };
    logo = { data: Buffer.from(bytes).toString("base64"), type };
  }

  const values = {
    serviceName,
    cityName,
    primaryColor,
    phone: phone || null,
    email: email || null,
    website: website || null,
    about: about || null,
  };

  // Cria a configuração na primeira vez e atualiza nas seguintes
  await db
    .insert(siteSettings)
    .values({
      id: 1,
      ...values,
      ...(logo ? { logoData: logo.data, logoType: logo.type, logoVersion: 1 } : {}),
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        ...values,
        updatedAt: new Date(),
        ...(logo
          ? {
              logoData: logo.data,
              logoType: logo.type,
              logoVersion: sql`${siteSettings.logoVersion} + 1`,
            }
          : {}),
      },
    });

  revalidatePath("/admin/aparencia");
  return { ok: true };
}

export async function removeLogoAction() {
  const admin = await getCurrentAdmin();
  if (!admin) return;

  await db
    .update(siteSettings)
    .set({
      logoData: null,
      logoType: null,
      logoVersion: sql`${siteSettings.logoVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, 1));

  revalidatePath("/admin/aparencia");
}

export async function createNoticeAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Sua sessão expirou. Entre de novo." };

  const message = String(formData.get("message") ?? "").trim();
  const severity = String(formData.get("severity") ?? "");
  const startsOn = String(formData.get("startsOn") ?? "");
  const endsOn = String(formData.get("endsOn") ?? "");

  if (!message || message.length > 200) {
    return { error: "A mensagem precisa ter de 1 a 200 caracteres." };
  }
  if (!SEVERITIES.includes(severity as Severity)) {
    return { error: "Escolha o tipo do aviso." };
  }
  if (!isRealDate(startsOn) || !isRealDate(endsOn)) {
    return { error: "Informe as datas de início e de fim." };
  }
  // Datas no formato AAAA-MM-DD se comparam bem como texto
  if (endsOn < startsOn) {
    return { error: "A data de fim não pode ser antes da data de início." };
  }

  await db.insert(notices).values({
    message,
    severity: severity as Severity,
    startsOn,
    endsOn,
    createdBy: admin.name,
  });

  revalidatePath("/admin/avisos");
  return { ok: true };
}

export async function deleteNoticeAction(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) return;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await db.delete(notices).where(eq(notices.id, id));
  revalidatePath("/admin/avisos");
}