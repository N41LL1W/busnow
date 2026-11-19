import { and, asc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { notices, siteSettings } from "@/db/settings-schema";

export type SiteSettings = {
  serviceName: string;
  cityName: string;
  stateCode: string;
  tagline: string;
  primaryColor: string;
  hasLogo: boolean;
  logoVersion: number;
  contactPhone: string;
  contactEmail: string;
  contactSite: string;
  contactHours: string;
  contactAddress: string;
  aboutText: string;
  showPoweredBy: boolean;
};

// Usado enquanto o painel ainda não foi preenchido
export const DEFAULT_SETTINGS: SiteSettings = {
  serviceName: "BusNow",
  cityName: "",
  stateCode: "",
  tagline: "Acompanhe os ônibus em tempo real",
  primaryColor: "#2563eb",
  hasLogo: false,
  logoVersion: 0,
  contactPhone: "",
  contactEmail: "",
  contactSite: "",
  contactHours: "",
  contactAddress: "",
  aboutText: "",
  showPoweredBy: true,
};

// Lê direto do banco, sem cache (o painel usa esta)
export async function readSettings(): Promise<SiteSettings> {
  const [row] = await db
    .select({
      serviceName: siteSettings.serviceName,
      cityName: siteSettings.cityName,
      stateCode: siteSettings.stateCode,
      tagline: siteSettings.tagline,
      primaryColor: siteSettings.primaryColor,
      hasLogo: sql<boolean>`${siteSettings.logoBase64} is not null`.as("has_logo"),
      logoVersion: siteSettings.logoVersion,
      contactPhone: siteSettings.contactPhone,
      contactEmail: siteSettings.contactEmail,
      contactSite: siteSettings.contactSite,
      contactHours: siteSettings.contactHours,
      contactAddress: siteSettings.contactAddress,
      aboutText: siteSettings.aboutText,
      showPoweredBy: siteSettings.showPoweredBy,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  return row ?? DEFAULT_SETTINGS;
}

// A versão pública: em cache, invalidada pela etiqueta "settings" quando o
// admin salva. É isso que deixa o app rápido sem consultar o banco a cada visita.
export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("minutes");

  return readSettings();
}

export type PublicNotice = {
  id: number;
  message: string;
  severity: "info" | "warning" | "critical";
};

// Avisos que estão no ar agora (ativos e dentro do período). Também em cache,
// com a etiqueta "notices"; um aviso que vence some em até cerca de 1 minuto.
export async function getActiveNotices(): Promise<PublicNotice[]> {
  "use cache";
  cacheTag("notices");
  cacheLife("minutes");

  return db
    .select({
      id: notices.id,
      message: notices.message,
      severity: notices.severity,
    })
    .from(notices)
    .where(
      and(
        eq(notices.active, true),
        lte(notices.startsAt, sql`now()`),
        or(isNull(notices.endsAt), gt(notices.endsAt, sql`now()`))
      )
    )
    .orderBy(asc(notices.startsAt));
}