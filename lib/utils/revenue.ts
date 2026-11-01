// lib/utils/revenue.ts
//
// THE revenue definition for the whole app. Every screen, email, export and
// ledger that totals up money from orders goes through the helpers below, so the
// same period always yields the same figure wherever it is shown.
//
//   Revenue  = money RECEIVED from customers in the period ("by payment"):
//
//   • fully paid   → the whole totalPrice, dated by paidAt (createdAt for legacy rows)
//   • partial (DP) → the amountPaid received so far, dated by createdAt (the DP is
//                    normally taken when the order is created, and — like unpaid
//                    orders elsewhere — a partial order has no paidAt yet)
//   • unpaid       → nothing
//
// Once a partial order is settled it flips to "paid" and its full price moves to
// paidAt, so the DP is never counted twice.
//
// The other way of looking at the same orders is "by order": every order on the
// day it was PLACED at its full price (`placed` in summarizeRevenue), of which
// `collected` has been received so far and `outstanding` is still owed. Both
// views come out of summarizeRevenue() so they always reconcile.

export interface RevenueOrder {
  totalPrice:     string | null;
  paymentStatus:  string;
  amountPaid?:    string | null;
  paymentMethod?: string | null;
  paidAt:         Date | null;
  createdAt:      Date;
}

/** The fields the amount-only helpers need. */
export type PaymentFields = Pick<RevenueOrder, "totalPrice" | "paymentStatus" | "amountPaid">;

const num = (v: string | null | undefined) => {
  const n = parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
};
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Money this order has brought in, and the date it should be booked on. */
export function revenueEvent(o: RevenueOrder): { amount: number; date: Date } | null {
  if (o.paymentStatus === "paid") {
    return { amount: num(o.totalPrice), date: new Date(o.paidAt ?? o.createdAt) };
  }
  if (o.paymentStatus === "partial") {
    const amount = num(o.amountPaid);
    return amount > 0 ? { amount, date: new Date(o.createdAt) } : null;
  }
  return null;
}

/** Total revenue from `rows` whose event date falls in [from, to] (to optional). */
export function sumRevenue(rows: RevenueOrder[], from: Date, to?: Date): number {
  let total = 0;
  for (const o of rows) {
    const ev = revenueEvent(o);
    if (ev && ev.date >= from && (!to || ev.date <= to)) total += ev.amount;
  }
  return total;
}

/** Money received against this order so far, whatever the date. */
export function collectedAmount(o: PaymentFields): number {
  if (o.paymentStatus === "paid")    return num(o.totalPrice);
  if (o.paymentStatus === "partial") return num(o.amountPaid);
  return 0;
}

/** What the customer still owes on this order (0 once it is paid). */
export function outstandingAmount(o: PaymentFields): number {
  if (o.paymentStatus === "paid") return 0;
  return Math.max(0, round2(num(o.totalPrice) - collectedAmount(o)));
}

/**
 * What the customer owed on this order at the end of `asOf`, replaying the order
 * through the same events revenueEvent() books. Summed over every order this is
 * the "Piutang Usaha" balance on that date.
 */
export function balanceAsOf(o: RevenueOrder, asOf: Date): number {
  if (new Date(o.createdAt) > asOf) return 0;
  const ev        = revenueEvent(o);
  const collected = ev && ev.date <= asOf ? ev.amount : 0;
  return Math.max(0, round2(num(o.totalPrice) - collected));
}

// ─── Summary for a window ─────────────────────────────────────────────────────

export type RevenueMethod = "cash" | "transfer" | "qris" | "other";
const METHOD_ORDER: RevenueMethod[] = ["cash", "transfer", "qris", "other"];

const methodOf = (m: string | null | undefined): RevenueMethod =>
  m === "cash" || m === "transfer" || m === "qris" ? m : "other";

export interface RevenueSummary {
  /** Money received in the window — the figure every page calls "revenue". */
  revenue:  number;
  /** How many receipts that is (orders paid in full + DPs taken). */
  payments: number;
  /** Revenue split by the method of the order's latest payment. */
  byMethod: { method: RevenueMethod; amount: number; count: number }[];
  /** The same orders seen "by order": everything PLACED in the window. */
  placed: {
    orders:      number;
    value:       number;
    /** Received so far against those orders (on any day). */
    collected:   number;
    outstanding: number;
  };
}

export function summarizeRevenue(rows: RevenueOrder[], from: Date, to?: Date): RevenueSummary {
  const inWindow = (d: Date) => d >= from && (!to || d <= to);

  let revenue = 0, payments = 0;
  const methods = new Map<RevenueMethod, { amount: number; count: number }>();
  const placed  = { orders: 0, value: 0, collected: 0, outstanding: 0 };

  for (const o of rows) {
    const ev = revenueEvent(o);
    if (ev && inWindow(ev.date)) {
      revenue += ev.amount;
      payments++;
      const key = methodOf(o.paymentMethod);
      const cur = methods.get(key) ?? { amount: 0, count: 0 };
      cur.amount += ev.amount;
      cur.count++;
      methods.set(key, cur);
    }
    if (inWindow(new Date(o.createdAt))) {
      placed.orders++;
      placed.value       += num(o.totalPrice);
      placed.collected   += collectedAmount(o);
      placed.outstanding += outstandingAmount(o);
    }
  }

  return {
    revenue:  round2(revenue),
    payments,
    byMethod: METHOD_ORDER.filter((m) => methods.has(m)).map((m) => ({
      method: m, amount: round2(methods.get(m)!.amount), count: methods.get(m)!.count,
    })),
    placed: {
      orders:      placed.orders,
      value:       round2(placed.value),
      collected:   round2(placed.collected),
      outstanding: round2(placed.outstanding),
    },
  };
}
