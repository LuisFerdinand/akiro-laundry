ALTER TABLE "receipt_settings" ADD COLUMN "font_size" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_settings" ADD COLUMN "divider_char" text DEFAULT '-' NOT NULL;