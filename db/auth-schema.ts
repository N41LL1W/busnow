import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Quem pode entrar no painel
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // sempre em minúsculas
  name: text("name").notNull(),
  // Nunca guardamos a senha: só a "impressão" dela (scrypt)
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  // Proteção contra tentativas de adivinhar a senha
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Acessos em andamento. O cookie do navegador guarda um código sorteado, e
// aqui fica só a impressão dele: quem lê o banco não consegue entrar.
export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});