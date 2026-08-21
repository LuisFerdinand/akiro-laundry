/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/special-requests.ts
"use server";

import { db } from "@/lib/db";
import { orders, orderItems, orderSpecialRequests } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface SpecialRequestActionResult {
  success: boolean;
  error?:  string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function revalidateOrderPaths(orderId: number) {
  revalidatePath(`/employee/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);
}

// The Neon HTTP driver used by this project does not support interactive
// transactions, so — same as the rest of lib/actions — writes here are
// sequential rather than wrapped in db.transaction().

/** Recompute orders.totalPrice from scratch = sum(items) + sum(special requests). */
async function recomputeOrderTotal(orderId: number) {
  const [itemsSum] = await db
    .select({ total: sql<string>`coalesce(sum(${orderItems.subtotal}), 0)` })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const [requestsSum] = await db
    .select({ total: sql<string>`coalesce(sum(${orderSpecialRequests.priceAdjustment}), 0)` })
    .from(orderSpecialRequests)
    .where(eq(orderSpecialRequests.orderId, orderId));

  const newTotal = parseFloat(itemsSum?.total ?? "0") + parseFloat(requestsSum?.total ?? "0");

  await db
    .update(orders)
    .set({ totalPrice: newTotal.toFixed(2), updatedAt: new Date() })
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

    const [order] = await db.select({ paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { success: false, error: "Order not found." };
    if (order.paymentStatus === "paid")
      return { success: false, error: "This order is already paid — its total can't be changed." };

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
    const [order] = await db.select({ paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { success: false, error: "Order not found." };
    if (order.paymentStatus === "paid")
      return { success: false, error: "This order is already paid — its total can't be changed." };

    await db.delete(orderSpecialRequests).where(eq(orderSpecialRequests.id, id));
    await recomputeOrderTotal(orderId);

    revalidateOrderPaths(orderId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to remove special request." };
  }
}
