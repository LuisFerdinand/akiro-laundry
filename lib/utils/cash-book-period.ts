// lib/utils/cash-book-period.ts
//
// Resolves the Daily Cash page's period from its URL search params. All of it is
// calendar math on YYYY-MM-DD strings in the shop's timezone (Asia/Dili), so the
// server (UTC on Vercel) and the browser always agree on what "today" is.

import { addDaysISO, isoDayBiz } from "@/lib/utils/business-time";

export type CashBookView = "daily" | "weekly" | "monthly" | "custom";

export interface CashBookPeriod {
  view:       CashBookView;
  /** First day of the period, YYYY-MM-DD (inclusive). */
  from:       string;
  /** Last day of the period, YYYY-MM-DD (inclusive). */
  to:         string;
  label:      string;
  /** The period contains today. */
  isCurrent:  boolean;
  /** Anchor date of the previous period (null for custom ranges). */
  prevAnchor: string | null;
  /** Anchor date of the next period — null when it would be entirely in the future. */
  nextAnchor: string | null;
}

export interface CashBookSearchParams {
  view?: string;
  date?: string;
  from?: string;
  to?:   string;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-31). */
function isISODate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  // The ISO date is a calendar day, not an instant — format it in UTC so no
  // timezone can shift it to the neighbouring day.
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00.000Z`));
}

/** "Tuesday, October 7, 2026" for one day, "Oct 6 – Oct 12, 2026" for a range. */
export function cashBookRangeLabel(from: string, to: string): string {
  if (from === to) {
    return fmt(from, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const a = fmt(from, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
  const b = fmt(to, { month: "short", day: "numeric", year: "numeric" });
  return `${a} – ${b}`;
}

/** Monday of the week containing `iso`. */
function startOfWeekISO(iso: string): string {
  const dow = new Date(`${iso}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
  return addDaysISO(iso, -((dow + 6) % 7));
}

/** 1st of the month `n` months away from the month containing `iso`. */
function monthStartISO(iso: string, n = 0): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}

function monthEndISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function resolveCashBookPeriod(
  sp: CashBookSearchParams,
  today: string = isoDayBiz(new Date()),
): CashBookPeriod {
  const { view: rawView, date, from: rawFrom, to: rawTo } = sp;

  // ── Custom range ──
  if (rawView === "custom" && isISODate(rawFrom) && isISODate(rawTo)) {
    let [from, to] = rawFrom <= rawTo ? [rawFrom, rawTo] : [rawTo, rawFrom];
    if (to > today) to = today;
    if (from > to) from = to;
    return {
      view: "custom", from, to,
      label:      cashBookRangeLabel(from, to),
      isCurrent:  to === today,
      prevAnchor: null,
      nextAnchor: null,
    };
  }

  // ── Daily / weekly / monthly, anchored on a date (default today) ──
  const view: CashBookView = rawView === "weekly" || rawView === "monthly" ? rawView : "daily";
  const anchor = isISODate(date) && date <= today ? date : today;

  let from: string, to: string, prev: string, next: string, label: string;
  if (view === "weekly") {
    from  = startOfWeekISO(anchor);
    to    = addDaysISO(from, 6);
    prev  = addDaysISO(from, -7);
    next  = addDaysISO(from, 7);
    label = cashBookRangeLabel(from, to);
  } else if (view === "monthly") {
    from  = monthStartISO(anchor);
    to    = monthEndISO(anchor);
    prev  = monthStartISO(anchor, -1);
    next  = monthStartISO(anchor, 1);
    label = fmt(from, { month: "long", year: "numeric" });
  } else {
    from  = anchor;
    to    = anchor;
    prev  = addDaysISO(anchor, -1);
    next  = addDaysISO(anchor, 1);
    label = cashBookRangeLabel(from, to);
  }

  return {
    view, from, to, label,
    isCurrent:  from <= today && today <= to,
    prevAnchor: prev,
    nextAnchor: next <= today ? next : null,
  };
}

/** URL of the Daily Cash page for a period — the URL is the single source of truth. */
export function cashBookHref(p: { view: CashBookView; date?: string; from?: string; to?: string }): string {
  const qs = new URLSearchParams();
  if (p.view === "custom") {
    qs.set("view", "custom");
    if (p.from) qs.set("from", p.from);
    if (p.to)   qs.set("to", p.to);
  } else {
    if (p.view !== "daily") qs.set("view", p.view);
    if (p.date) qs.set("date", p.date);
  }
  const s = qs.toString();
  return s ? `/admin/daily-cash?${s}` : "/admin/daily-cash";
}
