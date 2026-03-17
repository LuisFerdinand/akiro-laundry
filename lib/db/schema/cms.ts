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
  "testimonials",
  "cta",
  "contact",
  "navbar",
  "footer",
]);

// ─── Site Settings (global) ───────────────────────────────────────────────────
// One row, keyed by `key`. Stores site-wide values like brand name, logo, etc.

export const cmsSiteSettings = pgTable("cms_site_settings", {
  id:        serial("id").primaryKey(),
  key:       text("key").notNull().unique(),   // e.g. "brand_name", "logo_url"
  value:     text("value").notNull(),
  label:     text("label").notNull(),          // human-readable label for the CMS UI
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Navbar ───────────────────────────────────────────────────────────────────

export const cmsNavbar = pgTable("cms_navbar", {
  id:          serial("id").primaryKey(),
  brandName:   text("brand_name").notNull().default("Akiro Laundry"),
  // Cloudinary URL for the logo image
  logoUrl:     text("logo_url"),
  logoAlt:     text("logo_alt").default("Akiro Laundry logo"),
  ctaLabel:    text("cta_label").notNull().default("Book Now"),
  ctaHref:     text("cta_href").notNull().default("#contact"),
  isActive:    boolean("is_active").default(true).notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

// Nav links are stored as a separate rows so they can be reordered.
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
  id:           serial("id").primaryKey(),
  badge:        text("badge").notNull().default("Open Today · 08:00 – 20:00"),
  headline:     text("headline").notNull(),       // e.g. "Fresh Laundry,"
  headlineAccent: text("headline_accent").notNull(), // e.g. "Delivered"
  headlineSuffix: text("headline_suffix").notNull(), // e.g. "to Your Door."
  subtext:      text("subtext").notNull(),
  primaryCtaLabel: text("primary_cta_label").notNull().default("Order a Pickup"),
  primaryCtaHref:  text("primary_cta_href").notNull().default("#contact"),
  secondaryCtaLabel: text("secondary_cta_label").notNull().default("View Services"),
  secondaryCtaHref:  text("secondary_cta_href").notNull().default("#services"),
  // Cloudinary image for the hero card / illustration
  heroImageUrl:    text("hero_image_url"),
  heroImageAlt:    text("hero_image_alt").default("Laundry service illustration"),
  isActive:    boolean("is_active").default(true).notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

// Stats displayed in the hero section (e.g. "10K+ Happy Customers")
export const cmsHeroStats = pgTable("cms_hero_stats", {
  id:        serial("id").primaryKey(),
  heroId:    integer("hero_id").references(() => cmsHero.id, { onDelete: "cascade" }).notNull(),
  value:     text("value").notNull(),    // e.g. "10K+"
  label:     text("label").notNull(),    // e.g. "Happy Customers"
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").default(true).notNull(),
});

// ─── Services Section ─────────────────────────────────────────────────────────

export const cmsServicesSection = pgTable("cms_services_section", {
  id:          serial("id").primaryKey(),
  badge:       text("badge").notNull().default("What We Offer"),
  headline:    text("headline").notNull().default("Every Fabric, Every Need"),
  subtext:     text("subtext").notNull(),
  isActive:    boolean("is_active").default(true).notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const cmsServiceCards = pgTable("cms_service_cards", {
  id:          serial("id").primaryKey(),
  sectionId:   integer("section_id").references(() => cmsServicesSection.id, { onDelete: "cascade" }).notNull(),
  title:       text("title").notNull(),
  description: text("description").notNull(),
  price:       text("price").notNull(),         // e.g. "From $2/kg"
  // Cloudinary URL for service icon/image
  imageUrl:    text("image_url"),
  imageAlt:    text("image_alt"),
  // Accent / theme color for the card (hex string)
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
  stepNumber:  text("step_number").notNull(),   // e.g. "01"
  title:       text("title").notNull(),
  description: text("description").notNull(),
  // Cloudinary URL for step icon/illustration
  imageUrl:    text("image_url"),
  imageAlt:    text("image_alt"),
  accentColor: text("accent_color").notNull().default("#1a7fba"),
  sortOrder:   integer("sort_order").notNull().default(0),
  isActive:    boolean("is_active").default(true).notNull(),
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
  // Cloudinary URL for the author's avatar photo
  avatarUrl:   text("avatar_url"),
  avatarAlt:   text("avatar_alt"),
  // Fallback initials when no avatar is uploaded
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
  id:                  serial("id").primaryKey(),
  badge:               text("badge").notNull().default("Ready to Get Started?"),
  headline:            text("headline").notNull(),
  headlineAccent:      text("headline_accent").notNull(),
  subtext:             text("subtext").notNull(),
  primaryCtaLabel:     text("primary_cta_label").notNull().default("Call Now"),
  primaryCtaHref:      text("primary_cta_href").notNull().default("tel:+67077230001"),
  secondaryCtaLabel:   text("secondary_cta_label").notNull().default("WhatsApp"),
  secondaryCtaHref:    text("secondary_cta_href").notNull().default("https://wa.me/67077230001"),
  // Optional background / decorative image
  bgImageUrl:          text("bg_image_url"),
  isActive:            boolean("is_active").default(true).notNull(),
  updatedAt:           timestamp("updated_at").defaultNow().notNull(),
});

// ─── Contact Info Items (rendered below the CTA banner) ──────────────────────

export const cmsContactItems = pgTable("cms_contact_items", {
  id:        serial("id").primaryKey(),
  label:     text("label").notNull(),   // e.g. "Call Us"
  value:     text("value").notNull(),   // e.g. "+670 7723 0001"
  href:      text("href"),              // nullable for non-link items
  // Cloudinary icon image URL (optional — falls back to SVG in component)
  iconUrl:   text("icon_url"),
  iconType:  text("icon_type").notNull().default("phone"),
  // phone | email | location | hours
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").default(true).notNull(),
});

// ─── Footer ───────────────────────────────────────────────────────────────────

export const cmsFooter = pgTable("cms_footer", {
  id:            serial("id").primaryKey(),
  brandName:     text("brand_name").notNull().default("Akiro Laundry"),
  tagline:       text("tagline"),
  // Cloudinary URL for the footer logo
  logoUrl:       text("logo_url"),
  logoAlt:       text("logo_alt").default("Akiro Laundry"),
  copyrightText: text("copyright_text").notNull(),
  isActive:      boolean("is_active").default(true).notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

// Footer column links (social links, quick links, etc.)
export const cmsFooterLinks = pgTable("cms_footer_links", {
  id:        serial("id").primaryKey(),
  footerId:  integer("footer_id").references(() => cmsFooter.id, { onDelete: "cascade" }).notNull(),
  column:    text("column").notNull(),   // e.g. "social", "quick_links", "services"
  label:     text("label").notNull(),
  href:      text("href").notNull(),
  // Optional Cloudinary icon
  iconUrl:   text("icon_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive:  boolean("is_active").default(true).notNull(),
});

// ─── Media Library ────────────────────────────────────────────────────────────
// Tracks every Cloudinary asset used in the CMS so admins can browse/replace them.

export const cmsMedia = pgTable("cms_media", {
  id:          serial("id").primaryKey(),
  // Cloudinary public_id (e.g. "akiro/hero/washing-machine")
  publicId:    text("public_id").notNull().unique(),
  // Full Cloudinary secure URL
  url:         text("url").notNull(),
  // Transformed URL (e.g. auto-quality, auto-format)
  optimizedUrl: text("optimized_url"),
  folder:      text("folder"),            // e.g. "hero", "services", "team"
  fileName:    text("file_name").notNull(),
  mimeType:    text("mime_type").notNull().default("image/jpeg"),
  width:       integer("width"),
  height:      integer("height"),
  sizeBytes:   integer("size_bytes"),
  altText:     text("alt_text"),
  caption:     text("caption"),
  // JSON metadata returned by Cloudinary on upload
  metadata:    jsonb("metadata"),
  uploadedAt:  timestamp("uploaded_at").defaultNow().notNull(),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type CmsSiteSettings       = typeof cmsSiteSettings.$inferSelect;
export type CmsNavbar             = typeof cmsNavbar.$inferSelect;
export type CmsNavLink            = typeof cmsNavLinks.$inferSelect;
export type CmsHero               = typeof cmsHero.$inferSelect;
export type CmsHeroStat           = typeof cmsHeroStats.$inferSelect;
export type CmsServicesSection    = typeof cmsServicesSection.$inferSelect;
export type CmsServiceCard        = typeof cmsServiceCards.$inferSelect;
export type CmsHowItWorksSection  = typeof cmsHowItWorksSection.$inferSelect;
export type CmsHowItWorksStep     = typeof cmsHowItWorksSteps.$inferSelect;
export type CmsTestimonialsSection = typeof cmsTestimonialsSection.$inferSelect;
export type CmsTestimonial        = typeof cmsTestimonials.$inferSelect;
export type CmsCtaSection         = typeof cmsCtaSection.$inferSelect;
export type CmsContactItem        = typeof cmsContactItems.$inferSelect;
export type CmsFooter             = typeof cmsFooter.$inferSelect;
export type CmsFooterLink         = typeof cmsFooterLinks.$inferSelect;
export type CmsMedia              = typeof cmsMedia.$inferSelect;
export type NewCmsMedia           = typeof cmsMedia.$inferInsert;