// lib/actions/payments.ts
"use server";

import { db } from "@/lib/db";
import {
  orders,
  cashRegister,
  cashRegisterTransactions,
} from "@/lib/db/schema";
import type { Order, CashRegister, CashRegisterTransaction } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessPaymentInput {
  orderId: number;
  paymentMethod: "cash" | "transfer" | "qris";
  /** How much the customer physically handed over (cash only; equals totalPrice for transfer/qris) */
  amountTendered: number;
}

export interface ProcessPaymentResult {
  success: boolean;
  change?: number;
  error?: string;
}

export interface CashRegisterState {
  balance: number;
  lastUpdatedAt: Date;
  recentTransactions: CashRegisterTransaction[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateRegister(): Promise<CashRegister> {
  const rows = await db.select().from(cashRegister).limit(1);
  if (rows[0]) return rows[0];
  // Bootstrap with zero balance on first use
  const [created] = await db
    .insert(cashRegister)
    .values({ balance: "0", notes: "Initial balance" })
    .returning();
  return created;
}

// ─── Get Cash Register State ──────────────────────────────────────────────────

export async function getCashRegisterState(): Promise<CashRegisterState> {
  const register = await getOrCreateRegister();
  const recentTransactions = await db
    .select()
    .from(cashRegisterTransactions)
    .orderBy(desc(cashRegisterTransactions.createdAt))
    .limit(20);

  return {
    balance: parseFloat(register.balance),
    lastUpdatedAt: register.lastUpdatedAt,
    recentTransactions,
  };
}

// ─── Set Initial / Adjust Cash Register Balance ───────────────────────────────

export async function setCashRegisterBalance(
  newBalance: number,
  reason: string = "Manual adjustment",
): Promise<{ success: boolean; error?: string }> {
  try {
    const register = await getOrCreateRegister();
    const oldBalance = parseFloat(register.balance);
    const diff = newBalance - oldBalance;

    await db
      .update(cashRegister)
      .set({ balance: newBalance.toFixed(2), lastUpdatedAt: new Date() })
      .where(eq(cashRegister.id, register.id));

    await db.insert(cashRegisterTransactions).values({
      amount: diff.toFixed(2),
      type: "manual_adjustment",
      description: reason,
      balanceAfter: newBalance.toFixed(2),
    });

    revalidatePath("/employee/orders");
    revalidatePath("/admin/cash-register");
    return { success: true };
  } catch (err) {
    console.error("[setCashRegisterBalance]", err);
    return { success: false, error: "Failed to update cash register." };
  }
}

// ─── Process Payment ──────────────────────────────────────────────────────────

export async function processPayment(
  input: ProcessPaymentInput,
): Promise<ProcessPaymentResult> {
  const { orderId, paymentMethod, amountTendered } = input;

  try {
    // 1. Load order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { success: false, error: "Order not found." };
    if (order.paymentStatus === "paid") return { success: false, error: "Order is already paid." };

    const totalPrice = parseFloat(order.totalPrice);
    if (amountTendered < totalPrice) {
      return {
        success: false,
        error: `Amount tendered (${amountTendered.toFixed(2)}) is less than total (${totalPrice.toFixed(2)}).`,
      };
    }

    const change = parseFloat((amountTendered - totalPrice).toFixed(2));

    // 2. Update order payment fields
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentMethod,
        amountPaid: amountTendered.toFixed(2),
        changeGiven: change.toFixed(2),
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 3. Update cash register (only for cash payments — transfers don't change the drawer)
    if (paymentMethod === "cash") {
      const register = await getOrCreateRegister();
      const currentBalance = parseFloat(register.balance);

      // Money in: customer pays
      const balanceAfterPayment = currentBalance + totalPrice;
      await db
        .update(cashRegister)
        .set({ balance: balanceAfterPayment.toFixed(2), lastUpdatedAt: new Date() })
        .where(eq(cashRegister.id, register.id));

      await db.insert(cashRegisterTransactions).values({
        amount: totalPrice.toFixed(2),
        type: "payment_in",
        orderId,
        description: `Payment received for order ${order.orderNumber}`,
        balanceAfter: balanceAfterPayment.toFixed(2),
      });

      // Change out (if any)
      if (change > 0) {
        const balanceAfterChange = balanceAfterPayment - change;
        await db
          .update(cashRegister)
          .set({ balance: balanceAfterChange.toFixed(2), lastUpdatedAt: new Date() })
          .where(eq(cashRegister.id, register.id));

        await db.insert(cashRegisterTransactions).values({
          amount: (-change).toFixed(2),
          type: "change_out",
          orderId,
          description: `Change given for order ${order.orderNumber}`,
          balanceAfter: balanceAfterChange.toFixed(2),
        });
      }
    }

    revalidatePath("/employee/orders");
    revalidatePath(`/employee/orders/${orderId}`);
    return { success: true, change };
  } catch (err) {
    console.error("[processPayment]", err);
    return { success: false, error: "Payment processing failed. Please try again." };
  }
}