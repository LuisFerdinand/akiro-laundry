// lib/actions/cms/how-it-works.actions.ts
"use server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsHowItWorksSection, cmsHowItWorksSteps } from "@/lib/db/schema/cms";

export async function saveHowItWorks(input: {
  sectionId?: number;
  badge: string;
  headline: string;
  subtext: string;
  steps: Array<{
    id?: number;
    stepNumber: string;
    title: string;
    description: string;
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
    .select({ id: cmsHowItWorksSection.id })
    .from(cmsHowItWorksSection)
    .where(eq(cmsHowItWorksSection.isActive, true))
    .orderBy(desc(cmsHowItWorksSection.id))
    .limit(1);

  let id: number;

  if (existing) {
    id = existing.id;
    await db.update(cmsHowItWorksSection).set(base).where(eq(cmsHowItWorksSection.id, id));
  } else {
    const [r] = await db
      .insert(cmsHowItWorksSection)
      .values({ ...base, isActive: true })
      .returning({ id: cmsHowItWorksSection.id });
    id = r.id;
  }

  await db.delete(cmsHowItWorksSteps).where(eq(cmsHowItWorksSteps.sectionId, id));

  const validSteps = input.steps.filter((s) => s.title);
  if (validSteps.length > 0) {
    await db.insert(cmsHowItWorksSteps).values(
      validSteps.map((s, i) => ({
        sectionId: id,
        stepNumber: s.stepNumber,
        title: s.title,
        description: s.description,
        imageUrl: s.imageUrl,
        imageAlt: s.imageAlt,
        accentColor: s.accentColor,
        sortOrder: i,
        isActive: true,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/cms/how-it-works");
}