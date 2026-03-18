// lib/actions/cms/navbar.actions.ts
"use server";

import { db }      from "@/lib/db";
import { eq }      from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  cmsNavbar,
  cmsNavLinks,
} from "@/lib/db/schema/cms";

interface SaveNavbarInput {
  navbarId?:  number | null;
  brandName:  string;
  logoUrl?:   string | null;
  logoAlt?:   string | null;
  ctaLabel:   string;
  ctaHref:    string;
  links: Array<{
    id?:       number;
    label:     string;
    href:      string;
    sortOrder: number;
  }>;
}

export async function saveNavbar(input: SaveNavbarInput) {
  let navbarId = input.navbarId;

  if (navbarId) {
    // Update existing row
    await db
      .update(cmsNavbar)
      .set({
        brandName: input.brandName,
        logoUrl:   input.logoUrl   ?? null,
        logoAlt:   input.logoAlt   ?? null,
        ctaLabel:  input.ctaLabel,
        ctaHref:   input.ctaHref,
        updatedAt: new Date(),
      })
      .where(eq(cmsNavbar.id, navbarId));
  } else {
    // Insert new row
    const [row] = await db
      .insert(cmsNavbar)
      .values({
        brandName: input.brandName,
        logoUrl:   input.logoUrl   ?? null,
        logoAlt:   input.logoAlt   ?? null,
        ctaLabel:  input.ctaLabel,
        ctaHref:   input.ctaHref,
        isActive:  true,
      })
      .returning({ id: cmsNavbar.id });
    navbarId = row.id;
  }

  // Replace all nav links: delete existing, re-insert in order
  await db.delete(cmsNavLinks).where(eq(cmsNavLinks.navbarId, navbarId));

  if (input.links.length > 0) {
    await db.insert(cmsNavLinks).values(
      input.links
        .filter((l) => l.label.trim() && l.href.trim())
        .map((l, i) => ({
          navbarId:  navbarId!,
          label:     l.label.trim(),
          href:      l.href.trim(),
          sortOrder: i,
          isActive:  true,
        }))
    );
  }

  // Bust the landing page cache
  revalidatePath("/");
  revalidatePath("/admin/cms/navbar");
}