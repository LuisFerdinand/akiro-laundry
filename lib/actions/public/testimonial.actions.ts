// lib/actions/public/testimonial.actions.ts
"use server";

import { db }  from "@/lib/db";
import { eq }  from "drizzle-orm";
import { cmsTestimonialsSection, cmsTestimonials } from "@/lib/db/schema/cms";

export interface TestimonialSubmission {
  authorName: string;
  authorRole: string;
  rating:     number;
  body:       string;
}

export interface SubmitResult {
  success: boolean;
  error?:  string;
}

// Accent colours cycled for new submissions
const ACCENT_COLOURS = [
  "#1a7fba", "#10b981", "#8b5cf6",
  "#ec4899", "#f59e0b", "#0d9488",
];

function randomAccent(): string {
  return ACCENT_COLOURS[Math.floor(Math.random() * ACCENT_COLOURS.length)];
}

function buildInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export async function submitTestimonial(
  input: TestimonialSubmission,
): Promise<SubmitResult> {
  // ── Validation ────────────────────────────────────────────────────────────
  if (!input.authorName.trim()) return { success: false, error: "Please enter your name." };
  if (!input.authorRole.trim()) return { success: false, error: "Please tell us your role or how you use our service." };
  if (!input.body.trim())       return { success: false, error: "Please write your review." };
  if (input.body.trim().length < 20) return { success: false, error: "Review is too short — tell us a bit more!" };
  if (input.rating < 1 || input.rating > 5) return { success: false, error: "Please choose a star rating." };

  try {
    // Get or create the active testimonials section
    let [section] = await db
      .select()
      .from(cmsTestimonialsSection)
      .where(eq(cmsTestimonialsSection.isActive, true))
      .limit(1);

    if (!section) {
      [section] = await db
        .insert(cmsTestimonialsSection)
        .values({
          badge:           "Customer Love",
          headline:        "Trusted by Thousands",
          subtext:         "Don't just take our word for it.",
          aggregateRating: "4.9",
          reviewCount:     "0",
          isActive:        true,
        })
        .returning();
    }

    // Get current max sortOrder so new item goes to the end
    const existing = await db
      .select({ sortOrder: cmsTestimonials.sortOrder })
      .from(cmsTestimonials)
      .where(eq(cmsTestimonials.sectionId, section.id));

    const nextOrder = existing.length > 0
      ? Math.max(...existing.map((r) => r.sortOrder)) + 1
      : 0;

    // Insert — isActive: false means it won't show publicly until approved
    await db.insert(cmsTestimonials).values({
      sectionId:   section.id,
      authorName:  input.authorName.trim(),
      authorRole:  input.authorRole.trim(),
      avatarUrl:   null,
      avatarAlt:   null,
      initials:    buildInitials(input.authorName),
      accentColor: randomAccent(),
      rating:      input.rating,
      body:        input.body.trim(),
      sortOrder:   nextOrder,
      isActive:    false, // pending admin approval
    });

    return { success: true };
  } catch (err) {
    console.error("[submitTestimonial]", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}