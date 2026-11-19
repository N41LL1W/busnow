"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { siteSettings } from "@/db/settings-schema";
import { requireAdmin } from "@/lib/admin-guard";
import { contrastWithWhite, isHexColor, MIN_CONTRAST } from "@/lib/color";
import type { FormState } from "../form-state";

const MAX_LOGO_BYTES = 300 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Descobre o tipo da imagem pelos primeiros bytes. O nome do arquivo não
// vale: qualquer um pode chamar de .png o que quiser.
function detectImageType(bytes: Uint8Array): string | null {
  const startsWith = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) && // "RIFF"
    bytes[8] === 0x57 && // "WEBP"
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null; // SVG e qualquer outra coisa são recusados
}

function isHttpUrl(value: string): boolean {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const fieldsSchema = z.object({
  serviceName: z
    .string()
    .trim()
    .min(1, "Informe o nome do serviço.")
    .max(60, "Nome do serviço: no máximo 60 caracteres."),
  cityName: z.string().trim().max(60, "Cidade: no máximo 60 caracteres."),
  stateCode: z
    .string()
    .trim()
    .refine((value) => /^[A-Za-z]{0,2}$/.test(value), "UF: use 2 letras (ex.: SP)."),
  tagline: z
    .string()
    .trim()
    .max(100, "Frase de apresentação: no máximo 100 caracteres."),
  primaryColor: z.string().trim().refine(isHexColor, "Cor inválida."),
  contactPhone: z
    .string()
    .trim()
    .max(40, "Telefone: no máximo 40 caracteres.")
    .regex(/^[\d\s()+-]*$/, "Telefone: use só números, espaços, parênteses, + e -."),
  contactEmail: z
    .string()
    .trim()
    .max(120, "E-mail: no máximo 120 caracteres.")
    .refine((value) => value === "" || EMAIL.test(value), "E-mail inválido."),
  contactSite: z
    .string()
    .trim()
    .max(200, "Site: no máximo 200 caracteres.")
    .refine(isHttpUrl, "Site: informe o endereço completo, começando com https://"),
  contactHours: z
    .string()
    .trim()
    .max(120, "Horário de atendimento: no máximo 120 caracteres."),
  contactAddress: z
    .string()
    .trim()
    .max(160, "Endereço: no máximo 160 caracteres."),
  aboutText: z
    .string()
    .trim()
    .max(1000, "Texto \"Sobre\": no máximo 1000 caracteres."),
});

const FIELD_NAMES = Object.keys(fieldsSchema.shape);

export async function saveSettingsAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const raw = Object.fromEntries(
    FIELD_NAMES.map((name) => [name, String(formData.get(name) ?? "")])
  );

  const parsed = fieldsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = { ...parsed.data, stateCode: parsed.data.stateCode.toUpperCase() };

  // A cor precisa deixar o texto branco legível nos botões
  const ratio = contrastWithWhite(data.primaryColor);
  if (ratio < MIN_CONTRAST) {
    return {
      error: `Esta cor é clara demais para botões com texto branco (contraste ${ratio
        .toFixed(1)
        .replace(".", ",")}; o mínimo é ${String(MIN_CONTRAST).replace(".", ",")}). Escolha uma cor mais escura.`,
    };
  }

  // Logotipo: novo arquivo, remoção ou nenhuma mudança
  const [current] = await db
    .select({ version: siteSettings.logoVersion })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  const nextVersion = (current?.version ?? 0) + 1;

  let logoPatch: {
    logoBase64: string | null;
    logoType: string | null;
    logoVersion: number;
  } | null = null;

  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_LOGO_BYTES) {
      return { error: "O logotipo é grande demais (máximo 300 KB)." };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) {
      return { error: "Logotipo: use um arquivo PNG, JPEG ou WebP." };
    }
    logoPatch = {
      logoBase64: Buffer.from(bytes).toString("base64"),
      logoType: type,
      logoVersion: nextVersion,
    };
  } else if (formData.get("removeLogo") === "on") {
    logoPatch = { logoBase64: null, logoType: null, logoVersion: nextVersion };
  }

  const values = {
    ...data,
    showPoweredBy: formData.get("showPoweredBy") === "on",
    ...(logoPatch ?? {}),
  };

  // Só existe uma linha de configurações (id = 1): cria ou atualiza
  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { ...values, updatedAt: new Date() },
    });

  // Faz o app público mostrar a mudança na hora
  updateTag("settings");

  return { ok: true };
}