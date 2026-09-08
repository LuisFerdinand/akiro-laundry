// lib/actions/finance.ts
"use server";

import { db } from "@/lib/db";
import { cashRegisterTransactions, expenseCategories, financePieConfigs } from "@/lib/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Category-key model ───────────────────────────────────────────────────────
// Every ledger transaction resolves to a stable string key. Keys are used by the
// recap, the customizable pie charts and the Excel export.
//
//   inc:orders    → order payments received (type = payment_in)
//   inc:adjust    → positive manual adjustments
//   inc:cat:<id>  → manual income, grouped by expense_categories.id
//   inc:none      → manual income with no category
//   exp:change    → change given to customers (type = change_out)
//   exp:adjust    → negative manual adjustments
//   exp:cat:<id>  → manual expense, grouped by expense_categories.id
//   exp:none      → manual expense with no category
//   initial       → opening balance (shown in the ledger, excluded from recap)

const AUTO_META: Record<string, { label: string; color: string }> = {
  "inc:orders": { label: "Order Payments",        color: "#16a34a" },
  "inc:adjust": { label: "Adjustment (In)",       color: "#0891b2" },
  "inc:none":   { label: "Uncategorised Income",  color: "#64748b" },
  "inc:other":  { label: "Other Income",          color: "#94a3b8" },
  "exp:change": { label: "Change Given",          color: "#f59e0b" },
  "exp:adjust": { label: "Adjustment (Out)",      color: "#a855f7" },
  "exp:none":   { label: "Uncategorised Expense", color: "#64748b" },
  "exp:other":  { label: "Other Expense",         color: "#94a3b8" },
  "initial":    { label: "Opening Balance",       color: "#cbd5e1" },
};

interface RawTx {
  id: number;
  direction: "income" | "outcome";
  type: string;
  categoryId: number | null;
  orderId: number | null;
  amount: string;
  balanceAfter: string;
  description: string;
  createdAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
}

function classify(tx: RawTx): { key: string; label: string; color: string } {
  switch (tx.type) {
    case "payment_in":
      return { key: "inc:orders", ...AUTO_META["inc:orders"] };
    case "change_out":
      return { key: "exp:change", ...AUTO_META["exp:change"] };
    case "manual_adjustment":
      return tx.direction === "income"
        ? { key: "inc:adjust", ...AUTO_META["inc:adjust"] }
        : { key: "exp:adjust", ...AUTO_META["exp:adjust"] };
    case "initial":
      return { key: "initial", ...AUTO_META["initial"] };
    case "manual_income":
      return tx.categoryId
        ? {
            key: `inc:cat:${tx.categoryId}`,
            label: tx.categoryName ?? "Income",
            color: tx.categoryColor ?? "#16a34a",
          }
        : { key: "inc:none", ...AUTO_META["inc:none"] };
    case "manual_outcome":
      return tx.categoryId
        ? {
            key: `exp:cat:${tx.categoryId}`,
            label: tx.categoryName ?? "Expense",
            color: tx.categoryColor ?? "#e11d48",
          }
        : { key: "exp:none", ...AUTO_META["exp:none"] };
    default:
      return tx.direction === "income"
        ? { key: "inc:other", ...AUTO_META["inc:other"] }
        : { key: "exp:other", ...AUTO_META["exp:other"] };
  }
}

// ─── Base query ───────────────────────────────────────────────────────────────

async function fetchTransactions(fromISO: string, toISO: string): Promise<RawTx[]> {
  const start = new Date(fromISO + "T00:00:00");
  const end   = new Date(toISO   + "T23:59:59");

  const rows = await db
    .select({
      id:            cashRegisterTransactions.id,
      direction:     cashRegisterTransactions.direction,
      type:          cashRegisterTransactions.type,
      categoryId:    cashRegisterTransactions.categoryId,
      orderId:       cashRegisterTransactions.orderId,
      amount:        cashRegisterTransactions.amount,
      balanceAfter:  cashRegisterTransactions.balanceAfter,
      description:   cashRegisterTransactions.description,
      createdAt:     cashRegisterTransactions.createdAt,
      categoryName:  expenseCategories.name,
      categoryColor: expenseCategories.color,
    })
    .from(cashRegisterTransactions)
    .leftJoin(expenseCategories, eq(cashRegisterTransactions.categoryId, expenseCategories.id))
    .where(and(
      gte(cashRegisterTransactions.createdAt, start),
      lte(cashRegisterTransactions.createdAt, end),
    ))
    .orderBy(asc(cashRegisterTransactions.createdAt));

  return rows as RawTx[];
}

