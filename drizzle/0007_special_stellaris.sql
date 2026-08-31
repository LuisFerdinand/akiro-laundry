CREATE TABLE "finance_pie_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot" integer NOT NULL,
	"title" text NOT NULL,
	"category_keys" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "finance_pie_configs_slot_unique" UNIQUE("slot")
);
--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "kind" text DEFAULT 'expense' NOT NULL;