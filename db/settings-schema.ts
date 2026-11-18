import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Gravidade de um aviso (muda a cor da faixa)
export const noticeSeverity = pgEnum("notice_severity", [
  "info",
  "warning",
  "critical",
]);

// Configuração do serviço. Existe UMA linha só (id = 1): quem entra em
// outra cidade vê outra identidade só trocando estes campos.
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey(), // sempre 1
  serviceName: text("service_name").notNull().default("BusNow"),
  cityName: text("city_name").notNull().default("Brodowski"),
  primaryColor: text("primary_color").notNull().default("#2563eb"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  about: text("about"),
  // Logotipo guardado no próprio banco (PNG, JPG ou WebP, até 300 KB),
  // em base64. logoVersion sobe a cada troca, para o navegador pegar a nova.
  logoData: text("logo_data"),
  logoType: text("logo_type"),
  logoVersion: integer("logo_version").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Avisos de serviço, com período de exibição (datas de Brasília)
export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  severity: noticeSeverity("severity").notNull().default("info"),
  startsOn: date("starts_on").notNull(), // "2026-11-20"
  endsOn: date("ends_on").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});