/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/special-requests.ts
"use server";

import { db } from "@/lib/db";
import { orders, orderItems, orderSpecialRequests } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { paymentAfterTotalChange } from "@/lib/utils/order-payment";

export interface SpecialRequestActionResult {
  success: boolean;
  error?:  string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function revalidateOrderPaths(orderId: number) {
  revalidatePath(`/employee/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/employee/orders");
  revalidatePath("/admin/orders");
}

// The Neon HTTP driver used by this project does not support interactive
// transactions, so — same as the rest of lib/actions — writes here are
// sequential rather than wrapped in db.transaction().

/**
 * Recompute orders.totalPrice from scratch = sum(items) + sum(special requests).
 *
 * On an order that already has a payment the change never touches the cash
 * register; the payment status just follows the new total (balance due /
 * overpaid — see lib/utils/order-payment.ts) and it counts as an edit, so the
 * order shows the "Edited after payment" flag.
 */
async function recomputeOrderTotal(orderId: number) {
  // Read before the update: amountReceived() needs the pre-change total.
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found.");

  const [itemsSum] = await db
    .select({ total: sql<string>`coalesce(sum(${orderItems.subtotal}), 0)` })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const [requestsSum] = await db
    .select({ total: sql<string>`coalesce(sum(${orderSpecialRequests.priceAdjustment}), 0)` })
    .from(orderSpecialRequests)
    .where(eq(orderSpecialRequests.orderId, orderId));

  const newTotal = Math.round(
    (parseFloat(itemsSum?.total ?? "0") + parseFloat(requestsSum?.total ?? "0")) * 100,
  ) / 100;

  const now     = new Date();
  const hasPaid = order.paymentStatus !== "unpaid";
  await db
    .update(orders)
    .set({
      totalPrice: newTotal.toFixed(2),
      updatedAt:  now,
      ...(hasPaid && {
        ...paymentAfterTotalChange(order, newTotal, now),
        editCount: order.editCount + 1,
      }),
    })
    .where(eq(orders.id, orderId));

  return newTotal;
}

// ─── Add ──────────────────────────────────────────────────────────────────────

export async function addSpecialRequest(
  orderId:     number,
  description: string,
  amount:      number,
  direction:   "add" | "subtract",
): Promise<SpecialRequestActionResult> {
  try {
    if (!description.trim()) return { success: false, error: "Description is required." };
    if (!amount || isNaN(amount) || amount <= 0)
      return { success: false, error: "Enter an amount greater than 0." };

    const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { success: false, error: "Order not found." };

    const priceAdjustment = direction === "subtract" ? -Math.abs(amount) : Math.abs(amount);

    await db.insert(orderSpecialRequests).values({
      orderId,
      description:     description.trim(),
      priceAdjustment: priceAdjustment.toFixed(2),
    });
    await recomputeOrderTotal(orderId);

    revalidateOrderPaths(orderId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to add special request." };
  }
}

// ─── Remove ───────────────────────────────────────────────────────────────────

export async function removeSpecialRequest(
  id:      number,
  orderId: number,
): Promise<SpecialRequestActionResult> {
  try {
    const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { success: false, error: "Order not found." };

    await db
      .delete(orderSpecialRequests)
      .where(and(eq(orderSpecialRequests.id, id), eq(orderSpecialRequests.orderId, orderId)));
    await recomputeOrderTotal(orderId);

    revalidateOrderPaths(orderId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to remove special request." };
  }
}
