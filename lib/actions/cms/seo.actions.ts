// lib/actions/cms/seo.actions.ts
"use server";

import { db }             from "@/lib/db";
import { eq }             from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cmsSeoSettings } from "@/lib/db/schema/cms";
import type { CmsSeoSettings } from "@/lib/db/schema/cms";

type SeoInput = Omit<CmsSeoSettings, "id" | "updatedAt">;

export async function saveSeoSettings(input: SeoInput) {
  const [existing] = await db.select({ id: cmsSeoSettings.id }).from(cmsSeoSettings).limit(1);

  if (existing) {
    await db
      .update(cmsSeoSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(cmsSeoSettings.id, existing.id));
  } else {
    await db.insert(cmsSeoSettings).values({ ...input });
  }

  // Bust layout cache so the live site picks up the changes immediately
  revalidatePath("/", "layout");
  revalidatePath("/admin/cms/seo");
}