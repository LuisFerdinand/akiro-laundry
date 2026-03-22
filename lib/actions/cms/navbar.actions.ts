// lib/actions/cms/navbar.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsNavbar, cmsNavLinks } from "@/lib/db/schema/cms";

interface SaveNavbarInput {
  navbarId?: number | null;
  brandName: string;
  logoUrl?: string | null;
  logoAlt?: string | null;
  ctaLabel: string;
  ctaHref: string;
  links: Array<{
    id?: number;
    label: string;
    href: string;
    sortOrder: number;
  }>;
}

export async function saveNavbar(input: SaveNavbarInput) {
  const [existing] = await db
    .select({ id: cmsNavbar.id })
    .from(cmsNavbar)
    .where(eq(cmsNavbar.isActive, true))
    .orderBy(desc(cmsNavbar.id))
    .limit(1);

  let navbarId: number;

  if (existing) {
    navbarId = existing.id;
    await db
      .update(cmsNavbar)
      .set({
        brandName: input.brandName,
        logoUrl: input.logoUrl ?? null,
        logoAlt: input.logoAlt ?? null,
        ctaLabel: input.ctaLabel,
        ctaHref: input.ctaHref,
        updatedAt: new Date(),
      })
      .where(eq(cmsNavbar.id, navbarId));
  } else {
    const [row] = await db
      .insert(cmsNavbar)
      .values({
        brandName: input.brandName,
        logoUrl: input.logoUrl ?? null,
        logoAlt: input.logoAlt ?? null,
        ctaLabel: input.ctaLabel,
        ctaHref: input.ctaHref,
        isActive: true,
      })
      .returning({ id: cmsNavbar.id });
    navbarId = row.id;
  }

  await db.delete(cmsNavLinks).where(eq(cmsNavLinks.navbarId, navbarId));

  const validLinks = input.links.filter((l) => l.label.trim() && l.href.trim());
  if (validLinks.length > 0) {
    await db.insert(cmsNavLinks).values(
      validLinks.map((l, i) => ({
        navbarId,
        label: l.label.trim(),
        href: l.href.trim(),
        sortOrder: i,
        isActive: true,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/cms/navbar");
}