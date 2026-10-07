// lib/utils/revenue.ts
//
// Order-based revenue convention shared by every page that totals up money
// collected from orders:
//
//   • fully paid   → the whole totalPrice, dated by paidAt (createdAt for legacy rows)
//   • partial (DP) → the amountPaid received so far, dated by createdAt (the DP is
//                    normally taken when the order is created, and — like unpaid
//                    orders elsewhere — a partial order has no paidAt yet)
//   • unpaid       → nothing
//
// Once a partial order is settled it flips to "paid" and its full price moves to
// paidAt, so the DP is never counted twice.

export interface RevenueOrder {
  totalPrice:    string | null;
  paymentStatus: string;
  amountPaid?:   string | null;
  paidAt:        Date | null;
  createdAt:     Date;
}

/** Money this order has brought in, and the date it should be booked on. */
export function revenueEvent(o: RevenueOrder): { amount: number; date: Date } | null {
  if (o.paymentStatus === "paid") {
    return { amount: parseFloat(o.totalPrice ?? "0"), date: new Date(o.paidAt ?? o.createdAt) };
  }
  if (o.paymentStatus === "partial") {
    const amount = parseFloat(o.amountPaid ?? "0");
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
