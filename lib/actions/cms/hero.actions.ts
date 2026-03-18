// lib/actions/cms/hero.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsHero, cmsHeroStats } from "@/lib/db/schema/cms";

export async function saveHero(input: {
  heroId?: number; badge: string; headline: string; headlineAccent: string; headlineSuffix: string;
  subtext: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string;
  secondaryCtaHref: string; heroImageUrl: string | null; heroImageAlt: string | null;
  stats: Array<{ id?: number; value: string; label: string; sortOrder: number }>;
}) {
  let heroId = input.heroId;
  const heroData = { badge: input.badge, headline: input.headline, headlineAccent: input.headlineAccent, headlineSuffix: input.headlineSuffix, subtext: input.subtext, primaryCtaLabel: input.primaryCtaLabel, primaryCtaHref: input.primaryCtaHref, secondaryCtaLabel: input.secondaryCtaLabel, secondaryCtaHref: input.secondaryCtaHref, heroImageUrl: input.heroImageUrl, heroImageAlt: input.heroImageAlt, updatedAt: new Date() };
  if (heroId) { await db.update(cmsHero).set(heroData).where(eq(cmsHero.id, heroId)); }
  else { const [row] = await db.insert(cmsHero).values({ ...heroData, isActive: true }).returning({ id: cmsHero.id }); heroId = row.id; }
  await db.delete(cmsHeroStats).where(eq(cmsHeroStats.heroId, heroId));
  if (input.stats.length > 0) await db.insert(cmsHeroStats).values(input.stats.filter((s) => s.value && s.label).map((s, i) => ({ heroId: heroId!, value: s.value, label: s.label, sortOrder: i, isActive: true })));
  revalidatePath("/"); revalidatePath("/admin/cms/hero");
}