CREATE TABLE "wa_promo_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wa_promo_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"customer_id" integer,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"sent_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "wa_promo_recipients" ADD CONSTRAINT "wa_promo_recipients_campaign_id_wa_promo_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."wa_promo_campaigns"("id") ON DELETE cascade ON UPDATE no action;