// ─── Net change given back to the revenue ─────────────────────────────────────
// A cash sale books two rows: `payment_in` for the full amount tendered and
// `change_out` for the change returned. The drawer/cash-register menu shows both
// (the real cash movement), but the finance books should only ever see the
// revenue. This collapses each pair: the `change_out` row is dropped and its
// amount is subtracted from the sibling `payment_in` (matched by orderId), both
// from the amount and from the running balance.
//
// Legacy rows still work: an order with a lone `payment_in` (already equal to the
// revenue, no `change_out`) is left untouched.
function netChangeOut(txs: RawTx[]): RawTx[] {
  const changeByOrder = new Map<number, number>();
  for (const t of txs) {
    if (t.type === "change_out" && t.orderId != null) {
      changeByOrder.set(t.orderId, (changeByOrder.get(t.orderId) ?? 0) + parseFloat(t.amount));
    }
  }
  if (changeByOrder.size === 0) return txs;

  return txs
    .filter((t) => t.type !== "change_out")
    .map((t) => {
      if (t.type !== "payment_in" || t.orderId == null) return t;
      const chg = changeByOrder.get(t.orderId);
      if (!chg) return t;
      return {
        ...t,
        amount:       (parseFloat(t.amount) - chg).toFixed(2),
        balanceAfter: (parseFloat(t.balanceAfter) - chg).toFixed(2),
      };
    });
}

// ─── Ledger (Buku Kecil) ──────────────────────────────────────────────────────

export interface LedgerEntry {
  id: number;
  createdAt: Date;
  description: string;
  categoryKey: string;
  categoryLabel: string;
  categoryColor: string;
  direction: "income" | "outcome";
  debit: number;   // money out
  credit: number;  // money in
  balanceAfter: number;
  type: string;
}

export async function getLedger(fromISO: string, toISO: string): Promise<LedgerEntry[]> {
  const txs = netChangeOut(await fetchTransactions(fromISO, toISO));
  return txs.map((tx) => {
    const meta   = classify(tx);
    const amount = parseFloat(tx.amount);
    return {
      id:            tx.id,
      createdAt:     tx.createdAt,
      description:   tx.description,
      categoryKey:   meta.key,
      categoryLabel: meta.label,
      categoryColor: meta.color,
      direction:     tx.direction,
      debit:         tx.direction === "outcome" ? amount : 0,
      credit:        tx.direction === "income"  ? amount : 0,
      balanceAfter:  parseFloat(tx.balanceAfter),
      type:          tx.type,
    };
  });
}

// ─── Recap (Buku Besar) ───────────────────────────────────────────────────────

export interface RecapRow {
  key: string;
  label: string;
  color: string;
  total: number;
  count: number;
}

export interface FinanceRecap {
  income: RecapRow[];
  expense: RecapRow[];
  totalIncome: number;
  totalExpense: number;
  operatingExpense: number;
  netProfit: number;
  netCashFlow: number;
}

export async function getFinanceRecap(fromISO: string, toISO: string): Promise<FinanceRecap> {
  const txs = netChangeOut(await fetchTransactions(fromISO, toISO));

  const acc = new Map<string, RecapRow>();
  for (const tx of txs) {
    const meta = classify(tx);
    if (meta.key === "initial") continue;
    const amount = parseFloat(tx.amount);
    const row = acc.get(meta.key) ?? { key: meta.key, label: meta.label, color: meta.color, total: 0, count: 0 };
    row.total += amount;
    row.count += 1;
    acc.set(meta.key, row);
  }

  const all = [...acc.values()];
  const income  = all.filter((r) => r.key.startsWith("inc:")).sort((a, b) => b.total - a.total);
  const expense = all.filter((r) => r.key.startsWith("exp:")).sort((a, b) => b.total - a.total);

  const totalIncome  = income.reduce((s, r) => s + r.total, 0);
  const totalExpense = expense.reduce((s, r) => s + r.total, 0);
  // Change given to customers is netted out of order income upstream
  // (netChangeOut) and never reaches the recap, so operating expense is simply
  // the full expense total. The `exp:change` lookup is kept as a belt-and-braces
  // guard in case a raw change_out row is ever surfaced here again.
  const changeTotal  = acc.get("exp:change")?.total ?? 0;
  const operatingExpense = totalExpense - changeTotal;

  return {
    income,
    expense,
    totalIncome,
    totalExpense,
    operatingExpense,
    netProfit:   totalIncome - operatingExpense,
    netCashFlow: totalIncome - totalExpense,
  };
}

// ─── Category options for the pie editor ──────────────────────────────────────

export interface FinanceCategoryOption {
  key: string;
  label: string;
  color: string;
  side: "income" | "expense";
}

export async function getFinanceCategoryOptions(): Promise<FinanceCategoryOption[]> {
  const cats = await db.select().from(expenseCategories).orderBy(expenseCategories.name);

  const options: FinanceCategoryOption[] = [
    { key: "inc:orders", label: AUTO_META["inc:orders"].label, color: AUTO_META["inc:orders"].color, side: "income" },
    { key: "inc:adjust", label: AUTO_META["inc:adjust"].label, color: AUTO_META["inc:adjust"].color, side: "income" },
    { key: "inc:none",   label: AUTO_META["inc:none"].label,   color: AUTO_META["inc:none"].color,   side: "income" },
    { key: "exp:change", label: AUTO_META["exp:change"].label, color: AUTO_META["exp:change"].color, side: "expense" },
    { key: "exp:adjust", label: AUTO_META["exp:adjust"].label, color: AUTO_META["exp:adjust"].color, side: "expense" },
    { key: "exp:none",   label: AUTO_META["exp:none"].label,   color: AUTO_META["exp:none"].color,   side: "expense" },
  ];

  for (const c of cats) {
    const color = c.color ?? "#64748b";
    if (c.kind === "income" || c.kind === "both") {
      options.push({ key: `inc:cat:${c.id}`, label: c.name, color, side: "income" });
    }
    if (c.kind === "expense" || c.kind === "both") {
      options.push({ key: `exp:cat:${c.id}`, label: c.name, color, side: "expense" });
    }
  }

  return options;
}

