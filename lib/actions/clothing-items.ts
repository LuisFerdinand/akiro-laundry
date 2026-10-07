// lib/actions/clothing-items.ts
"use server";
//
// Clothes count: the admin-managed list of clothing items, which items each
// service counts, and recording an order's count after drop-off.

import { db } from "@/lib/db";
import { clothingItems, serviceClothingItems, orders } from "@/lib/db/schema";
import type { ClothingItem } from "@/lib/db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { writeOrderClothesCounts } from "@/lib/db/clothes-counts";
import type { ClothesCountLine, ClothingSetup } from "@/lib/utils/clothes-count";

export interface ClothingActionResult {
  success: boolean;
  error?:  string;
}

function revalidateClothingPages() {
  revalidatePath("/admin/services");
  revalidatePath("/employee/orders/new");
}

function errorMessage(e: unknown, fallback: string): string {
  const code = (e as { code?: string } | null)?.code;
  if (code === "23505") return "A clothing item with that name already exists.";
  return e instanceof Error && e.message ? e.message : fallback;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Active items + which items each service counts — what the count pickers need. */
export async function getClothingSetup(): Promise<ClothingSetup> {
  const [items, links] = await Promise.all([
    db.select().from(clothingItems)
      .where(eq(clothingItems.isActive, true))
      .orderBy(asc(clothingItems.sortOrder), asc(clothingItems.name)),
    db.select({ serviceId: serviceClothingItems.serviceId, clothingItemId: serviceClothingItems.clothingItemId })
      .from(serviceClothingItems),
  ]);

  const active = new Set(items.map((i) => i.id));
  const byService: Record<number, number[]> = {};
  for (const l of links) {
    if (!active.has(l.clothingItemId)) continue;
    (byService[l.serviceId] ??= []).push(l.clothingItemId);
  }
  return { items: items.map((i) => ({ id: i.id, name: i.name, sortOrder: i.sortOrder })), byService };
}

export type ClothingItemWithUsage = ClothingItem & { serviceCount: number };

/** Every clothing item, inactive ones included, with how many services count it — for the admin list. */
export async function getAllClothingItems(): Promise<ClothingItemWithUsage[]> {
  const rows = await db
    .select({ item: clothingItems, serviceCount: sql<number>`count(${serviceClothingItems.id})::int` })
    .from(clothingItems)
    .leftJoin(serviceClothingItems, eq(serviceClothingItems.clothingItemId, clothingItems.id))
    .groupBy(clothingItems.id)
    .orderBy(asc(clothingItems.sortOrder), asc(clothingItems.name));
  return rows.map((r) => ({ ...r.item, serviceCount: Number(r.serviceCount) }));
}

// ─── Admin: clothing items ────────────────────────────────────────────────────

export async function createClothingItem(name: string): Promise<ClothingActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Enter a name." };
  try {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${clothingItems.sortOrder}), 0)` })
      .from(clothingItems);
    await db.insert(clothingItems).values({ name: trimmed, sortOrder: Number(max) + 1 });
    revalidateClothingPages();
    return { success: true };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to add the item.") };
  }
}

export async function updateClothingItem(
  id: number,
  data: { name?: string; isActive?: boolean },
): Promise<ClothingActionResult> {
  const name = data.name?.trim();
  if (data.name !== undefined && !name) return { success: false, error: "Enter a name." };
  try {
    await db
      .update(clothingItems)
      .set({
        ...(name && { name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      })
      .where(eq(clothingItems.id, id));
    revalidateClothingPages();
    return { success: true };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to update the item.") };
  }
}

/** Hard delete — service links go with it; past orders keep the item's name. */
export async function deleteClothingItem(id: number): Promise<ClothingActionResult> {
  try {
    await db.delete(clothingItems).where(eq(clothingItems.id, id));
    revalidateClothingPages();
    return { success: true };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to delete the item.") };
  }
}

/** Saves a drag-and-drop ordering: `ids` is the full list in its new display order. */
export async function reorderClothingItems(ids: number[]): Promise<ClothingActionResult> {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id)))];
  if (unique.length === 0) return { success: true };
  try {
    const cases = sql.join(unique.map((id, i) => sql`when ${id} then ${i + 1}`), sql` `);
    await db
      .update(clothingItems)
      .set({ sortOrder: sql`case ${clothingItems.id} ${cases} else ${clothingItems.sortOrder} end` })
      .where(inArray(clothingItems.id, unique));
    revalidateClothingPages();
    return { success: true };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to save the new order.") };
  }
}

/** Replaces the set of clothing items a service counts. */
export async function setServiceClothingItems(serviceId: number, itemIds: number[]): Promise<ClothingActionResult> {
  try {
    const unique = [...new Set(itemIds.filter((id) => Number.isInteger(id)))];
    await db.delete(serviceClothingItems).where(eq(serviceClothingItems.serviceId, serviceId));
    if (unique.length > 0) {
      await db.insert(serviceClothingItems).values(unique.map((clothingItemId) => ({ serviceId, clothingItemId })));
    }
    revalidateClothingPages();
    return { success: true };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to save the items to count.") };
  }
}

// ─── Orders: record / correct a count after drop-off ─────────────────────────

/**
 * Saves the clothes count for an existing order — how staff record a count they
 * did after drop-off. A count made *with the customer* is on their receipt, so
 * changing it afterwards bumps the order's edit counter ("Edited" flag).
 * Orders from before counting existed are treated as counted by staff.
 */
export async function saveOrderClothesCount(
  orderId: number,
  lines:   ClothesCountLine[],
): Promise<ClothingActionResult> {
  try {
    const [order] = await db
      .select({ id: orders.id, mode: orders.clothesCountMode, editCount: orders.editCount })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return { success: false, error: "Order not found." };

    await writeOrderClothesCounts(orderId, lines);
    await db
      .update(orders)
      .set({
        clothesCountMode: order.mode ?? "staff",
        updatedAt:        new Date(),
        ...(order.mode === "customer" && { editCount: order.editCount + 1 }),
      })
      .where(eq(orders.id, orderId));

    revalidatePath(`/employee/orders/${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/employee/orders");
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to save the count.") };
  }
}
