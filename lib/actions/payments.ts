/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/payments.ts  (full replacement)
"use server";

import { db } from "@/lib/db";
import {
  orders,
  customers,
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
  /** Final payment status after this payment was applied. */
  paymentStatus?: "partial" | "paid";
  /** Remaining balance still owed, if the order is now "partial". */
  balanceDue?: number;
  error?: string;
}

export interface CashRegisterState {
  balance: number;
  lastUpdatedAt: Date;
  recentTransactions: (CashRegisterTransaction & {
    categoryName?: string | null;
    /** Description with the order number swapped for the customer's name (cash register pages only). */
    displayDescription: string;
  })[];
}

/**
 * The stored description references the order number (Buku Kecil keeps showing
 * that). The cash register pages show the customer name instead.
 */
function describeWithCustomer(description: string, customerName: string | null): string {
  if (!customerName) return description;
  return description
    .replace(/received for order \S+/, `received from ${customerName}`)
    .replace(/given for order \S+/, `given to ${customerName}`);
}

// ─── NEW: Manual transaction input ───────────────────────────────────────────

export interface RecordManualTransactionInput {
  direction: "income" | "outcome";
  amount: number;
  description: string;
  /** Required when direction === "outcome"; optional for income. */
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
      customerName: customers.name,
    })
    .from(cashRegisterTransactions)
    .leftJoin(
      expenseCategories,
      eq(cashRegisterTransactions.categoryId, expenseCategories.id),
    )
    .leftJoin(orders, eq(cashRegisterTransactions.orderId, orders.id))
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(cashRegisterTransactions.createdAt))
    .limit(30);

  return {
    balance:       parseFloat(register.balance),
    lastUpdatedAt: register.lastUpdatedAt,
    recentTransactions: recentTransactions.map((r) => ({
      ...r.tx,
      categoryName: r.categoryName ?? null,
      displayDescription: describeWithCustomer(r.tx.description, r.customerName),
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
    revalidatePath("/employee/cash-register");
    revalidatePath("/admin");
    revalidatePath("/admin/buku-kecil");
    revalidatePath("/admin/buku-besar");
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
    // Expense entries must be categorised. Income categories are optional at the
    // action level (the Buku Kecil form still requires one); this keeps the
    // legacy Cash Register income form working.
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

    revalidatePath("/admin/buku-kecil");
    revalidatePath("/admin/buku-besar");

    revalidatePath("/admin/cash-register");
    revalidatePath("/employee/cash-register");
    revalidatePath("/admin");
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

    const totalPrice     = parseFloat(order.totalPrice);
    const alreadyPaid    = order.amountPaid ? parseFloat(order.amountPaid) : 0;
    const balanceRemaining = parseFloat((totalPrice - alreadyPaid).toFixed(2));

    if (amountTendered <= 0) {
      return { success: false, error: "Amount must be greater than zero." };
    }
    // Non-cash methods (transfer/qris) have no "change" mechanism — the amount
    // received must go straight to the balance, so it can't exceed what's owed.
    if (paymentMethod !== "cash" && amountTendered > balanceRemaining) {
      return {
        success: false,
        error: `Amount (${amountTendered.toFixed(2)}) exceeds the remaining balance (${balanceRemaining.toFixed(2)}).`,
      };
    }

    // Cash can overpay (change is returned); only the portion up to the
    // remaining balance is applied to the order — the rest is handed back.
    const appliedAmount = Math.min(amountTendered, balanceRemaining);
    const change        = parseFloat((amountTendered - appliedAmount).toFixed(2));
    const newAmountPaid = parseFloat((alreadyPaid + appliedAmount).toFixed(2));
    const isFullyPaid   = newAmountPaid >= totalPrice;
    const newStatus     = isFullyPaid ? "paid" : "partial";

    await db
      .update(orders)
      .set({
        paymentStatus: newStatus,
        paymentMethod,
        amountPaid:    newAmountPaid.toFixed(2),
        changeGiven:   change.toFixed(2),
        ...(isFullyPaid && { paidAt: new Date() }),
        updatedAt:     new Date(),
      })
      .where(eq(orders.id, orderId));

    if (paymentMethod === "cash") {
      const register       = await getOrCreateRegister();
      const currentBalance = parseFloat(register.balance);

      // Book the real cash movement in two rows: the full amount the customer
      // handed over (`payment_in`), then the change returned to them
      // (`change_out`). Net drawer effect = amountTendered − change = appliedAmount.
      // The finance pages (Buku Kecil / Buku Besar) net the pair back down to the
      // revenue, so only `appliedAmount` shows up there — see lib/actions/finance.ts.
      const balanceAfterTender = currentBalance + amountTendered;
      const balanceAfterChange = parseFloat((balanceAfterTender - change).toFixed(2));

      await db
        .update(cashRegister)
        .set({ balance: balanceAfterChange.toFixed(2), lastUpdatedAt: new Date() })
        .where(eq(cashRegister.id, register.id));

      await db.insert(cashRegisterTransactions).values({
        direction:    "income",
        amount:       amountTendered.toFixed(2),
        type:         "payment_in",
        orderId,
        description:  isFullyPaid
          ? `Payment received for order ${order.orderNumber}`
          : `Partial payment (DP) received for order ${order.orderNumber}`,
        balanceAfter: balanceAfterTender.toFixed(2),
      });

      if (change > 0) {
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
    if (paymentMethod === "cash") {
      revalidatePath("/employee/cash-register");
      revalidatePath("/admin/cash-register");
      revalidatePath("/admin");
      // A cash payment writes a payment_in ledger row — the finance pages read
      // that same table, so they must be revalidated too (recordManualTransaction
      // already does this; processPayment previously did not, which left Buku
      // Kecil / Buku Besar showing stale data after every order payment).
      revalidatePath("/admin/buku-kecil");
      revalidatePath("/admin/buku-besar");
    }
    return {
      success:       true,
      change,
      paymentStatus: newStatus,
      balanceDue:    isFullyPaid ? 0 : parseFloat((totalPrice - newAmountPaid).toFixed(2)),
    };
  } catch (err) {
    console.error("[processPayment]", err);
    return { success: false, error: "Payment processing failed. Please try again." };
  }
}

// ─── Expense Category CRUD ────────────────────────────────────────────────────

export async function getExpenseCategories(
  kind?: "income" | "expense",
): Promise<ExpenseCategory[]> {
  const rows = await db.select().from(expenseCategories).orderBy(expenseCategories.name);
  if (!kind) return rows;
  return rows.filter((c) => c.kind === kind || c.kind === "both");
}

export async function createExpenseCategory(input: {
  name: string;
  description?: string;
  color?: string;
  kind?: "income" | "expense" | "both";
}): Promise<{ success: boolean; category?: ExpenseCategory; error?: string }> {
  try {
    const [cat] = await db
      .insert(expenseCategories)
      .values({
        name:        input.name.trim(),
        description: input.description?.trim() ?? null,
        color:       input.color ?? "#64748b",
        kind:        input.kind ?? "expense",
      })
      .returning();
    revalidatePath("/admin/cash-register");
    revalidatePath("/admin/buku-kecil");
    return { success: true, category: cat };
  } catch (err: any) {
    if (err?.code === "23505")
      return { success: false, error: "A category with that name already exists." };
    return { success: false, error: "Failed to create category." };
  }
}

export async function updateExpenseCategory(
  id: number,
  input: { name?: string; description?: string; color?: string; kind?: "income" | "expense" | "both" },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(expenseCategories)
      .set({
        ...(input.name        && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.color       && { color: input.color }),
        ...(input.kind        && { kind: input.kind }),
      })
      .where(eq(expenseCategories.id, id));
    revalidatePath("/admin/cash-register");
    revalidatePath("/admin/buku-kecil");
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