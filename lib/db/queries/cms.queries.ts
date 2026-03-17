// lib/db/queries/cms.queries.ts
//
// Ready-to-use query functions for every public landing-page section.
// Import these in your page/layout Server Components.
//
// Usage:
//   import { getLandingPageData } from "@/lib/db/queries/cms.queries";
//   const data = await getLandingPageData();

import { db } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import * as cms from "@/lib/db/schema/cms";

// ─── Individual section fetchers ─────────────────────────────────────────────

export async function getSiteSettings() {
  const rows = await db.select().from(cms.cmsSiteSettings);
  // Convert to a plain key→value map for easy consumption
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}

export async function getNavbar() {
  const [navbar] = await db.select().from(cms.cmsNavbar).where(eq(cms.cmsNavbar.isActive, true)).limit(1);
  if (!navbar) return null;
  const links = await db
    .select()
    .from(cms.cmsNavLinks)
    .where(eq(cms.cmsNavLinks.navbarId, navbar.id))
    .orderBy(asc(cms.cmsNavLinks.sortOrder));
  return { ...navbar, links };
}

export async function getHero() {
  const [hero] = await db.select().from(cms.cmsHero).where(eq(cms.cmsHero.isActive, true)).limit(1);
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
    .limit(1);
  if (!section) return null;
  const steps = await db
    .select()
    .from(cms.cmsHowItWorksSteps)
    .where(eq(cms.cmsHowItWorksSteps.sectionId, section.id))
    .orderBy(asc(cms.cmsHowItWorksSteps.sortOrder));
  return { ...section, steps };
}

export async function getTestimonialsSection() {
  const [section] = await db
    .select()
    .from(cms.cmsTestimonialsSection)
    .where(eq(cms.cmsTestimonialsSection.isActive, true))
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
  const [footer] = await db.select().from(cms.cmsFooter).where(eq(cms.cmsFooter.isActive, true)).limit(1);
  if (!footer) return null;
  const links = await db
    .select()
    .from(cms.cmsFooterLinks)
    .where(eq(cms.cmsFooterLinks.footerId, footer.id))
    .orderBy(asc(cms.cmsFooterLinks.sortOrder));
  return { ...footer, links };
}

// ─── Bulk loader — fetch everything in parallel ───────────────────────────────

export async function getLandingPageData() {
  const [siteSettings, navbar, hero, services, howItWorks, testimonials, cta, contactItems, footer] =
    await Promise.all([
      getSiteSettings(),
      getNavbar(),
      getHero(),
      getServicesSection(),
      getHowItWorksSection(),
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