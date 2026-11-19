import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Configurações do serviço. Só existe UMA linha (id = 1): cada instalação
// atende uma cidade.
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey(),
  serviceName: text("service_name").notNull().default("BusNow"),
  cityName: text("city_name").notNull().default(""),
  stateCode: text("state_code").notNull().default(""),
  tagline: text("tagline")
    .notNull()
    .default("Acompanhe os ônibus em tempo real"),
  primaryColor: text("primary_color").notNull().default("#2563eb"),
  // Logotipo guardado no próprio banco (em base64), servido por /api/logo.
  // logoVersion sobe a cada troca, para os navegadores baixarem o novo.
  logoBase64: text("logo_base64"),
  logoType: text("logo_type"),
  logoVersion: integer("logo_version").notNull().default(0),
  contactPhone: text("contact_phone").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  contactSite: text("contact_site").notNull().default(""),
  contactHours: text("contact_hours").notNull().default(""),
  contactAddress: text("contact_address").notNull().default(""),
  aboutText: text("about_text").notNull().default(""),
  showPoweredBy: boolean("show_powered_by").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Avisos de serviço: faixas no topo do app, com período
export const noticeSeverity = pgEnum("notice_severity", [
  "info",
  "warning",
  "critical",
]);

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  severity: noticeSeverity("severity").notNull().default("info"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"), // null = até alguém desativar ou excluir
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});