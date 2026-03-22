// lib/actions/cms/services.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsServicesSection, cmsServiceCards } from "@/lib/db/schema/cms";

export async function saveServices(input: {
  sectionId?: number;
  badge: string;
  headline: string;
  subtext: string;
  cards: Array<{
    id?: number;
    title: string;
    description: string;
    price: string;
    imageUrl: string | null;
    imageAlt: string | null;
    accentColor: string;
    sortOrder: number;
  }>;
}) {
  const base = {
    badge: input.badge,
    headline: input.headline,
    subtext: input.subtext,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: cmsServicesSection.id })
    .from(cmsServicesSection)
    .where(eq(cmsServicesSection.isActive, true))
    .orderBy(desc(cmsServicesSection.id))
    .limit(1);

  let id: number;

  if (existing) {
    id = existing.id;
    await db.update(cmsServicesSection).set(base).where(eq(cmsServicesSection.id, id));
  } else {
    const [r] = await db
      .insert(cmsServicesSection)
      .values({ ...base, isActive: true })
      .returning({ id: cmsServicesSection.id });
    id = r.id;
  }

  await db.delete(cmsServiceCards).where(eq(cmsServiceCards.sectionId, id));

  const validCards = input.cards.filter((c) => c.title);
  if (validCards.length > 0) {
    await db.insert(cmsServiceCards).values(
      validCards.map((c, i) => ({
        sectionId: id,
        title: c.title,
        description: c.description,
        price: c.price,
        imageUrl: c.imageUrl,
        imageAlt: c.imageAlt,
        accentColor: c.accentColor,
        sortOrder: i,
        isActive: true,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/cms/services");
}