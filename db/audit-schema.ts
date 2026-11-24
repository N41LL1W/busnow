import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Registro de auditoria: quem fez o quê e quando no painel.
// Só se acrescenta; o painel nunca edita nem apaga estas linhas.
// adminName e adminEmail são uma "foto" do momento: continuam certos mesmo se
// a pessoa mudar de nome ou for desativada depois.
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  adminId: integer("admin_id"),
  adminName: text("admin_name").notNull(),
  adminEmail: text("admin_email").notNull(),
  // "area.acao", por exemplo "line.update" ou "holiday.create"
  action: text("action").notNull(),
  // Frase pronta para ler: "Linha C1: nome alterado"
  summary: text("summary").notNull(),
  // Detalhes técnicos (valores novos, números). NUNCA senhas nem arquivos.
  details: jsonb("details").$type<Record<string, unknown>>(),
});