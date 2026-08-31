// lib/utils/business-time.ts
//
// Server code (Vercel, defaults to UTC) and local dev machines run in
// different system timezones. Any "today" / "this week" / "this month" /
// "hour of day" boundary built from `new Date()` + the local getters
// (getFullYear/getMonth/getDate/getHours/setHours/setDate) silently uses
// whichever timezone the *process* happens to be running in — so the same
// database can render different dashboard numbers depending on where the
// code executes. The shop operates on Asia/Dili time (also used for
// receipts, see lib/utils/receipt-lines.ts), so every "what day/hour is it
// for the business" calculation must be pinned to that timezone explicitly,
// regardless of server locale.

export const BUSINESS_TIMEZONE = "Asia/Dili"; // UTC+9, no DST
const OFFSET_MS = 9 * 60 * 60 * 1000;

/** The same instant, shifted so its UTC getters read as Asia/Dili local time. */
function shiftToBusinessTz(date: Date): Date {
  return new Date(date.getTime() + OFFSET_MS);
}

/** Midnight (business-local) of the day containing `date`, as a real instant. */
export function startOfDayBiz(date: Date): Date {
  const s = shiftToBusinessTz(date);
  const utcMidnight = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  return new Date(utcMidnight - OFFSET_MS);
}

/** Last instant (23:59:59.999 business-local) of the day containing `date`. */
export function endOfDayBiz(date: Date): Date {
  return new Date(startOfDayBiz(date).getTime() + 86_400_000 - 1);
}

/** Midnight (business-local) of the 1st of the month containing `date`. */
export function startOfMonthBiz(date: Date): Date {
  const s = shiftToBusinessTz(date);
  const utcMidnight = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1);
  return new Date(utcMidnight - OFFSET_MS);
}

/** `n` calendar days before `date` — pure elapsed-time math (safe: no DST in Dili). */
export function subDaysBiz(date: Date, n: number): Date {
  return new Date(date.getTime() - n * 86_400_000);
}

/** Midnight (business-local) of the 1st of the month, `n` months before `date`. */
export function subMonthsBiz(date: Date, n: number): Date {
  const s = shiftToBusinessTz(date);
  const utcFirstOfMonth = Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - n, 1);
  return new Date(utcFirstOfMonth - OFFSET_MS);
}

/** Hour-of-day (0-23) that `date` falls on, in business-local time. */
export function hourBiz(date: Date): number {
  return shiftToBusinessTz(date).getUTCHours();
}

/** `Intl.DateTimeFormat`, pre-pinned to the business timezone. */
export function formatBiz(date: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: BUSINESS_TIMEZONE }).format(date);
}

// ─── Finance period presets ──────────────────────────────────────────────────
// Pure helper (no "use server") shared by the Buku Besar / Buku Kecil pages and
// their clients. Boundaries follow the same plain-Date convention as
// lib/actions/export.ts (`new Date(iso + "T00:00:00")`), not business-tz.

export type FinancePeriod =
  | "this_month" | "last_month" | "last_3_months" | "this_year" | "all";

export const FINANCE_PERIODS: { value: FinancePeriod; label: string }[] = [
  { value: "this_month",    label: "This Month"    },
  { value: "last_month",    label: "Last Month"    },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "this_year",     label: "This Year"     },
  { value: "all",           label: "All Time"      },
];

export function financePeriodRange(period: FinancePeriod): { from: string; to: string; label: string } {
  const iso = (d: Date) => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const now   = new Date();
  const today = iso(now);
  const label = FINANCE_PERIODS.find((p) => p.value === period)?.label ?? "This Month";

  switch (period) {
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last  = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(first), to: iso(last), label };
    }
    case "last_3_months":
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: today, label };
    case "this_year":
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: today, label };
    case "all":
      return { from: "2000-01-01", to: today, label };
    case "this_month":
    default:
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today, label };
  }
}
