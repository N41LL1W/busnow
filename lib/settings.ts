import { and, asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { notices, siteSettings } from "@/db/settings-schema";

export const DEFAULTS = {
  serviceName: "BusNow",
  cityName: "Brodowski",
  primaryColor: "#2563eb",
} as const;

export type Settings = {
  serviceName: string;
  cityName: string;
  primaryColor: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  about: string | null;
  hasLogo: boolean;
  logoVersion: number;
};

// "#rrggbb", e nada além: a cor vai parar dentro de um estilo da página
export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// Escolhe texto claro ou escuro para ficar legível sobre uma cor de fundo
export function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

// Só endereços http(s): barra "javascript:" e semelhantes
export function isSafeWebsite(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// O cache() evita repetir a consulta quando várias partes da página pedem
// as configurações na mesma requisição. O logo (pesado) NÃO é carregado
// aqui: ele vem por /logo.
export const getSettings = cache(async (): Promise<Settings> => {
  const [row] = await db
    .select({
      serviceName: siteSettings.serviceName,
      cityName: siteSettings.cityName,
      primaryColor: siteSettings.primaryColor,
      phone: siteSettings.phone,
      email: siteSettings.email,
      website: siteSettings.website,
      about: siteSettings.about,
      hasLogo: sql<boolean>`${siteSettings.logoData} is not null`,
      logoVersion: siteSettings.logoVersion,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (!row) {
    return {
      ...DEFAULTS,
      phone: null,
      email: null,
      website: null,
      about: null,
      hasLogo: false,
      logoVersion: 0,
    };
  }

  return {
    ...row,
    // por garantia, uma cor inválida no banco nunca chega à página
    primaryColor: isHexColor(row.primaryColor)
      ? row.primaryColor
      : DEFAULTS.primaryColor,
  };
});

export type ActiveNotice = {
  id: number;
  message: string;
  severity: "info" | "warning" | "critical";
};

// Avisos valendo HOJE (a data é a de Brasília, calculada no próprio banco)
export async function getActiveNotices(): Promise<ActiveNotice[]> {
  const today = sql`(now() at time zone 'America/Sao_Paulo')::date`;

  return db
    .select({
      id: notices.id,
      message: notices.message,
      severity: notices.severity,
    })
    .from(notices)
    .where(and(sql`${notices.startsOn} <= ${today}`, sql`${notices.endsOn} >= ${today}`))
    .orderBy(asc(notices.id));
}