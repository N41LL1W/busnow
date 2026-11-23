-- A migração 0009 só renomeou colunas; não mudou os TIPOS. Aqui acertamos.

-- notices: datas viram timestamp, término passa a ser opcional
ALTER TABLE "notices" ALTER COLUMN "starts_at" SET DATA TYPE timestamp USING "starts_at"::timestamp;--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "ends_at" SET DATA TYPE timestamp USING "ends_at"::timestamp;--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "ends_at" DROP NOT NULL;--> statement-breakpoint

-- notices.active era o antigo "created_by" (texto): recria como boolean
ALTER TABLE "notices" DROP COLUMN "active";--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint

-- site_settings: contatos deixam de aceitar NULL
UPDATE "site_settings" SET "contact_phone" = '' WHERE "contact_phone" IS NULL;--> statement-breakpoint
UPDATE "site_settings" SET "contact_email" = '' WHERE "contact_email" IS NULL;--> statement-breakpoint
UPDATE "site_settings" SET "contact_site" = '' WHERE "contact_site" IS NULL;--> statement-breakpoint
UPDATE "site_settings" SET "about_text" = '' WHERE "about_text" IS NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "contact_phone" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "contact_phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "contact_email" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "contact_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "contact_site" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "contact_site" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "about_text" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "about_text" SET NOT NULL;