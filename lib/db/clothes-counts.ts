// lib/db/clothes-counts.ts
//
// Server-only helper (imported by server actions, never by client code):
// replaces an order's clothes count rows. Quantities are cleaned up and item
// names are taken from the database, so a stale or tampered client can't write
// arbitrary names; lines for items that no longer exist keep the name they had.

import { db } from "@/lib/db";
import { clothingItems, orderClothingCounts } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { ClothesCountLine } from "@/lib/utils/clothes-count";

const MAX_PIECES_PER_LINE = 9999;

/** Positive whole quantities only; duplicate items are merged. */
export function cleanCountLines(lines: ClothesCountLine[] | null | undefined): ClothesCountLine[] {
  const merged = new Map<string, ClothesCountLine>();
  for (const l of lines ?? []) {
    const qty = Math.min(MAX_PIECES_PER_LINE, Math.floor(Number(l?.quantity)));
    const name = String(l?.name ?? "").trim();
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const id = typeof l.clothingItemId === "number" && Number.isInteger(l.clothingItemId) ? l.clothingItemId : null;
    if (id == null && !name) continue;
    const key = id != null ? `id:${id}` : `name:${name.toLowerCase()}`;
    const prev = merged.get(key);
    merged.set(key, { clothingItemId: id, name, quantity: (prev?.quantity ?? 0) + qty });
  }
  return [...merged.values()];
}

/** Deletes the order's current counts and writes `lines` (already cleaned or not). */
export async function writeOrderClothesCounts(orderId: number, lines: ClothesCountLine[]): Promise<number> {
  const clean = cleanCountLines(lines);

  const ids = clean.map((l) => l.clothingItemId).filter((id): id is number => id != null);
  const known = ids.length === 0 ? [] : await db
    .select({ id: clothingItems.id, name: clothingItems.name })
    .from(clothingItems)
    .where(inArray(clothingItems.id, ids));
  const nameById = new Map(known.map((k) => [k.id, k.name]));

  const rows = clean
    .map((l) => {
      const dbName = l.clothingItemId != null ? nameById.get(l.clothingItemId) : undefined;
      return {
        orderId,
        // An id that no longer exists is dropped to null, keeping the given name.
        clothingItemId: dbName ? l.clothingItemId : null,
        name:           dbName ?? l.name,
        quantity:       l.quantity,
      };
    })
    .filter((r) => r.name);

  await db.delete(orderClothingCounts).where(eq(orderClothingCounts.orderId, orderId));
  if (rows.length > 0) await db.insert(orderClothingCounts).values(rows);
  return rows.reduce((s, r) => s + r.quantity, 0);
}
