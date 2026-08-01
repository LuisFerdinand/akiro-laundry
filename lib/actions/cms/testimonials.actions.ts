// lib/actions/cms/testimonials.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsTestimonialsSection, cmsTestimonials } from "@/lib/db/schema/cms";

export async function saveTestimonials(input: {
  sectionId?: number;
  badge: string;
  headline: string;
  subtext: string;
  aggregateRating: string;
  reviewCount: string;
  testimonials: Array<{
    id?: number;
    authorName: string;
    authorRole: string;
    avatarUrl: string | null;
    avatarAlt: string | null;
    initials: string;
    accentColor: string;
    rating: number;
    body: string;
    sortOrder: number;
  }>;
}) {
  const base = {
    badge: input.badge,
    headline: input.headline,
    subtext: input.subtext,
    aggregateRating: input.aggregateRating,
    reviewCount: input.reviewCount,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: cmsTestimonialsSection.id })
    .from(cmsTestimonialsSection)
    .where(eq(cmsTestimonialsSection.isActive, true))
    .orderBy(desc(cmsTestimonialsSection.id))
    .limit(1);

  let id: number;

  if (existing) {
    id = existing.id;
    await db.update(cmsTestimonialsSection).set(base).where(eq(cmsTestimonialsSection.id, id));
  } else {
    const [r] = await db
      .insert(cmsTestimonialsSection)
      .values({ ...base, isActive: true })
      .returning({ id: cmsTestimonialsSection.id });
    id = r.id;
  }

  // Scoped to isActive:true only — this is the "currently published" set that the
  // CMS Testimonials editor actually loads and lets the admin curate. Pending
  // customer review submissions (isActive:false, awaiting moderation on the
  // Reviews page) are never loaded into this form, so they must never be touched
  // by this delete — otherwise saving this form would silently destroy them.
  await db.delete(cmsTestimonials).where(and(
    eq(cmsTestimonials.sectionId, id),
    eq(cmsTestimonials.isActive, true),
  ));

  const validTestimonials = input.testimonials.filter((t) => t.authorName);
  if (validTestimonials.length > 0) {
    await db.insert(cmsTestimonials).values(
      validTestimonials.map((t, i) => ({
        sectionId: id,
        authorName: t.authorName,
        authorRole: t.authorRole,
        avatarUrl: t.avatarUrl,
        avatarAlt: t.avatarAlt,
        initials: t.initials,
        accentColor: t.accentColor,
        rating: t.rating,
        body: t.body,
        sortOrder: i,
        isActive: true,
        source: "admin",
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/cms/testimonials");
  revalidatePath("/admin/reviews");
}