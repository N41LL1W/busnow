CREATE TYPE "public"."notice_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"severity" "notice_severity" DEFAULT 'info' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"service_name" text DEFAULT 'BusNow' NOT NULL,
	"city_name" text DEFAULT 'Brodowski' NOT NULL,
	"primary_color" text DEFAULT '#2563eb' NOT NULL,
	"phone" text,
	"email" text,
	"website" text,
	"about" text,
	"logo_data" text,
	"logo_type" text,
	"logo_version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
