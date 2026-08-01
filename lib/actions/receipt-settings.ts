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

// Guards against a malformed CSS width (e.g. "mm" with no number) ever reaching
// the DB — a broken value here silently breaks every printed receipt's layout.
const PAPER_WIDTH_RE = /^\d+(\.\d+)?(mm|cm|in|px)$/;

export async function updateReceiptSettings(
  id: number,
  data: Partial<Omit<ReceiptSettings, "id" | "updatedAt" | "isActive">>,
): Promise<{ success: boolean; error?: string }> {
  if (data.paperWidth !== undefined && !PAPER_WIDTH_RE.test(data.paperWidth)) {
    return { success: false, error: `Invalid paper width "${data.paperWidth}" — use a value like "58mm".` };
  }

  try {
    await db
      .update(receiptSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(receiptSettings.id, id));

    // Also revalidate the dynamic order-detail page that renders the print
    // button with these settings — plain revalidatePath("/employee/orders")
    // alone doesn't cover /employee/orders/[id], which is where receipts
    // actually get printed from.
    revalidatePath("/admin/receipt-settings");
    revalidatePath("/employee/orders");
    revalidatePath("/employee/orders/[id]", "page");
    return { success: true };
  } catch (err) {
    console.error("[updateReceiptSettings]", err);
    return { success: false, error: "Failed to update receipt settings." };
  }
}