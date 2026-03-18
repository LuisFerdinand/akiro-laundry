// lib/actions/cms/gallery.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsGallerySection, cmsGalleryImages } from "@/lib/db/schema/cms";

export async function saveGallery(input: {
  sectionId?: number; badge: string; headline: string; subtext: string;
  images: Array<{ id?: number; imageUrl: string; altText: string; caption: string | null; sizeHint: "square" | "tall" | "wide"; sortOrder: number }>;
}) {
  let id = input.sectionId;
  const base = { badge: input.badge, headline: input.headline, subtext: input.subtext, updatedAt: new Date() };
  if (id) { await db.update(cmsGallerySection).set(base).where(eq(cmsGallerySection.id, id)); }
  else { const [r] = await db.insert(cmsGallerySection).values({ ...base, isActive: true }).returning({ id: cmsGallerySection.id }); id = r.id; }
  await db.delete(cmsGalleryImages).where(eq(cmsGalleryImages.sectionId, id));
  if (input.images.length > 0) await db.insert(cmsGalleryImages).values(input.images.filter((img) => img.imageUrl).map((img, i) => ({ sectionId: id!, ...img, sortOrder: i, isActive: true })));
  revalidatePath("/"); revalidatePath("/admin/cms/gallery");
}