CREATE TYPE "public"."transaction_direction" AS ENUM('income', 'outcome');--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#64748b',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "cash_register_transactions" ADD COLUMN "direction" "transaction_direction" DEFAULT 'income' NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_register_transactions" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "cash_register_transactions" ADD CONSTRAINT "cash_register_transactions_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;