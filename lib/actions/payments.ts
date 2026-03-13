/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/payments.ts  (full replacement)
"use server";

import { db } from "@/lib/db";
import {
  orders,
  cashRegister,
  cashRegisterTransactions,
  expenseCategories,
} from "@/lib/db/schema";
import type {
  Order,
  CashRegister,
  CashRegisterTransaction,
  ExpenseCategory,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessPaymentInput {
  orderId: number;
  paymentMethod: "cash" | "transfer" | "qris";
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
  recentTransactions: (CashRegisterTransaction & { categoryName?: string | null })[];
}

// ─── NEW: Manual transaction input ───────────────────────────────────────────

export interface RecordManualTransactionInput {
  direction: "income" | "outcome";
  amount: number;
  description: string;
  /** Required when direction === "outcome" */
  categoryId?: number | null;
}

export interface RecordManualTransactionResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateRegister(): Promise<CashRegister> {
  const rows = await db.select().from(cashRegister).limit(1);
  if (rows[0]) return rows[0];
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
    .select({
      tx:           cashRegisterTransactions,
      categoryName: expenseCategories.name,
    })
    .from(cashRegisterTransactions)
    .leftJoin(
      expenseCategories,
      eq(cashRegisterTransactions.categoryId, expenseCategories.id),
    )
    .orderBy(desc(cashRegisterTransactions.createdAt))
    .limit(30);

  return {
    balance:       parseFloat(register.balance),
    lastUpdatedAt: register.lastUpdatedAt,
    recentTransactions: recentTransactions.map((r) => ({
      ...r.tx,
      categoryName: r.categoryName ?? null,
    })),
  };
}

// ─── Set Initial / Adjust Cash Register Balance ───────────────────────────────

export async function setCashRegisterBalance(
  newBalance: number,
  reason: string = "Manual adjustment",
): Promise<{ success: boolean; error?: string }> {
  try {
    const register   = await getOrCreateRegister();
    const oldBalance = parseFloat(register.balance);
    const diff       = newBalance - oldBalance;

    await db
      .update(cashRegister)
      .set({ balance: newBalance.toFixed(2), lastUpdatedAt: new Date() })
      .where(eq(cashRegister.id, register.id));

    await db.insert(cashRegisterTransactions).values({
      direction:    diff >= 0 ? "income" : "outcome",
      amount:       Math.abs(diff).toFixed(2),
      type:         "manual_adjustment",
      description:  reason,
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

// ─── NEW: Record a manual income or expense transaction ───────────────────────

export async function recordManualTransaction(
  input: RecordManualTransactionInput,
): Promise<RecordManualTransactionResult> {
  const { direction, amount, description, categoryId } = input;

  try {
    if (!amount || amount <= 0) {
      return { success: false, error: "Amount must be greater than zero." };
    }
    if (direction === "outcome" && !categoryId) {
      return { success: false, error: "Please select a category for expense entries." };
    }

    const register      = await getOrCreateRegister();
    const currentBalance = parseFloat(register.balance);
    const newBalance    =
      direction === "income"
        ? currentBalance + amount
        : Math.max(0, currentBalance - amount);

    await db
      .update(cashRegister)
      .set({ balance: newBalance.toFixed(2), lastUpdatedAt: new Date() })
      .where(eq(cashRegister.id, register.id));

    await db.insert(cashRegisterTransactions).values({
      direction,
      amount:       amount.toFixed(2),
      type:         direction === "income" ? "manual_income" : "manual_outcome",
      categoryId:   categoryId ?? null,
      description:  description.trim(),
      balanceAfter: newBalance.toFixed(2),
    });

    revalidatePath("/admin/cash-register");
    return { success: true, newBalance };
  } catch (err) {
    console.error("[recordManualTransaction]", err);
    return { success: false, error: "Failed to record transaction." };
  }
}

// ─── Process Payment (unchanged logic, adds direction field) ──────────────────

export async function processPayment(
  input: ProcessPaymentInput,
): Promise<ProcessPaymentResult> {
  const { orderId, paymentMethod, amountTendered } = input;

  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return { success: false, error: "Order not found." };
    if (order.paymentStatus === "paid")
      return { success: false, error: "Order is already paid." };

    const totalPrice = parseFloat(order.totalPrice);
    if (amountTendered < totalPrice) {
      return {
        success: false,
        error: `Amount tendered (${amountTendered.toFixed(2)}) is less than total (${totalPrice.toFixed(2)}).`,
      };
    }

    const change = parseFloat((amountTendered - totalPrice).toFixed(2));

    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentMethod,
        amountPaid:    amountTendered.toFixed(2),
        changeGiven:   change.toFixed(2),
        paidAt:        new Date(),
        updatedAt:     new Date(),
      })
      .where(eq(orders.id, orderId));

    if (paymentMethod === "cash") {
      const register       = await getOrCreateRegister();
      const currentBalance = parseFloat(register.balance);

      const balanceAfterPayment = currentBalance + totalPrice;
      await db
        .update(cashRegister)
        .set({ balance: balanceAfterPayment.toFixed(2), lastUpdatedAt: new Date() })
        .where(eq(cashRegister.id, register.id));

      await db.insert(cashRegisterTransactions).values({
        direction:    "income",
        amount:       totalPrice.toFixed(2),
        type:         "payment_in",
        orderId,
        description:  `Payment received for order ${order.orderNumber}`,
        balanceAfter: balanceAfterPayment.toFixed(2),
      });

      if (change > 0) {
        const balanceAfterChange = balanceAfterPayment - change;
        await db
          .update(cashRegister)
          .set({ balance: balanceAfterChange.toFixed(2), lastUpdatedAt: new Date() })
          .where(eq(cashRegister.id, register.id));

        await db.insert(cashRegisterTransactions).values({
          direction:    "outcome",
          amount:       change.toFixed(2),
          type:         "change_out",
          orderId,
          description:  `Change given for order ${order.orderNumber}`,
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

// ─── Expense Category CRUD ────────────────────────────────────────────────────

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return db.select().from(expenseCategories).orderBy(expenseCategories.name);
}

export async function createExpenseCategory(input: {
  name: string;
  description?: string;
  color?: string;
}): Promise<{ success: boolean; category?: ExpenseCategory; error?: string }> {
  try {
    const [cat] = await db
      .insert(expenseCategories)
      .values({
        name:        input.name.trim(),
        description: input.description?.trim() ?? null,
        color:       input.color ?? "#64748b",
      })
      .returning();
    revalidatePath("/admin/cash-register");
    return { success: true, category: cat };
  } catch (err: any) {
    if (err?.code === "23505")
      return { success: false, error: "A category with that name already exists." };
    return { success: false, error: "Failed to create category." };
  }
}

export async function updateExpenseCategory(
  id: number,
  input: { name?: string; description?: string; color?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(expenseCategories)
      .set({
        ...(input.name        && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.color       && { color: input.color }),
      })
      .where(eq(expenseCategories.id, id));
    revalidatePath("/admin/cash-register");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to update category." };
  }
}

/** Hard delete — removes the category row entirely. Past transactions retain
 *  the categoryId FK which will resolve to null after deletion (SET NULL). */
export async function deleteExpenseCategory(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
    revalidatePath("/admin/cash-register");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete category." };
  }
}