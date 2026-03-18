// lib/actions/cms/services.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsServicesSection, cmsServiceCards } from "@/lib/db/schema/cms";

export async function saveServices(input: {
  sectionId?: number; badge: string; headline: string; subtext: string;
  cards: Array<{ id?: number; title: string; description: string; price: string; imageUrl: string | null; imageAlt: string | null; accentColor: string; sortOrder: number }>;
}) {
  let id = input.sectionId;
  const base = { badge: input.badge, headline: input.headline, subtext: input.subtext, updatedAt: new Date() };
  if (id) { await db.update(cmsServicesSection).set(base).where(eq(cmsServicesSection.id, id)); }
  else { const [r] = await db.insert(cmsServicesSection).values({ ...base, isActive: true }).returning({ id: cmsServicesSection.id }); id = r.id; }
  await db.delete(cmsServiceCards).where(eq(cmsServiceCards.sectionId, id));
  if (input.cards.length > 0) await db.insert(cmsServiceCards).values(input.cards.filter((c) => c.title).map((c, i) => ({ sectionId: id!, ...c, sortOrder: i, isActive: true })));
  revalidatePath("/"); revalidatePath("/admin/cms/services");
}