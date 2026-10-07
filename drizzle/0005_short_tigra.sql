CREATE TABLE "clothing_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clothing_items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "order_clothing_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"clothing_item_id" integer,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_clothing_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"clothing_item_id" integer NOT NULL,
	CONSTRAINT "service_clothing_items_pair" UNIQUE("service_id","clothing_item_id")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "clothes_count_mode" text;--> statement-breakpoint
ALTER TABLE "order_clothing_counts" ADD CONSTRAINT "order_clothing_counts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_clothing_counts" ADD CONSTRAINT "order_clothing_counts_clothing_item_id_clothing_items_id_fk" FOREIGN KEY ("clothing_item_id") REFERENCES "public"."clothing_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_clothing_items" ADD CONSTRAINT "service_clothing_items_service_id_service_pricing_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_pricing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_clothing_items" ADD CONSTRAINT "service_clothing_items_clothing_item_id_clothing_items_id_fk" FOREIGN KEY ("clothing_item_id") REFERENCES "public"."clothing_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Seed (hand-added): the clothing items staff count at drop-off. Admin-editable
-- afterwards on the Services page.
INSERT INTO "clothing_items" ("name", "sort_order") VALUES
	('Baju', 1), ('Celana', 2), ('Dalaman', 3), ('Kaos Kaki', 4), ('Jaket', 5),
	('Selimut', 6), ('Bedcover', 7), ('Jas', 8), ('Dress', 9), ('Sepatu', 10),
	('Helm', 11), ('Boneka', 12), ('Tas', 13)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
-- Seed (hand-added): which items each existing service counts, matched on the
-- (Tetum) service name — Hamaran = wash & dry, Estrika = iron, Kolsa/Lensol/Tolha
-- = blanket/sheet/towel, Sapatu = shoes, Pasta = bag, Ropa Laran = underwear,
-- Vestidu = dress, Kazaku = coat/suit, Farda = uniform.
INSERT INTO "service_clothing_items" ("service_id", "clothing_item_id")
SELECT s."id", c."id"
FROM "service_pricing" s
JOIN "clothing_items" c ON (
	   (s."name" ~* 'sapatu'             AND c."name" = 'Sepatu')
	OR (s."name" ~* 'helm'               AND c."name" = 'Helm')
	OR (s."name" ~* 'boneka'             AND c."name" = 'Boneka')
	OR (s."name" ~* 'pasta'              AND c."name" = 'Tas')
	OR (s."name" ~* 'ropa laran'         AND c."name" = 'Dalaman')
	OR (s."name" ~* 'kolsa|lensol|tolha' AND c."name" IN ('Selimut', 'Bedcover'))
	OR (s."name" ~* 'vestidu'            AND c."name" = 'Dress')
	OR (s."name" ~* 'kazaku'             AND c."name" = 'Jas')
	OR (s."name" ~* 'jaket'              AND c."name" = 'Jaket')
	OR (s."name" ~* 'farda'              AND c."name" IN ('Baju', 'Celana'))
	OR (s."name" ~* 'ropa noda'          AND c."name" IN ('Baju', 'Celana', 'Dress'))
	OR (s."name" ~* '^estrika'           AND c."name" IN ('Baju', 'Celana', 'Jaket', 'Jas', 'Dress'))
	OR (s."name" ~* 'hamaran'            AND c."name" IN ('Baju', 'Celana', 'Dalaman', 'Kaos Kaki', 'Jaket', 'Jas', 'Dress'))
)
ON CONFLICT ON CONSTRAINT "service_clothing_items_pair" DO NOTHING;