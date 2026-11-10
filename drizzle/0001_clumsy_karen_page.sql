CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"label" text NOT NULL,
	"line_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "vehicles_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE set null ON UPDATE no action;