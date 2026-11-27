import type { SiteSettings } from "@/lib/settings";

// Data da última revisão dos textos legais. Atualize ao mudar qualquer um.
export const LEGAL_UPDATED_AT = "27 de novembro de 2026";

// Nome do órgão responsável pelo serviço, para usar nos textos.
// Sem cidade preenchida no painel, usa uma expressão neutra.
export function responsibleName(settings: SiteSettings): string {
  return settings.cityName
    ? `o Município de ${settings.cityName}${settings.stateCode ? ` (${settings.stateCode})` : ""}`
    : "o órgão público responsável por este serviço";
}

// Canal de contato mostrado nos textos: e-mail do painel, se houver.
export function contactChannel(settings: SiteSettings): string {
  if (settings.contactEmail) return settings.contactEmail;
  return "os canais de contato indicados na página Sobre";
}