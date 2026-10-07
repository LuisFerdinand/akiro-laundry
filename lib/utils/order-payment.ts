// lib/utils/order-payment.ts
//
// What an order's payment fields mean once its total can change after a
// payment (full or DP) was recorded. Pure — shared by updateOrder(), the
// special-request actions and the pages that show balance due / overpaid.
//
// Editing a paid order never touches the cash register: money already received
// stays received. Only the payment *status* follows the new total:
//   • received ≥ new total → "paid"    (any excess is "overpaid" — refund it by hand)
//   • received < new total → "partial" (the difference is a balance due, collected
//                                       through the normal payment flow)

export interface OrderPaymentState {
  totalPrice:           string;
  paymentStatus:        "unpaid" | "partial" | "paid";
  amountPaid:           string | null;
  paidAt:               Date | null;
  editedAfterPaymentAt: Date | null;
}

const num = (v: string | null | undefined) => {
  const n = parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Money applied to the order so far.
 *
 * A "paid" order that hasn't been edited since payment was covered exactly by
 * its total — its `amountPaid` can't be used here, because older orders stored
 * the cash handed over (change included). The first post-payment edit
 * normalises `amountPaid` to the applied amount and stamps
 * `editedAfterPaymentAt`, after which `amountPaid` is exact.
 */
export function amountReceived(o: OrderPaymentState): number {
  if (o.paymentStatus === "unpaid") return 0;
  if (o.paymentStatus === "paid" && !o.editedAfterPaymentAt) return round2(num(o.totalPrice));
  return round2(num(o.amountPaid));
}

/** Received vs. total: what's still owed, or what was paid too much. */
export function paymentBalance(o: OrderPaymentState): {
  received: number; balanceDue: number; overpaid: number;
} {
  const received = amountReceived(o);
  const diff     = round2(num(o.totalPrice) - received);
  return { received, balanceDue: diff > 0 ? diff : 0, overpaid: diff < 0 ? -diff : 0 };
}

/**
 * Payment fields to write when the order total changes to `newTotal`. Unpaid
 * orders are returned unchanged (and never stamped as edited after payment).
 */
export function paymentAfterTotalChange(
  o:        OrderPaymentState,
  newTotal: number,
  now:      Date = new Date(),
): Pick<OrderPaymentState, "paymentStatus" | "amountPaid" | "paidAt" | "editedAfterPaymentAt"> {
  if (o.paymentStatus === "unpaid") {
    return {
      paymentStatus:        o.paymentStatus,
      amountPaid:           o.amountPaid,
      paidAt:               o.paidAt,
      editedAfterPaymentAt: o.editedAfterPaymentAt,
    };
  }

  const received = amountReceived(o);
  const covered  = received + 0.005 >= round2(newTotal);
  return {
    paymentStatus:        covered ? "paid" : "partial",
    amountPaid:           received.toFixed(2),
    // Keep the original paid date while the order stays paid; a DP order that
    // the edit fully covers becomes paid now; a reopened balance clears it.
    paidAt:               covered ? (o.paymentStatus === "paid" && o.paidAt ? o.paidAt : now) : null,
    editedAfterPaymentAt: now,
  };
}
