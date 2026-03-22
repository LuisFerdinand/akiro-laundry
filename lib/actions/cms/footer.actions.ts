// lib/actions/cms/footer.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsFooter, cmsFooterLinks } from "@/lib/db/schema/cms";

export async function saveFooter(input: {
  footerId?: number;
  brandName: string;
  tagline: string | null;
  logoUrl: string | null;
  logoAlt: string | null;
  copyrightText: string;
  links: Array<{
    id?: number;
    column: string;
    label: string;
    href: string;
    sortOrder: number;
  }>;
}) {
  const base = {
    brandName: input.brandName,
    tagline: input.tagline,
    logoUrl: input.logoUrl,
    logoAlt: input.logoAlt,
    copyrightText: input.copyrightText,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: cmsFooter.id })
    .from(cmsFooter)
    .where(eq(cmsFooter.isActive, true))
    .orderBy(desc(cmsFooter.id))
    .limit(1);

  let id: number;

  if (existing) {
    id = existing.id;
    await db.update(cmsFooter).set(base).where(eq(cmsFooter.id, id));
  } else {
    const [r] = await db
      .insert(cmsFooter)
      .values({ ...base, isActive: true })
      .returning({ id: cmsFooter.id });
    id = r.id;
  }

  await db.delete(cmsFooterLinks).where(eq(cmsFooterLinks.footerId, id));

  const validLinks = input.links.filter((l) => l.label && l.href);
  if (validLinks.length > 0) {
    await db.insert(cmsFooterLinks).values(
      validLinks.map((l, i) => ({
        footerId: id,
        column: l.column,
        label: l.label,
        href: l.href,
        iconUrl: null,
        sortOrder: i,
        isActive: true,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/cms/footer");
}