// lib/actions/wa-templates.ts
"use server";

import { db } from "@/lib/db";
import {
  waTemplateSettings,
  waStatusTemplates,
} from "@/lib/db/schema/whatsapp";
import type {
  WaTemplateSettings,
  WaStatusTemplate,
} from "@/lib/db/schema/whatsapp";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Order } from "@/lib/db/schema";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getWaTemplateSettings(): Promise<WaTemplateSettings | null> {
  const rows = await db
    .select()
    .from(waTemplateSettings)
    .where(eq(waTemplateSettings.isActive, true))
    .limit(1);
  return rows[0] ?? null;
}

export async function getWaStatusTemplates(): Promise<WaStatusTemplate[]> {
  return db
    .select()
    .from(waStatusTemplates)
    .where(eq(waStatusTemplates.isActive, true))
    .orderBy(waStatusTemplates.sortOrder);
}

export async function getWaStatusTemplate(
  status: Order["status"],
): Promise<WaStatusTemplate | null> {
  const rows = await db
    .select()
    .from(waStatusTemplates)
    .where(eq(waStatusTemplates.status, status))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Combined fetch (for the WhatsApp component) ─────────────────────────────

export interface WaTemplateData {
  settings:        WaTemplateSettings;
  statusTemplates: Record<Order["status"], string>;
}

export async function getWaTemplateData(): Promise<WaTemplateData | null> {
  const [settings, templates] = await Promise.all([
    getWaTemplateSettings(),
    getWaStatusTemplates(),
  ]);

  if (!settings) return null;

  const statusTemplates = {} as Record<Order["status"], string>;
  for (const t of templates) {
    statusTemplates[t.status] = t.bodyTemplate;
  }

  return { settings, statusTemplates };
}

// ─── Update settings ──────────────────────────────────────────────────────────

export async function updateWaTemplateSettings(
  id: number,
  data: Partial<Omit<WaTemplateSettings, "id" | "updatedAt" | "isActive">>,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(waTemplateSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(waTemplateSettings.id, id));

    revalidatePath("/admin/wa-templates");
    revalidatePath("/employee/orders");
    return { success: true };
  } catch (err) {
    console.error("[updateWaTemplateSettings]", err);
    return { success: false, error: "Failed to update template settings." };
  }
}

// ─── Update a status template ─────────────────────────────────────────────────

export async function updateWaStatusTemplate(
  id: number,
  bodyTemplate: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(waStatusTemplates)
      .set({ bodyTemplate, updatedAt: new Date() })
      .where(eq(waStatusTemplates.id, id));

    revalidatePath("/admin/wa-templates");
    revalidatePath("/employee/orders");
    return { success: true };
  } catch (err) {
    console.error("[updateWaStatusTemplate]", err);
    return { success: false, error: "Failed to update status template." };
  }
}