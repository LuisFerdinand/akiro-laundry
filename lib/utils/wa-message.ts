// lib/utils/wa-message.ts
//
// Each order status has exactly ONE freeform WhatsApp message. Nothing is ever
// auto-appended to it — the admin's saved text for a status, after substituting
// any {{variable}} tokens, IS the entire outgoing message, verbatim.

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── Clothes count ({{clothesCount}} / {{clothesTotal}}) ──────────────────────

export interface WaClothesCountLine {
  name:     string;
  quantity: number;
}

function counted(lines: WaClothesCountLine[] | null | undefined): WaClothesCountLine[] {
  return (lines ?? []).filter((l) => l.quantity > 0);
}

/** {{clothesCount}} — one "• Baju — 6 pcs" line per item, then a bold total. "" when nothing was counted. */
export function formatWaClothesCount(lines: WaClothesCountLine[] | null | undefined): string {
  const list = counted(lines);
  if (list.length === 0) return "";
  const total = list.reduce((s, l) => s + l.quantity, 0);
  return [
    ...list.map((l) => `• ${l.name} — ${l.quantity} pcs`),
    `*Total: ${total} pcs*`,
  ].join("\n");
}

/** {{clothesTotal}} — total pieces, e.g. "13 pcs". "" when nothing was counted. */
export function formatWaClothesTotal(lines: WaClothesCountLine[] | null | undefined): string {
  const total = counted(lines).reduce((s, l) => s + l.quantity, 0);
  return total > 0 ? `${total} pcs` : "";
}

/**
 * For an order with no clothes count, drops every template line that uses
 * {{clothesCount}} or {{clothesTotal}} — so a line like "👕 Ropa: {{clothesTotal}}"
 * disappears instead of being sent half-empty.
 */
export function dropEmptyClothesLines(template: string, hasCount: boolean): string {
  if (hasCount) return template;
  return template
    .split("\n")
    .filter((line) => !/\{\{clothes(Count|Total)\}\}/.test(line))
    .join("\n");
}
