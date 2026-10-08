// lib/utils/clothes-count.ts
//
// The clothes count taken at drop-off. Pure — shared by the new-order flow, the
// order pages, the receipt and the server actions.
//
// Two ways to count:
//   • "customer" — counted together with the customer, in front of them. The
//                  count is printed on the receipt.
//   • "staff"    — the customer leaves the clothes with us and staff count them
//                  afterwards. Not on the first receipt; once recorded it
//                  prints when the receipt is reprinted.

export type ClothesCountMode = "customer" | "staff";

export const CLOTHES_COUNT_MODES: ClothesCountMode[] = ["customer", "staff"];

export function isClothesCountMode(v: unknown): v is ClothesCountMode {
  return v === "customer" || v === "staff";
}

/** One counted line — `name` is kept so the count reads the same if the item is renamed later. */
export interface ClothesCountLine {
  clothingItemId: number | null;
  name:           string;
  quantity:       number;
}

export interface ClothesCountFormData {
  mode:  ClothesCountMode | null;
  lines: ClothesCountLine[];
}

export const EMPTY_CLOTHES_COUNT: ClothesCountFormData = { mode: null, lines: [] };

/** A clothing item as the pickers need it. */
export interface ClothingItemOption {
  id:        number;
  name:      string;
  sortOrder: number;
}

/** Clothing setup for the pickers: active items + which items each service counts. */
export interface ClothingSetup {
  items:     ClothingItemOption[];
  /** serviceId → clothing item ids to count for that service. */
  byService: Record<number, number[]>;
}

export function totalPieces(lines: { quantity: number }[]): number {
  return lines.reduce((s, l) => s + (l.quantity > 0 ? l.quantity : 0), 0);
}

/** Lines worth saving or printing: positive whole numbers only. */
export function countedLines<T extends { quantity: number }>(lines: T[]): T[] {
  return lines.filter((l) => Number.isInteger(l.quantity) && l.quantity > 0);
}

/**
 * Items to offer for an order: those mapped to its services first (in admin
 * order), then the rest. `suggested` is empty when no service has a mapping —
 * callers then show every item.
 */
export function splitClothingItems(
  setup:      ClothingSetup,
  serviceIds: (number | null)[],
): { suggested: ClothingItemOption[]; others: ClothingItemOption[] } {
  const wanted = new Set<number>();
  for (const id of serviceIds) {
    if (id == null) continue;
    for (const itemId of setup.byService[id] ?? []) wanted.add(itemId);
  }
  const sorted = [...setup.items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return {
    suggested: sorted.filter((i) => wanted.has(i.id)),
    others:    sorted.filter((i) => !wanted.has(i.id)),
  };
}

/** Validation for the new-order count step. */
export function validateClothesCount(value: ClothesCountFormData): {
  valid: boolean; errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!value.mode) {
    errors.clothesCountMode = "Choose how the clothes are counted.";
  } else if (value.mode === "customer" && totalPieces(countedLines(value.lines)) === 0) {
    errors.clothesCountLines = "Count at least one piece with the customer.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Human label for a stored mode (null = order from before counting existed). */
export function clothesCountModeLabel(mode: string | null | undefined): string {
  return mode === "customer" ? "Counted with customer"
    : mode === "staff" ? "Counted by staff"
    : "Not recorded";
}
