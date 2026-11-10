CREATE TYPE "public"."day_type" AS ENUM('weekday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TABLE "line_stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL,
	"stop_id" integer NOT NULL,
	"direction" integer DEFAULT 0 NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#2563eb' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lines_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL,
	"direction" integer DEFAULT 0 NOT NULL,
	"day_type" "day_type" NOT NULL,
	"departure_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "line_stops" ADD CONSTRAINT "line_stops_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_stops" ADD CONSTRAINT "line_stops_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "line_stops_unique" ON "line_stops" USING btree ("line_id","direction","position");