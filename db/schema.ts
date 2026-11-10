import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  time,
  timestamp,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Tipo de dia: o horário muda entre dia útil, sábado e domingo/feriado
export const dayType = pgEnum("day_type", ["weekday", "saturday", "sunday"]);

// Linhas (ex.: Circular 1)
export const lines = pgTable("lines", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#2563eb"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Paradas (pontos de ônibus)
export const stops = pgTable("stops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Ordem das paradas em cada linha e sentido
export const lineStops = pgTable(
  "line_stops",
  {
    id: serial("id").primaryKey(),
    lineId: integer("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    stopId: integer("stop_id")
      .notNull()
      .references(() => stops.id, { onDelete: "cascade" }),
    direction: integer("direction").notNull().default(0), // 0 = ida, 1 = volta
    position: integer("position").notNull(), // 1, 2, 3...
  },
  (t) => [
    uniqueIndex("line_stops_unique").on(t.lineId, t.direction, t.position),
  ]
);

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

// Relações (permitem consultas encadeadas depois)
export const linesRelations = relations(lines, ({ many }) => ({
  lineStops: many(lineStops),
  schedules: many(schedules),
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