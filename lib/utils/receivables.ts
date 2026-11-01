// lib/utils/receivables.ts
//
// Aging buckets for the customer receivables ledger (Buku Kecil › Receivables).
// Pure, so the server action and the client share one definition.

export type AgingBucket = "current" | "week2" | "month" | "old";

export const AGING_BUCKETS: { key: AgingBucket; label: string; hint: string }[] = [
  { key: "current", label: "0–7 days",     hint: "Recent drop-offs" },
  { key: "week2",   label: "8–14 days",    hint: "Worth a reminder" },
  { key: "month",   label: "15–30 days",   hint: "Chase now" },
  { key: "old",     label: "Over 30 days", hint: "At risk" },
];

export function bucketOf(ageDays: number): AgingBucket {
  if (ageDays <= 7)  return "current";
  if (ageDays <= 14) return "week2";
  if (ageDays <= 30) return "month";
  return "old";
}

/** Whole days between an order being placed and the end of the reporting day. */
export function ageInDays(createdAt: Date, asOfEnd: Date): number {
  return Math.max(0, Math.floor((asOfEnd.getTime() - createdAt.getTime()) / 86_400_000));
}

export const BUCKET_TONE: Record<AgingBucket, { text: string; chip: string; bar: string }> = {
  current: { text: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500" },
  week2:   { text: "text-amber-700",   chip: "bg-amber-50 text-amber-700 ring-amber-200",       bar: "bg-amber-400" },
  month:   { text: "text-orange-700",  chip: "bg-orange-50 text-orange-700 ring-orange-200",    bar: "bg-orange-500" },
  old:     { text: "text-rose-700",    chip: "bg-rose-50 text-rose-700 ring-rose-200",          bar: "bg-rose-500" },
};
