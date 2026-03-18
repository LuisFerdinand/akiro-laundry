// lib/actions/cms/cta.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsCtaSection, cmsContactItems } from "@/lib/db/schema/cms";

export async function saveCta(input: {
  ctaId?: number; badge: string; headline: string; headlineAccent: string; subtext: string;
  primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string;
  bgImageUrl: string | null;
  contacts: Array<{ id?: number; label: string; value: string; href: string | null; iconType: string; sortOrder: number }>;
}) {
  let ctaId = input.ctaId;
  const base = { badge: input.badge, headline: input.headline, headlineAccent: input.headlineAccent, subtext: input.subtext, primaryCtaLabel: input.primaryCtaLabel, primaryCtaHref: input.primaryCtaHref, secondaryCtaLabel: input.secondaryCtaLabel, secondaryCtaHref: input.secondaryCtaHref, bgImageUrl: input.bgImageUrl, updatedAt: new Date() };
  if (ctaId) { await db.update(cmsCtaSection).set(base).where(eq(cmsCtaSection.id, ctaId)); }
  else { const [r] = await db.insert(cmsCtaSection).values({ ...base, isActive: true }).returning({ id: cmsCtaSection.id }); ctaId = r.id; }
  // Replace all contact items
  await db.delete(cmsContactItems).where(eq(cmsContactItems.isActive, true));
  if (input.contacts.length > 0) await db.insert(cmsContactItems).values(input.contacts.filter((c) => c.label && c.value).map((c, i) => ({ ...c, iconUrl: null, sortOrder: i, isActive: true })));
  revalidatePath("/"); revalidatePath("/admin/cms/cta");
}