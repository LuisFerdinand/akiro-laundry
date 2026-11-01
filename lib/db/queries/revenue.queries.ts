// lib/db/queries/revenue.queries.ts
//
// The one query that feeds lib/utils/revenue.ts: every order that can produce a
// revenue event or count as "placed" inside a window. Pages, emails and ledgers
// fetch their rows here instead of hand-rolling their own order selects.

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { and, gte, lte, or } from "drizzle-orm";
import type { RevenueOrder } from "@/lib/utils/revenue";

export interface RevenueRow extends RevenueOrder {
  id:          number;
  orderNumber: string;
  customerId:  number;
  status:      string;
}

/**
 * Orders placed OR paid inside [from, to] (to optional = open-ended). A partial
 * order's DP is dated by createdAt, a settled one by paidAt, so both columns are
 * matched; revenueEvent()/summarizeRevenue() then decide what counts where.
 */
export async function fetchRevenueRows(from: Date, to?: Date): Promise<RevenueRow[]> {
  const inRange = (col: typeof orders.createdAt | typeof orders.paidAt) =>
    to ? and(gte(col, from), lte(col, to)) : gte(col, from);

  const rows = await db
    .select({
      id:            orders.id,
      orderNumber:   orders.orderNumber,
      customerId:    orders.customerId,
      status:        orders.status,
      totalPrice:    orders.totalPrice,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      amountPaid:    orders.amountPaid,
      paidAt:        orders.paidAt,
      createdAt:     orders.createdAt,
    })
    .from(orders)
    .where(or(inRange(orders.createdAt), inRange(orders.paidAt)));

  return rows;
}
