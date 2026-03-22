// lib/actions/cms/gallery.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsGallerySection, cmsGalleryImages } from "@/lib/db/schema/cms";

export async function saveGallery(input: {
  sectionId?: number;
  badge: string;
  headline: string;
  subtext: string;
  images: Array<{
    id?: number;
    imageUrl: string;
    altText: string;
    caption: string | null;
    sizeHint: "square" | "tall" | "wide";
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
    .select({ id: cmsGallerySection.id })
    .from(cmsGallerySection)
    .where(eq(cmsGallerySection.isActive, true))
    .orderBy(desc(cmsGallerySection.id))
    .limit(1);

  let id: number;

  if (existing) {
    id = existing.id;
    await db.update(cmsGallerySection).set(base).where(eq(cmsGallerySection.id, id));
  } else {
    const [r] = await db
      .insert(cmsGallerySection)
      .values({ ...base, isActive: true })
      .returning({ id: cmsGallerySection.id });
    id = r.id;
  }

  await db.delete(cmsGalleryImages).where(eq(cmsGalleryImages.sectionId, id));

  const validImages = input.images.filter((img) => img.imageUrl);
  if (validImages.length > 0) {
    await db.insert(cmsGalleryImages).values(
      validImages.map((img, i) => ({
        sectionId: id,
        imageUrl: img.imageUrl,
        altText: img.altText,
        caption: img.caption,
        sizeHint: img.sizeHint,
        sortOrder: i,
        isActive: true,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/cms/gallery");
}