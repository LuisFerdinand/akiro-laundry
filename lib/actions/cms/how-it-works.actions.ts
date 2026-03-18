// lib/actions/cms/how-it-works.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsHowItWorksSection, cmsHowItWorksSteps } from "@/lib/db/schema/cms";

export async function saveHowItWorks(input: {
  sectionId?: number; badge: string; headline: string; subtext: string;
  steps: Array<{ id?: number; stepNumber: string; title: string; description: string; imageUrl: string | null; imageAlt: string | null; accentColor: string; sortOrder: number }>;
}) {
  let id = input.sectionId;
  const base = { badge: input.badge, headline: input.headline, subtext: input.subtext, updatedAt: new Date() };
  if (id) { await db.update(cmsHowItWorksSection).set(base).where(eq(cmsHowItWorksSection.id, id)); }
  else { const [r] = await db.insert(cmsHowItWorksSection).values({ ...base, isActive: true }).returning({ id: cmsHowItWorksSection.id }); id = r.id; }
  await db.delete(cmsHowItWorksSteps).where(eq(cmsHowItWorksSteps.sectionId, id));
  if (input.steps.length > 0) await db.insert(cmsHowItWorksSteps).values(input.steps.filter((s) => s.title).map((s, i) => ({ sectionId: id!, ...s, sortOrder: i, isActive: true })));
  revalidatePath("/"); revalidatePath("/admin/cms/how-it-works");
}