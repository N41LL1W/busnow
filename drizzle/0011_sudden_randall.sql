CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"treat_as" "day_type" DEFAULT 'sunday' NOT NULL,
	CONSTRAINT "holidays_date_unique" UNIQUE("date")
);
