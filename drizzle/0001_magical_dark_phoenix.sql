CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'qris');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid');--> statement-breakpoint
CREATE TABLE "cash_register" (
	"id" serial PRIMARY KEY NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "cash_register_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" text NOT NULL,
	"order_id" integer,
	"description" text NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount_paid" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "change_given" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "cash_register_transactions" ADD CONSTRAINT "cash_register_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;