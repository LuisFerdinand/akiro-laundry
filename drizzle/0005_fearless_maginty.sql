CREATE TYPE "public"."cms_section_type" AS ENUM('hero', 'services', 'how_it_works', 'testimonials', 'cta', 'contact', 'navbar', 'footer');--> statement-breakpoint
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
ALTER TABLE "cms_footer_links" ADD CONSTRAINT "cms_footer_links_footer_id_cms_footer_id_fk" FOREIGN KEY ("footer_id") REFERENCES "public"."cms_footer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_hero_stats" ADD CONSTRAINT "cms_hero_stats_hero_id_cms_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."cms_hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_how_it_works_steps" ADD CONSTRAINT "cms_how_it_works_steps_section_id_cms_how_it_works_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_how_it_works_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_nav_links" ADD CONSTRAINT "cms_nav_links_navbar_id_cms_navbar_id_fk" FOREIGN KEY ("navbar_id") REFERENCES "public"."cms_navbar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_service_cards" ADD CONSTRAINT "cms_service_cards_section_id_cms_services_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_services_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_testimonials" ADD CONSTRAINT "cms_testimonials_section_id_cms_testimonials_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_testimonials_section"("id") ON DELETE cascade ON UPDATE no action;