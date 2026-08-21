CREATE TABLE "order_special_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"description" text NOT NULL,
	"price_adjustment" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_pricing" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_special_requests" ADD CONSTRAINT "order_special_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;