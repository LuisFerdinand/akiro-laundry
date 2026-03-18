CREATE TYPE "public"."cms_gallery_image_size" AS ENUM('square', 'tall', 'wide');--> statement-breakpoint
ALTER TYPE "public"."cms_section_type" ADD VALUE 'gallery' BEFORE 'testimonials';--> statement-breakpoint
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
ALTER TABLE "cms_gallery_images" ADD CONSTRAINT "cms_gallery_images_section_id_cms_gallery_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_gallery_section"("id") ON DELETE cascade ON UPDATE no action;