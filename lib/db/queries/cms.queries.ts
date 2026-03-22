// lib/db/queries/cms.queries.ts

import { db } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import * as cms from "@/lib/db/schema/cms";
import { cmsSeoSettings } from "@/lib/db/schema/cms";

// ─── Individual section fetchers ─────────────────────────────────────────────

export async function getSiteSettings() {
  const rows = await db.select().from(cms.cmsSiteSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}

export async function getNavbar() {
  const [navbar] = await db
    .select()
    .from(cms.cmsNavbar)
    .where(eq(cms.cmsNavbar.isActive, true))
    .orderBy(desc(cms.cmsNavbar.id))
    .limit(1);
  if (!navbar) return null;
  const links = await db
    .select()
    .from(cms.cmsNavLinks)
    .where(eq(cms.cmsNavLinks.navbarId, navbar.id))
    .orderBy(asc(cms.cmsNavLinks.sortOrder));
  return { ...navbar, links };
}

export async function getHero() {
  const [hero] = await db
    .select()
    .from(cms.cmsHero)
    .where(eq(cms.cmsHero.isActive, true))
    .orderBy(desc(cms.cmsHero.id))
    .limit(1);
  if (!hero) return null;
  const stats = await db
    .select()
    .from(cms.cmsHeroStats)
    .where(eq(cms.cmsHeroStats.heroId, hero.id))
    .orderBy(asc(cms.cmsHeroStats.sortOrder));
  return { ...hero, stats };
}

export async function getServicesSection() {
  const [section] = await db
    .select()
    .from(cms.cmsServicesSection)
    .where(eq(cms.cmsServicesSection.isActive, true))
    .orderBy(desc(cms.cmsServicesSection.id))
    .limit(1);
  if (!section) return null;
  const cards = await db
    .select()
    .from(cms.cmsServiceCards)
    .where(eq(cms.cmsServiceCards.sectionId, section.id))
    .orderBy(asc(cms.cmsServiceCards.sortOrder));
  return { ...section, cards };
}

export async function getHowItWorksSection() {
  const [section] = await db
    .select()
    .from(cms.cmsHowItWorksSection)
    .where(eq(cms.cmsHowItWorksSection.isActive, true))
    .orderBy(desc(cms.cmsHowItWorksSection.id))
    .limit(1);
  if (!section) return null;
  const steps = await db
    .select()
    .from(cms.cmsHowItWorksSteps)
    .where(eq(cms.cmsHowItWorksSteps.sectionId, section.id))
    .orderBy(asc(cms.cmsHowItWorksSteps.sortOrder));
  return { ...section, steps };
}

export async function getGallerySection() {
  const [section] = await db
    .select()
    .from(cms.cmsGallerySection)
    .where(eq(cms.cmsGallerySection.isActive, true))
    .orderBy(desc(cms.cmsGallerySection.id))
    .limit(1);
  if (!section) return null;
  const images = await db
    .select()
    .from(cms.cmsGalleryImages)
    .where(eq(cms.cmsGalleryImages.sectionId, section.id))
    .orderBy(asc(cms.cmsGalleryImages.sortOrder));
  return { ...section, images };
}

export async function getTestimonialsSection() {
  const [section] = await db
    .select()
    .from(cms.cmsTestimonialsSection)
    .where(eq(cms.cmsTestimonialsSection.isActive, true))
    .orderBy(desc(cms.cmsTestimonialsSection.id))
    .limit(1);
  if (!section) return null;
  const testimonials = await db
    .select()
    .from(cms.cmsTestimonials)
    .where(eq(cms.cmsTestimonials.sectionId, section.id))
    .orderBy(asc(cms.cmsTestimonials.sortOrder));
  return { ...section, testimonials };
}

export async function getCtaSection() {
  const [section] = await db
    .select()
    .from(cms.cmsCtaSection)
    .where(eq(cms.cmsCtaSection.isActive, true))
    .orderBy(desc(cms.cmsCtaSection.id))
    .limit(1);
  return section ?? null;
}

export async function getContactItems() {
  return db
    .select()
    .from(cms.cmsContactItems)
    .where(eq(cms.cmsContactItems.isActive, true))
    .orderBy(asc(cms.cmsContactItems.sortOrder));
}

export async function getFooter() {
  const [footer] = await db
    .select()
    .from(cms.cmsFooter)
    .where(eq(cms.cmsFooter.isActive, true))
    .orderBy(desc(cms.cmsFooter.id))
    .limit(1);
  if (!footer) return null;
  const links = await db
    .select()
    .from(cms.cmsFooterLinks)
    .where(eq(cms.cmsFooterLinks.footerId, footer.id))
    .orderBy(asc(cms.cmsFooterLinks.sortOrder));
  return { ...footer, links };
}

export async function getSeoSettings() {
  const [row] = await db
    .select()
    .from(cmsSeoSettings)
    .orderBy(desc(cmsSeoSettings.id))
    .limit(1);
  return row ?? null;
}

// ─── Bulk loader — fetch everything in parallel ───────────────────────────────

export async function getLandingPageData() {
  const [
    siteSettings,
    navbar,
    hero,
    services,
    howItWorks,
    gallery,
    testimonials,
    cta,
    contactItems,
    footer,
  ] = await Promise.all([
    getSiteSettings(),
    getNavbar(),
    getHero(),
    getServicesSection(),
    getHowItWorksSection(),
    getGallerySection(),
    getTestimonialsSection(),
    getCtaSection(),
    getContactItems(),
    getFooter(),
  ]);

  return {
    siteSettings,
    navbar,
    hero,
    services,
    howItWorks,
    gallery,
    testimonials,
    cta,
    contactItems,
    footer,
  };
}

// ─── Media library ────────────────────────────────────────────────────────────

export async function getMediaByFolder(folder: string) {
  return db
    .select()
    .from(cms.cmsMedia)
    .where(eq(cms.cmsMedia.folder, folder));
}