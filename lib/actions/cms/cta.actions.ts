// lib/actions/cms/cta.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsCtaSection, cmsContactItems } from "@/lib/db/schema/cms";

export async function saveCta(input: {
  ctaId?: number;
  badge: string;
  headline: string;
  headlineAccent: string;
  subtext: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  bgImageUrl: string | null;
  contacts: Array<{
    id?: number;
    label: string;
    value: string;
    href: string | null;
    iconType: string;
    sortOrder: number;
  }>;
}) {
  const base = {
    badge: input.badge,
    headline: input.headline,
    headlineAccent: input.headlineAccent,
    subtext: input.subtext,
    primaryCtaLabel: input.primaryCtaLabel,
    primaryCtaHref: input.primaryCtaHref,
    secondaryCtaLabel: input.secondaryCtaLabel,
    secondaryCtaHref: input.secondaryCtaHref,
    bgImageUrl: input.bgImageUrl,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: cmsCtaSection.id })
    .from(cmsCtaSection)
    .where(eq(cmsCtaSection.isActive, true))
    .orderBy(desc(cmsCtaSection.id))
    .limit(1);

  if (existing) {
    await db.update(cmsCtaSection).set(base).where(eq(cmsCtaSection.id, existing.id));
  } else {
    await db.insert(cmsCtaSection).values({ ...base, isActive: true });
  }

  await db.delete(cmsContactItems);

  const validContacts = input.contacts.filter((c) => c.label && c.value);
  if (validContacts.length > 0) {
    await db.insert(cmsContactItems).values(
      validContacts.map((c, i) => ({
        label: c.label,
        value: c.value,
        href: c.href,
        iconType: c.iconType,
        iconUrl: null,
        sortOrder: i,
        isActive: true,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/cms/cta");
}