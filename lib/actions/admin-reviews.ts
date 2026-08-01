/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/admin-reviews.ts
"use server";

import { db } from "@/lib/db";
import { cmsTestimonials } from "@/lib/db/schema/cms";
import type { CmsTestimonial } from "@/lib/db/schema/cms";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ReviewItem = CmsTestimonial;

export interface ReviewActionResult {
  success: boolean;
  error?:  string;
}

// ─── List every customer-submitted review (via the public /review form) ──────

export async function getCustomerReviews(): Promise<ReviewItem[]> {
  return db
    .select()
    .from(cmsTestimonials)
    .where(eq(cmsTestimonials.source, "customer"))
    .orderBy(desc(cmsTestimonials.createdAt));
}

// ─── Revalidate everywhere a review's visibility could show up ───────────────

function revalidateReviewConsumers(): void {
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/cms/testimonials");
  revalidatePath("/");
}

// ─── Approve — publish to the homepage testimonials carousel ─────────────────

export async function approveReview(id: number): Promise<ReviewActionResult> {
  try {
    await db.update(cmsTestimonials).set({ isActive: true }).where(eq(cmsTestimonials.id, id));
    revalidateReviewConsumers();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to approve review." };
  }
}

// ─── Unpublish — pull an already-approved review back down ───────────────────

export async function unapproveReview(id: number): Promise<ReviewActionResult> {
  try {
    await db.update(cmsTestimonials).set({ isActive: false }).where(eq(cmsTestimonials.id, id));
    revalidateReviewConsumers();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to unpublish review." };
  }
}

// ─── Delete permanently ────────────────────────────────────────────────────

export async function deleteReview(id: number): Promise<ReviewActionResult> {
  try {
    await db.delete(cmsTestimonials).where(eq(cmsTestimonials.id, id));
    revalidateReviewConsumers();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete review." };
  }
}
