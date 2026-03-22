// lib/db/schema/cms.ts
//
// CMS schema for the public-facing landing page.
// Completely separate from the operational schema (orders, customers, etc.).
// All tables are prefixed with `cms_` to avoid any naming collision.
// Images are stored as Cloudinary public IDs / URLs.

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const cmsSectionTypeEnum = pgEnum("cms_section_type", [
  "hero",
  "services",
  "how_it_works",
  "gallery",
  "testimonials",
  "cta",
  "contact",
  "navbar",
  "footer",
]);

export const cmsGalleryImageSizeEnum = pgEnum("cms_gallery_image_size", [
  "square",
  "tall",
  "wide",
]);

// ─── Site Settings (global) ───────────────────────────────────────────────────

export const cmsSiteSettings = pgTable("cms_site_settings", {
  id:        serial("id").primaryKey(),
  key:       text("key").notNull().unique(),
  value:     text("value").notNull(),
  label:     text("label").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── SEO / Head Settings ──────────────────────────────────────────────────────
// One row — all metadata that populates <head> in layout.tsx.

export const cmsSeoSettings = pgTable("cms_seo_settings", {
  id:               serial("id").primaryKey(),

  // Basic
  siteTitle:        text("site_title").notNull().default("Akiro Laundry & Perfume"),
  titleTemplate:    text("title_template").notNull().default("%s | Akiro Laundry"),
  metaDescription:  text("meta_description").notNull().default("Premium laundry service in Timor-Leste. Open every day 08:00–20:00."),
  metaKeywords:     text("meta_keywords"),                   // comma-separated
  canonicalUrl:     text("canonical_url"),                   // e.g. https://akirolaundry.com

  // Open Graph
  ogTitle:          text("og_title"),
  ogDescription:    text("og_description"),
  ogImageUrl:       text("og_image_url"),                    // Cloudinary URL, 1200×630
  ogImageAlt:       text("og_image_alt"),
  ogType:           text("og_type").notNull().default("website"),
  ogLocale:         text("og_locale").notNull().default("pt_TL"),

  // Twitter / X card
  twitterCard:      text("twitter_card").notNull().default("summary_large_image"),
  twitterSite:      text("twitter_site"),                    // @handle
  twitterCreator:   text("twitter_creator"),

  // Verification codes (paste the full content="" value only)
  googleVerification: text("google_verification"),
  fbAppId:            text("fb_app_id"),

  // Robots
  robotsIndex:      boolean("robots_index").notNull().default(true),
  robotsFollow:     boolean("robots_follow").notNull().default(true),

  // Structured data (JSON-LD as raw string — admin pastes it in)
  jsonLd:           text("json_ld"),

  // Misc <head> injections (analytics snippets, etc.)
  headScripts:      text("head_scripts"),  // raw HTML — injected verbatim

  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

// ─── Navbar ───────────────────────────────────────────────────────────────────

export const cmsNavbar = pgTable("cms_navbar", {
  id:        serial("id").primaryKey(),
  brandName: text("brand_name").notNull().default("Akiro Laundry"),
  logoUrl:   text("logo_url"),
  logoAlt:   text("logo_alt").default("Akiro Laundry logo"),
  ctaLabel:  text("cta_label").notNull().default("Book Now"),
  ctaHref:   text("cta_href").notNull().default("#contact"),
  isActive:  boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsNavLinks = pgTable("cms_nav_links", {
  id:        serial("id").primaryKey(),
  navbarId:  integer("navbar_id").references(() => cmsNavbar.id, { onDelete: "cascade" }).notNull(),
  label:     text("label").notNull(),
  href:      text("href").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").default(true).notNull(),
});

// ─── Hero Section ─────────────────────────────────────────────────────────────

export const cmsHero = pgTable("cms_hero", {
  id:                serial("id").primaryKey(),
  badge:             text("badge").notNull().default("Open Today · 08:00 – 20:00"),
  headline:          text("headline").notNull(),
  headlineAccent:    text("headline_accent").notNull(),
  headlineSuffix:    text("headline_suffix").notNull(),
  subtext:           text("subtext").notNull(),
  primaryCtaLabel:   text("primary_cta_label").notNull().default("Order a Pickup"),
  primaryCtaHref:    text("primary_cta_href").notNull().default("#contact"),
  secondaryCtaLabel: text("secondary_cta_label").notNull().default("View Services"),
  secondaryCtaHref:  text("secondary_cta_href").notNull().default("#services"),
  heroImageUrl:      text("hero_image_url"),
  heroImageAlt:      text("hero_image_alt").default("Laundry service illustration"),
  isActive:          boolean("is_active").default(true).notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
});

export const cmsHeroStats = pgTable("cms_hero_stats", {
  id:        serial("id").primaryKey(),
  heroId:    integer("hero_id").references(() => cmsHero.id, { onDelete: "cascade" }).notNull(),
  value:     text("value").notNull(),
  label:     text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").default(true).notNull(),
});

// ─── Services Section ─────────────────────────────────────────────────────────

export const cmsServicesSection = pgTable("cms_services_section", {
  id:        serial("id").primaryKey(),
  badge:     text("badge").notNull().default("What We Offer"),
  headline:  text("headline").notNull().default("Every Fabric, Every Need"),
  subtext:   text("subtext").notNull(),
  isActive:  boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsServiceCards = pgTable("cms_service_cards", {
  id:          serial("id").primaryKey(),
  sectionId:   integer("section_id").references(() => cmsServicesSection.id, { onDelete: "cascade" }).notNull(),
  title:       text("title").notNull(),
  description: text("description").notNull(),
  price:       text("price").notNull(),
  imageUrl:    text("image_url"),
  imageAlt:    text("image_alt"),
  accentColor: text("accent_color").notNull().default("#1a7fba"),
  sortOrder:   integer("sort_order").notNull().default(0),
  isActive:    boolean("is_active").default(true).notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ─── How It Works Section ─────────────────────────────────────────────────────

export const cmsHowItWorksSection = pgTable("cms_how_it_works_section", {
  id:        serial("id").primaryKey(),
  badge:     text("badge").notNull().default("Simple Process"),
  headline:  text("headline").notNull().default("Laundry Done in 4 Easy Steps"),
  subtext:   text("subtext").notNull(),
  isActive:  boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsHowItWorksSteps = pgTable("cms_how_it_works_steps", {
  id:          serial("id").primaryKey(),
  sectionId:   integer("section_id").references(() => cmsHowItWorksSection.id, { onDelete: "cascade" }).notNull(),
  stepNumber:  text("step_number").notNull(),
  title:       text("title").notNull(),
  description: text("description").notNull(),
  imageUrl:    text("image_url"),
  imageAlt:    text("image_alt"),
  accentColor: text("accent_color").notNull().default("#1a7fba"),
  sortOrder:   integer("sort_order").notNull().default(0),
  isActive:    boolean("is_active").default(true).notNull(),
});

// ─── Gallery Section ──────────────────────────────────────────────────────────

export const cmsGallerySection = pgTable("cms_gallery_section", {
  id:        serial("id").primaryKey(),
  badge:     text("badge").notNull().default("Our Facility"),
  headline:  text("headline").notNull().default("A Glimpse Inside Akiro"),
  subtext:   text("subtext").notNull().default("Clean space, professional care — see where the magic happens."),
  isActive:  boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsGalleryImages = pgTable("cms_gallery_images", {
  id:         serial("id").primaryKey(),
  sectionId:  integer("section_id").references(() => cmsGallerySection.id, { onDelete: "cascade" }).notNull(),
  // Cloudinary full secure URL
  imageUrl:   text("image_url").notNull(),
  altText:    text("alt_text").notNull(),
  caption:    text("caption"),
  // "square" | "tall" | "wide" — controls masonry span
  sizeHint:   cmsGalleryImageSizeEnum("size_hint").notNull().default("square"),
  sortOrder:  integer("sort_order").notNull().default(0),
  isActive:   boolean("is_active").default(true).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

// ─── Testimonials Section ─────────────────────────────────────────────────────

export const cmsTestimonialsSection = pgTable("cms_testimonials_section", {
  id:              serial("id").primaryKey(),
  badge:           text("badge").notNull().default("Customer Love"),
  headline:        text("headline").notNull().default("Trusted by Thousands"),
  subtext:         text("subtext").notNull(),
  aggregateRating: text("aggregate_rating").notNull().default("4.9"),
  reviewCount:     text("review_count").notNull().default("2,400+"),
  isActive:        boolean("is_active").default(true).notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

export const cmsTestimonials = pgTable("cms_testimonials", {
  id:          serial("id").primaryKey(),
  sectionId:   integer("section_id").references(() => cmsTestimonialsSection.id, { onDelete: "cascade" }).notNull(),
  authorName:  text("author_name").notNull(),
  authorRole:  text("author_role").notNull(),
  avatarUrl:   text("avatar_url"),
  avatarAlt:   text("avatar_alt"),
  initials:    text("initials").notNull(),
  accentColor: text("accent_color").notNull().default("#1a7fba"),
  rating:      integer("rating").notNull().default(5),
  body:        text("body").notNull(),
  sortOrder:   integer("sort_order").notNull().default(0),
  isActive:    boolean("is_active").default(true).notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ─── CTA Section ─────────────────────────────────────────────────────────────

export const cmsCtaSection = pgTable("cms_cta_section", {
  id:                serial("id").primaryKey(),
  badge:             text("badge").notNull().default("Ready to Get Started?"),
  headline:          text("headline").notNull(),
  headlineAccent:    text("headline_accent").notNull(),
  subtext:           text("subtext").notNull(),
  primaryCtaLabel:   text("primary_cta_label").notNull().default("Call Now"),
  primaryCtaHref:    text("primary_cta_href").notNull().default("tel:+67077230001"),
  secondaryCtaLabel: text("secondary_cta_label").notNull().default("WhatsApp"),
  secondaryCtaHref:  text("secondary_cta_href").notNull().default("https://wa.me/67077230001"),
  bgImageUrl:        text("bg_image_url"),
  isActive:          boolean("is_active").default(true).notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
});

// ─── Contact Info Items ───────────────────────────────────────────────────────

export const cmsContactItems = pgTable("cms_contact_items", {
  id:        serial("id").primaryKey(),
  label:     text("label").notNull(),
  value:     text("value").notNull(),
  href:      text("href"),
  iconUrl:   text("icon_url"),
  iconType:  text("icon_type").notNull().default("phone"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").default(true).notNull(),
});

// ─── Footer ───────────────────────────────────────────────────────────────────

export const cmsFooter = pgTable("cms_footer", {
  id:            serial("id").primaryKey(),
  brandName:     text("brand_name").notNull().default("Akiro Laundry"),
  tagline:       text("tagline"),
  logoUrl:       text("logo_url"),
  logoAlt:       text("logo_alt").default("Akiro Laundry"),
  copyrightText: text("copyright_text").notNull(),
  isActive:      boolean("is_active").default(true).notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

export const cmsFooterLinks = pgTable("cms_footer_links", {
  id:        serial("id").primaryKey(),
  footerId:  integer("footer_id").references(() => cmsFooter.id, { onDelete: "cascade" }).notNull(),
  column:    text("column").notNull(),
  label:     text("label").notNull(),
  href:      text("href").notNull(),
  iconUrl:   text("icon_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").default(true).notNull(),
});

// ─── Media Library ────────────────────────────────────────────────────────────

export const cmsMedia = pgTable("cms_media", {
  id:           serial("id").primaryKey(),
  publicId:     text("public_id").notNull().unique(),
  url:          text("url").notNull(),
  optimizedUrl: text("optimized_url"),
  folder:       text("folder"),
  fileName:     text("file_name").notNull(),
  mimeType:     text("mime_type").notNull().default("image/jpeg"),
  width:        integer("width"),
  height:       integer("height"),
  sizeBytes:    integer("size_bytes"),
  altText:      text("alt_text"),
  caption:      text("caption"),
  metadata:     jsonb("metadata"),
  uploadedAt:   timestamp("uploaded_at").defaultNow().notNull(),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type CmsSiteSettings        = typeof cmsSiteSettings.$inferSelect;
export type CmsSeoSettings         = typeof cmsSeoSettings.$inferSelect;
export type CmsNavbar              = typeof cmsNavbar.$inferSelect;
export type CmsNavLink             = typeof cmsNavLinks.$inferSelect;
export type CmsHero                = typeof cmsHero.$inferSelect;
export type CmsHeroStat            = typeof cmsHeroStats.$inferSelect;
export type CmsServicesSection     = typeof cmsServicesSection.$inferSelect;
export type CmsServiceCard         = typeof cmsServiceCards.$inferSelect;
export type CmsHowItWorksSection   = typeof cmsHowItWorksSection.$inferSelect;
export type CmsHowItWorksStep      = typeof cmsHowItWorksSteps.$inferSelect;
export type CmsGallerySection      = typeof cmsGallerySection.$inferSelect;
export type CmsGalleryImage        = typeof cmsGalleryImages.$inferSelect;
export type CmsTestimonialsSection = typeof cmsTestimonialsSection.$inferSelect;
export type CmsTestimonial         = typeof cmsTestimonials.$inferSelect;
export type CmsCtaSection          = typeof cmsCtaSection.$inferSelect;
export type CmsContactItem         = typeof cmsContactItems.$inferSelect;
export type CmsFooter              = typeof cmsFooter.$inferSelect;
export type CmsFooterLink          = typeof cmsFooterLinks.$inferSelect;
export type CmsMedia               = typeof cmsMedia.$inferSelect;
export type NewCmsMedia            = typeof cmsMedia.$inferInsert;