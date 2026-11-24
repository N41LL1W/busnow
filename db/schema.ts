import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  time,
  date,
  timestamp,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Tipo de dia: o horário muda entre dia útil, sábado e domingo/feriado
export const dayType = pgEnum("day_type", ["weekday", "saturday", "sunday"]);

// Tipo de ponto do trajeto:
//   stop     = parada onde o passageiro embarca (aparece para todos)
//   waypoint = "curva": ponto invisível ao público, só para desenhar o caminho
export const stopKind = pgEnum("stop_kind", ["stop", "waypoint"]);

// Linhas (ex.: Circular 1)
export const lines = pgTable("lines", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#2563eb"),
  active: boolean("active").notNull().default(true),
  // Minutos que o ônibus leva para completar a volta e chegar de novo ao
  // terminal (ex.: 59). null = ainda não informado.
  tripMinutes: integer("trip_minutes"),
  // Traçado pelas ruas, gerado no painel: lista de [latitude, longitude].
  // null = ainda não gerado (o mapa liga os pontos em linha reta).
  geometry: jsonb("geometry").$type<[number, number][]>(),
  // "Impressão digital" dos pontos usados para gerar o traçado. Se os pontos
  // mudarem depois, ela deixa de bater e o painel avisa que está desatualizado.
  geometryHash: text("geometry_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Pontos do trajeto: paradas e curvas (veja "kind")
// confirmed = alguém conferiu a posição no mapa
export const stops = pgTable("stops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  kind: stopKind("kind").notNull().default("stop"),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Ordem dos pontos (paradas e curvas) em cada linha e sentido.
// O painel mantém "position" sempre como 1, 2, 3...
// offsetMinutes = minutos depois da saída do terminal em que o ônibus
// passa neste ponto (horário do ponto = saída + offsetMinutes)
export const lineStops = pgTable("line_stops", {
  id: serial("id").primaryKey(),
  lineId: integer("line_id")
    .notNull()
    .references(() => lines.id, { onDelete: "cascade" }),
  stopId: integer("stop_id")
    .notNull()
    .references(() => stops.id, { onDelete: "cascade" }),
  direction: integer("direction").notNull().default(0), // 0 = ida, 1 = volta
  position: integer("position").notNull(), // 1, 2, 3...
  offsetMinutes: integer("offset_minutes").notNull().default(0),
});

// Horários de saída do ponto inicial
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  lineId: integer("line_id")
    .notNull()
    .references(() => lines.id, { onDelete: "cascade" }),
  direction: integer("direction").notNull().default(0),
  dayType: dayType("day_type").notNull(),
  departureTime: time("departure_time").notNull(),
});

// Feriados: nesses dias valem os horários de outro tipo de dia
// (normalmente domingo). A data é sempre única.
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull().unique(), // "2026-11-20"
  name: text("name").notNull(),
  treatAs: dayType("treat_as").notNull().default("sunday"),
});

// Veículos da frota
// externalId = o identificador do veículo no sistema da empresa de rastreio
// (é ele que liga a posição que chega da API a uma linha do nosso sistema)
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  label: text("label").notNull(),
  lineId: integer("line_id").references(() => lines.id, {
    onDelete: "set null",
  }),
  active: boolean("active").notNull().default(true),
});

// Relações (permitem consultas encadeadas depois)
export const linesRelations = relations(lines, ({ many }) => ({
  lineStops: many(lineStops),
  schedules: many(schedules),
  vehicles: many(vehicles),
}));

export const stopsRelations = relations(stops, ({ many }) => ({
  lineStops: many(lineStops),
}));

export const lineStopsRelations = relations(lineStops, ({ one }) => ({
  line: one(lines, { fields: [lineStops.lineId], references: [lines.id] }),
  stop: one(stops, { fields: [lineStops.stopId], references: [stops.id] }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  line: one(lines, { fields: [schedules.lineId], references: [lines.id] }),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  line: one(lines, { fields: [vehicles.lineId], references: [lines.id] }),
}));