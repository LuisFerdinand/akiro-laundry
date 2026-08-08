ALTER TABLE "wa_template_settings" ADD COLUMN "greeting_morning" text DEFAULT 'Bondia' NOT NULL;--> statement-breakpoint
ALTER TABLE "wa_template_settings" ADD COLUMN "greeting_afternoon" text DEFAULT 'Botarde' NOT NULL;--> statement-breakpoint
ALTER TABLE "wa_template_settings" ADD COLUMN "greeting_evening" text DEFAULT 'Bonoite' NOT NULL;