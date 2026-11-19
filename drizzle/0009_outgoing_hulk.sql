ALTER TABLE "notices" RENAME COLUMN "starts_on" TO "starts_at";--> statement-breakpoint
ALTER TABLE "notices" RENAME COLUMN "ends_on" TO "ends_at";--> statement-breakpoint
ALTER TABLE "notices" RENAME COLUMN "created_by" TO "active";--> statement-breakpoint
ALTER TABLE "site_settings" RENAME COLUMN "logo_data" TO "logo_base64";--> statement-breakpoint
ALTER TABLE "site_settings" RENAME COLUMN "phone" TO "contact_phone";--> statement-breakpoint
ALTER TABLE "site_settings" RENAME COLUMN "email" TO "contact_email";--> statement-breakpoint
ALTER TABLE "site_settings" RENAME COLUMN "website" TO "contact_site";--> statement-breakpoint
ALTER TABLE "site_settings" RENAME COLUMN "about" TO "about_text";--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "city_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "state_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "tagline" text DEFAULT 'Acompanhe os ônibus em tempo real' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "contact_hours" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "contact_address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "show_powered_by" boolean DEFAULT true NOT NULL;