// ─── Pie configs ──────────────────────────────────────────────────────────────

export interface PieConfig {
  slot: number;
  title: string;
  categoryKeys: string[];
}

const DEFAULT_PIE_CONFIGS: { slot: number; title: string; categoryKeys: string }[] = [
  { slot: 1, title: "Income Mix",       categoryKeys: "inc:orders,inc:adjust,inc:none" },
  { slot: 2, title: "Expense Mix",      categoryKeys: "exp:adjust,exp:none" },
  { slot: 3, title: "Income vs Expense", categoryKeys: "inc:orders,exp:adjust,exp:none" },
];

export async function getFinancePieConfigs(): Promise<PieConfig[]> {
  const existing = await db.select().from(financePieConfigs).orderBy(asc(financePieConfigs.slot));
  const bySlot = new Map(existing.map((r) => [r.slot, r]));

  const missing = DEFAULT_PIE_CONFIGS.filter((d) => !bySlot.has(d.slot));
  if (missing.length > 0) {
    await db.insert(financePieConfigs).values(missing).onConflictDoNothing();
  }

  const merged = DEFAULT_PIE_CONFIGS.map((d) => {
    const row = bySlot.get(d.slot);
    return {
      slot: d.slot,
      title: row?.title ?? d.title,
      categoryKeys: (row?.categoryKeys ?? d.categoryKeys).split(",").map((k) => k.trim()).filter(Boolean),
    };
  });
  return merged;
}

export async function updateFinancePieConfig(
  slot: number,
  input: { title: string; categoryKeys: string[] },
): Promise<{ success: boolean; error?: string }> {
  if (![1, 2, 3].includes(slot)) return { success: false, error: "Invalid chart slot." };
  const title = input.title.trim() || `Chart ${slot}`;
  const keys  = input.categoryKeys.join(",");

  try {
    const [existing] = await db
      .select()
      .from(financePieConfigs)
      .where(eq(financePieConfigs.slot, slot))
      .limit(1);

    if (existing) {
      await db
        .update(financePieConfigs)
        .set({ title, categoryKeys: keys, updatedAt: new Date() })
        .where(eq(financePieConfigs.slot, slot));
    } else {
      await db.insert(financePieConfigs).values({ slot, title, categoryKeys: keys });
    }

    revalidatePath("/admin/buku-besar");
    return { success: true };
  } catch (err) {
    console.error("[updateFinancePieConfig]", err);
    return { success: false, error: "Failed to save chart." };
  }
}

// ─── Pie data (configs + amounts for a period) ───────────────────────────────

export interface PieSegment {
  key: string;
  label: string;
  color: string;
  value: number;
}

export interface PieChartData {
  slot: number;
  title: string;
  segments: PieSegment[];
}

export async function getFinancePieData(fromISO: string, toISO: string): Promise<PieChartData[]> {
  const [configs, options, recap] = await Promise.all([
    getFinancePieConfigs(),
    getFinanceCategoryOptions(),
    getFinanceRecap(fromISO, toISO),
  ]);

  const metaByKey = new Map<string, { label: string; color: string }>();
  for (const o of options) metaByKey.set(o.key, { label: o.label, color: o.color });
  const totalByKey = new Map<string, number>();
  for (const r of [...recap.income, ...recap.expense]) totalByKey.set(r.key, r.total);

  return configs.map((cfg) => ({
    slot: cfg.slot,
    title: cfg.title,
    segments: cfg.categoryKeys.map((key) => {
      const meta = metaByKey.get(key) ?? AUTO_META[key] ?? { label: key, color: "#94a3b8" };
      return { key, label: meta.label, color: meta.color, value: totalByKey.get(key) ?? 0 };
    }),
  }));
}

// ─── Export bundle (everything the Excel workbook needs) ──────────────────────

export interface FinanceExportBundle {
  ledger: LedgerEntry[];
  recap: FinanceRecap;
  pies: PieChartData[];
}

export async function getFinanceExportBundle(
  fromISO: string,
  toISO: string,
): Promise<FinanceExportBundle> {
  const [ledger, recap, pies] = await Promise.all([
    getLedger(fromISO, toISO),
    getFinanceRecap(fromISO, toISO),
    getFinancePieData(fromISO, toISO),
  ]);
  return { ledger, recap, pies };
}
