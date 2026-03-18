// lib/actions/cms/testimonials.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsTestimonialsSection, cmsTestimonials } from "@/lib/db/schema/cms";

export async function saveTestimonials(input: {
  sectionId?: number; badge: string; headline: string; subtext: string; aggregateRating: string; reviewCount: string;
  testimonials: Array<{ id?: number; authorName: string; authorRole: string; avatarUrl: string | null; avatarAlt: string | null; initials: string; accentColor: string; rating: number; body: string; sortOrder: number }>;
}) {
  let id = input.sectionId;
  const base = { badge: input.badge, headline: input.headline, subtext: input.subtext, aggregateRating: input.aggregateRating, reviewCount: input.reviewCount, updatedAt: new Date() };
  if (id) { await db.update(cmsTestimonialsSection).set(base).where(eq(cmsTestimonialsSection.id, id)); }
  else { const [r] = await db.insert(cmsTestimonialsSection).values({ ...base, isActive: true }).returning({ id: cmsTestimonialsSection.id }); id = r.id; }
  await db.delete(cmsTestimonials).where(eq(cmsTestimonials.sectionId, id));
  if (input.testimonials.length > 0) await db.insert(cmsTestimonials).values(input.testimonials.filter((t) => t.authorName).map((t, i) => ({ sectionId: id!, ...t, sortOrder: i, isActive: true })));
  revalidatePath("/"); revalidatePath("/admin/cms/testimonials");
}