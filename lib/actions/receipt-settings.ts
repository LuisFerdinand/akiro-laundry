// lib/actions/receipt-settings.ts
"use server";

import { db } from "@/lib/db";
import { receiptSettings } from "@/lib/db/schema/receipt";
import type { ReceiptSettings } from "@/lib/db/schema/receipt";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getReceiptSettings(): Promise<ReceiptSettings | null> {
  const rows = await db
    .select()
    .from(receiptSettings)
    .where(eq(receiptSettings.isActive, true))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateReceiptSettings(
  id: number,
  data: Partial<Omit<ReceiptSettings, "id" | "updatedAt" | "isActive">>,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(receiptSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(receiptSettings.id, id));

    revalidatePath("/admin/receipt-settings");
    revalidatePath("/employee/orders");
    return { success: true };
  } catch (err) {
    console.error("[updateReceiptSettings]", err);
    return { success: false, error: "Failed to update receipt settings." };
  }
}