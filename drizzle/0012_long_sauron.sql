CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"admin_id" integer,
	"admin_name" text NOT NULL,
	"admin_email" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb
);
