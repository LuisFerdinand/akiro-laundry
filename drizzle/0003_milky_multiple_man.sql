CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"service_pricing_id" integer NOT NULL,
	"weight_kg" numeric(6, 2),
	"quantity" integer,
	"soap_id" integer,
	"pewangi_id" integer,
	"base_price_per_kg" numeric(10, 2) NOT NULL,
	"soap_cost" numeric(10, 2) DEFAULT '0',
	"pewangi_cost" numeric(10, 2) DEFAULT '0',
	"subtotal" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_soap_id_soaps_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_pewangi_id_pewangi_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_service_pricing_id_service_pricing_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_pricing_id_service_pricing_id_fk" FOREIGN KEY ("service_pricing_id") REFERENCES "public"."service_pricing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_soap_id_soaps_id_fk" FOREIGN KEY ("soap_id") REFERENCES "public"."soaps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_pewangi_id_pewangi_id_fk" FOREIGN KEY ("pewangi_id") REFERENCES "public"."pewangi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "weight_kg";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "soap_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "pewangi_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "service_pricing_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "base_price_per_kg";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "soap_cost";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "pewangi_cost";