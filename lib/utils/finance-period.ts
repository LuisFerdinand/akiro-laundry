// lib/utils/finance-period.ts
//
// One period model for Buku Besar and Buku Kecil, read from the URL
// (?period=this_month  or  ?from=2026-10-01&to=2026-10-31). Pure calendar math in
// the shop's timezone, so server and browser always agree.

import {
  FINANCE_PERIODS, addDaysISO, financePeriodRange, formatDateBiz, isoDayBiz,
  type FinancePeriod,
} from "@/lib/utils/business-time";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface FinanceRange {
  period: FinancePeriod | "custom";
  from:   string;
  to:     string;
  label:  string;
}

export function resolveFinanceRange(sp: { period?: string; from?: string; to?: string }): FinanceRange {
  if (sp.from && sp.to && ISO_DAY.test(sp.from) && ISO_DAY.test(sp.to) && sp.from <= sp.to) {
    const day = (iso: string) => formatDateBiz(`${iso}T12:00:00Z`);
    return {
      period: "custom",
      from:   sp.from,
      to:     sp.to,
      label:  sp.from === sp.to ? day(sp.from) : `${day(sp.from)} – ${day(sp.to)}`,
    };
  }
  const period = FINANCE_PERIODS.some((p) => p.value === sp.period) ? (sp.period as FinancePeriod) : "this_month";
  return { period, ...financePeriodRange(period) };
}

/** Shortcut ranges shown next to the presets, resolved against the shop's "today". */
export function quickRanges(now: Date = new Date()): { label: string; from: string; to: string }[] {
  const today = isoDayBiz(now);
  return [
    { label: "Today",        from: today,                 to: today },
    { label: "Yesterday",    from: addDaysISO(today, -1), to: addDaysISO(today, -1) },
    { label: "Last 7 days",  from: addDaysISO(today, -6), to: today },
    { label: "Last 30 days", from: addDaysISO(today, -29), to: today },
  ];
}

/** `?from=…&to=…` for a range, `?period=…` for a preset — the inverse of resolveFinanceRange. */
export function rangeQuery(range: Pick<FinanceRange, "period" | "from" | "to">): string {
  return range.period === "custom" ? `from=${range.from}&to=${range.to}` : `period=${range.period}`;
}
