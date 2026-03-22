CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'done', 'picked_up');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'qris');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."transaction_direction" AS ENUM('income', 'outcome');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'employee', 'user');--> statement-breakpoint
CREATE TYPE "public"."cms_gallery_image_size" AS ENUM('square', 'tall', 'wide');--> statement-breakpoint
CREATE TYPE "public"."cms_section_type" AS ENUM('hero', 'services', 'how_it_works', 'gallery', 'testimonials', 'cta', 'contact', 'navbar', 'footer');--> statement-breakpoint
CREATE TABLE "cash_register" (
	"id" serial PRIMARY KEY NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "cash_register_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"direction" "transaction_direction" DEFAULT 'income' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" text NOT NULL,
	"category_id" integer,
	"order_id" integer,
	"description" text NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#64748b',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
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
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" integer NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_method" "payment_method",
	"amount_paid" numeric(10, 2),
	"change_given" numeric(10, 2),
	"paid_at" timestamp,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"estimated_done_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "pewangi" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"price_per_kg" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" "user_role" NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "service_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_price_per_kg" numeric(10, 2) NOT NULL,
	"category" text DEFAULT 'package' NOT NULL,
	"pricing_unit" text DEFAULT 'per_kg' NOT NULL,
	"minimum_kg" text,
	"duration" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"price_per_kg" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "cms_contact_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"href" text,
	"icon_url" text,
	"icon_type" text DEFAULT 'phone' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_cta_section" (
	"id" serial PRIMARY KEY NOT NULL,
	"badge" text DEFAULT 'Ready to Get Started?' NOT NULL,
	"headline" text NOT NULL,
	"headline_accent" text NOT NULL,
	"subtext" text NOT NULL,
	"primary_cta_label" text DEFAULT 'Call Now' NOT NULL,
	"primary_cta_href" text DEFAULT 'tel:+67077230001' NOT NULL,
	"secondary_cta_label" text DEFAULT 'WhatsApp' NOT NULL,
	"secondary_cta_href" text DEFAULT 'https://wa.me/67077230001' NOT NULL,
	"bg_image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_footer" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_name" text DEFAULT 'Akiro Laundry' NOT NULL,
	"tagline" text,
	"logo_url" text,
	"logo_alt" text DEFAULT 'Akiro Laundry',
	"copyright_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_footer_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"footer_id" integer NOT NULL,
	"column" text NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"icon_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_gallery_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text NOT NULL,
	"caption" text,
	"size_hint" "cms_gallery_image_size" DEFAULT 'square' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_gallery_section" (
	"id" serial PRIMARY KEY NOT NULL,
	"badge" text DEFAULT 'Our Facility' NOT NULL,
	"headline" text DEFAULT 'A Glimpse Inside Akiro' NOT NULL,
	"subtext" text DEFAULT 'Clean space, professional care — see where the magic happens.' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_hero" (
	"id" serial PRIMARY KEY NOT NULL,
	"badge" text DEFAULT 'Open Today · 08:00 – 20:00' NOT NULL,
	"headline" text NOT NULL,
	"headline_accent" text NOT NULL,
	"headline_suffix" text NOT NULL,
	"subtext" text NOT NULL,
	"primary_cta_label" text DEFAULT 'Order a Pickup' NOT NULL,
	"primary_cta_href" text DEFAULT '#contact' NOT NULL,
	"secondary_cta_label" text DEFAULT 'View Services' NOT NULL,
	"secondary_cta_href" text DEFAULT '#services' NOT NULL,
	"hero_image_url" text,
	"hero_image_alt" text DEFAULT 'Laundry service illustration',
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_hero_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"hero_id" integer NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_how_it_works_section" (
	"id" serial PRIMARY KEY NOT NULL,
	"badge" text DEFAULT 'Simple Process' NOT NULL,
	"headline" text DEFAULT 'Laundry Done in 4 Easy Steps' NOT NULL,
	"subtext" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_how_it_works_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"step_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"image_alt" text,
	"accent_color" text DEFAULT '#1a7fba' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"url" text NOT NULL,
	"optimized_url" text,
	"folder" text,
	"file_name" text NOT NULL,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"alt_text" text,
	"caption" text,
	"metadata" jsonb,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_media_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "cms_nav_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"navbar_id" integer NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_navbar" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_name" text DEFAULT 'Akiro Laundry' NOT NULL,
	"logo_url" text,
	"logo_alt" text DEFAULT 'Akiro Laundry logo',
	"cta_label" text DEFAULT 'Book Now' NOT NULL,
	"cta_href" text DEFAULT '#contact' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_seo_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_title" text DEFAULT 'Akiro Laundry & Perfume' NOT NULL,
	"title_template" text DEFAULT '%s | Akiro Laundry' NOT NULL,
	"meta_description" text DEFAULT 'Premium laundry service in Timor-Leste. Open every day 08:00–20:00.' NOT NULL,
	"meta_keywords" text,
	"canonical_url" text,
	"og_title" text,
	"og_description" text,
	"og_image_url" text,
	"og_image_alt" text,
	"og_type" text DEFAULT 'website' NOT NULL,
	"og_locale" text DEFAULT 'pt_TL' NOT NULL,
	"twitter_card" text DEFAULT 'summary_large_image' NOT NULL,
	"twitter_site" text,
	"twitter_creator" text,
	"google_verification" text,
	"fb_app_id" text,
	"robots_index" boolean DEFAULT true NOT NULL,
	"robots_follow" boolean DEFAULT true NOT NULL,
	"json_ld" text,
	"head_scripts" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_service_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" text NOT NULL,
	"image_url" text,
	"image_alt" text,
	"accent_color" text DEFAULT '#1a7fba' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_services_section" (
	"id" serial PRIMARY KEY NOT NULL,
	"badge" text DEFAULT 'What We Offer' NOT NULL,
	"headline" text DEFAULT 'Every Fabric, Every Need' NOT NULL,
	"subtext" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "cms_testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"author_name" text NOT NULL,
	"author_role" text NOT NULL,
	"avatar_url" text,
	"avatar_alt" text,
	"initials" text NOT NULL,
	"accent_color" text DEFAULT '#1a7fba' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_testimonials_section" (
	"id" serial PRIMARY KEY NOT NULL,
	"badge" text DEFAULT 'Customer Love' NOT NULL,
	"headline" text DEFAULT 'Trusted by Thousands' NOT NULL,
	"subtext" text NOT NULL,
	"aggregate_rating" text DEFAULT '4.9' NOT NULL,
	"review_count" text DEFAULT '2,400+' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_register_transactions" ADD CONSTRAINT "cash_register_transactions_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_register_transactions" ADD CONSTRAINT "cash_register_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_pricing_id_service_pricing_id_fk" FOREIGN KEY ("service_pricing_id") REFERENCES "public"."service_pricing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_soap_id_soaps_id_fk" FOREIGN KEY ("soap_id") REFERENCES "public"."soaps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_pewangi_id_pewangi_id_fk" FOREIGN KEY ("pewangi_id") REFERENCES "public"."pewangi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_footer_links" ADD CONSTRAINT "cms_footer_links_footer_id_cms_footer_id_fk" FOREIGN KEY ("footer_id") REFERENCES "public"."cms_footer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_gallery_images" ADD CONSTRAINT "cms_gallery_images_section_id_cms_gallery_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_gallery_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_hero_stats" ADD CONSTRAINT "cms_hero_stats_hero_id_cms_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."cms_hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_how_it_works_steps" ADD CONSTRAINT "cms_how_it_works_steps_section_id_cms_how_it_works_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_how_it_works_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_nav_links" ADD CONSTRAINT "cms_nav_links_navbar_id_cms_navbar_id_fk" FOREIGN KEY ("navbar_id") REFERENCES "public"."cms_navbar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_service_cards" ADD CONSTRAINT "cms_service_cards_section_id_cms_services_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_services_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_testimonials" ADD CONSTRAINT "cms_testimonials_section_id_cms_testimonials_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_testimonials_section"("id") ON DELETE cascade ON UPDATE no action;