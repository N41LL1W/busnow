CREATE TYPE "public"."stop_kind" AS ENUM('stop', 'waypoint');--> statement-breakpoint
DROP INDEX "line_stops_unique";--> statement-breakpoint
ALTER TABLE "stops" ADD COLUMN "kind" "stop_kind" DEFAULT 'stop' NOT NULL;--> statement-breakpoint
ALTER TABLE "stops" ADD COLUMN "confirmed" boolean DEFAULT false NOT NULL;