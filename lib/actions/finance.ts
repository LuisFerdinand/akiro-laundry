// lib/actions/finance.ts
"use server";

import { db } from "@/lib/db";
import {
  cashRegister, cashRegisterTransactions, expenseCategories, financePieConfigs, orders, customers,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addDaysISO, bizDayEnd, bizDayStart, isoDayBiz } from "@/lib/utils/business-time";
import {
  balanceAsOf, collectedAmount, outstandingAmount, summarizeRevenue,
  type RevenueMethod, type RevenueSummary,
} from "@/lib/utils/revenue";
import { fetchRevenueRows } from "@/lib/db/queries/revenue.queries";

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
  "inc:orders": { label: "Laundry Revenue",       color: "#16a34a" },
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
  orderNumber: string | null;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  orderTotal: string | null;
  orderPaymentStatus: string | null;
  /** Change subtracted from this payment_in by netChangeOut(), if any. */
  changeNetted?: number;
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
  // Pinned to the shop's timezone (Asia/Dili, UTC+9) — a bare "T00:00:00" would
  // use the server's zone (UTC on Vercel) and shift the day boundary by 9 hours.
  const start = bizDayStart(fromISO);
  const end   = bizDayEnd(toISO);

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
      orderNumber:   orders.orderNumber,
      customerId:    customers.id,
      customerName:  customers.name,
      customerPhone: customers.phone,
      orderTotal:    orders.totalPrice,
      orderPaymentStatus: orders.paymentStatus,
    })
    .from(cashRegisterTransactions)
    .leftJoin(expenseCategories, eq(cashRegisterTransactions.categoryId, expenseCategories.id))
    .leftJoin(orders, eq(cashRegisterTransactions.orderId, orders.id))
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(and(
      gte(cashRegisterTransactions.createdAt, start),
      lte(cashRegisterTransactions.createdAt, end),
    ))
    .orderBy(asc(cashRegisterTransactions.createdAt), asc(cashRegisterTransactions.id));

  return rows as RawTx[];
}

// ─── Net change given back to the revenue ─────────────────────────────────────
// A cash sale books two rows: `payment_in` for the full amount tendered and
// `change_out` for the change returned. The drawer/cash-register menu shows both
// (the real cash movement), but the finance books should only ever see the
// revenue. This collapses each pair: the `change_out` row is dropped and its
// amount is subtracted from the sibling `payment_in` that precedes it, both
// from the amount and from the running balance.
//
// An order paid in instalments (DP, then the balance) has several `payment_in`
// rows but only the one that overpaid has a `change_out`. Each `change_out` is
// written right after the `payment_in` it belongs to, so it is paired with the
// closest preceding `payment_in` of the same order — NOT every payment of that
// order. (Matching by orderId alone subtracted the final payment's change from
// the DP row as well, making part of the DP vanish from the books.)
//
// Legacy rows still work: an order with a lone `payment_in` (already equal to the
// revenue, no `change_out`) is left untouched. A `change_out` whose `payment_in`
// falls outside the fetched period stays as a real "Change Given" outflow.
//
// Deleting an order detaches its ledger rows (orderId → null), so rows are paired
// by order id when present and otherwise by the order number in the description.
function orderKey(t: RawTx): string | null {
  if (t.orderId != null) return `id:${t.orderId}`;
  const no = t.description.match(/for order (\S+)/)?.[1];
  return no ? `no:${no}` : null;
}

function netChangeOut(txs: RawTx[]): RawTx[] {
  const lastPaymentByOrder = new Map<string, number>(); // order key → payment_in tx id
  const changeByPayment    = new Map<number, number>(); // payment_in tx id → change
  const absorbed           = new Set<number>();         // change_out tx ids netted away

  for (const t of txs) {
    const key = orderKey(t);
    if (key == null) continue;
    if (t.type === "payment_in") {
      lastPaymentByOrder.set(key, t.id);
    } else if (t.type === "change_out") {
      const payId = lastPaymentByOrder.get(key);
      if (payId == null) continue;
      changeByPayment.set(payId, (changeByPayment.get(payId) ?? 0) + parseFloat(t.amount));
      absorbed.add(t.id);
    }
  }
  if (absorbed.size === 0) return txs;

  return txs
    .filter((t) => !absorbed.has(t.id))
    .map((t) => {
      const chg = t.type === "payment_in" ? changeByPayment.get(t.id) : undefined;
      if (!chg) return t;
      return {
        ...t,
        amount:       (parseFloat(t.amount) - chg).toFixed(2),
        balanceAfter: (parseFloat(t.balanceAfter) - chg).toFixed(2),
        changeNetted: chg,
      };
    });
}

// ─── Payment type (full / DP / balance) ───────────────────────────────────────
// A payment that completes an order which already had an earlier payment (a DP,
// or a balance reopened by an edit) is the "final" one. Each order's first
// payment is looked up across all history — the order total can't tell, since
// paid orders can be edited. Expects the netted transactions, oldest first.

type PaymentType = "full" | "dp" | "balance";

async function resolvePaymentTypes(txs: RawTx[]): Promise<Map<number, PaymentType>> {
  const paidOrderIds = [...new Set(
    txs.filter((t) => t.type === "payment_in" && t.orderId != null).map((t) => t.orderId!),
  )];
  const firstPayments = paidOrderIds.length === 0 ? [] : await db
    .select({
      orderId: cashRegisterTransactions.orderId,
      firstId: sql<number>`min(${cashRegisterTransactions.id})`,
    })
    .from(cashRegisterTransactions)
    .where(and(
      eq(cashRegisterTransactions.type, "payment_in"),
      inArray(cashRegisterTransactions.orderId, paidOrderIds),
    ))
    .groupBy(cashRegisterTransactions.orderId);
  const firstPaymentId = new Map(firstPayments.map((r) => [r.orderId!, Number(r.firstId)]));
  // Rows detached from a deleted order can only be matched within the period.
  const seenDetached = new Set<string>();

  const result = new Map<number, PaymentType>();
  for (const t of txs) {
    if (t.type !== "payment_in") continue;
    let hadEarlierPayment: boolean;
    if (t.orderId != null) {
      hadEarlierPayment = (firstPaymentId.get(t.orderId) ?? t.id) < t.id;
    } else {
      const key = orderKey(t);
      hadEarlierPayment = key != null && seenDetached.has(key);
      if (key != null) seenDetached.add(key);
    }
    result.set(t.id, t.description.startsWith("Partial payment") ? "dp"
      : hadEarlierPayment ? "balance"
      : "full");
  }
  return result;
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
  /** Order payments only: paid in one go, a DP, or the final payment after an earlier one. */
  paymentType: PaymentType | null;
  orderId: number | null;
  orderNumber: string | null;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  /** Current order total / payment status (not as of the transaction). */
  orderTotal: number | null;
  orderPaymentStatus: string | null;
  /** Cash handed over and change returned — set only when change was given back. */
  tendered: number | null;
  change: number | null;
}

export async function getLedger(fromISO: string, toISO: string): Promise<LedgerEntry[]> {
  const txs   = netChangeOut(await fetchTransactions(fromISO, toISO));
  const types = await resolvePaymentTypes(txs);
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
      paymentType:   types.get(tx.id) ?? null,
      orderId:       tx.orderId,
      // Deleting an order detaches its ledger rows — fall back to the order
      // number written into the description.
      orderNumber:   tx.orderNumber ?? tx.description.match(/for order (\S+)/)?.[1] ?? null,
      customerId:    tx.customerId,
      customerName:  tx.customerName,
      customerPhone: tx.customerPhone,
      orderTotal:    tx.orderTotal != null ? parseFloat(tx.orderTotal) : null,
      orderPaymentStatus: tx.orderPaymentStatus,
      tendered:      tx.changeNetted ? r2(amount + tx.changeNetted) : null,
      change:        tx.changeNetted ? r2(tx.changeNetted) : null,
    };
  });
}

// ─── Cash book (Daily Cash page) ──────────────────────────────────────────────
// Every movement of the cash drawer in a period, split into income and outcome,
// with order payments resolved to their order number and customer. Cash sales
// are shown net of the change handed back (tendered / change kept for display),
// the same way the finance books show them. Balances are re-derived from the
// movements — opening (last recorded balance before the period) + in − out — so
// "expected in drawer" always adds up; `drift` flags it when the recorded
// balances don't.

export type CashBookKind = "payment" | "change" | "manual" | "adjustment" | "opening";

export interface CashBookEntry {
  id:            number;
  createdAt:     Date;
  /** Business-local calendar day, YYYY-MM-DD. */
  day:           string;
  direction:     "income" | "outcome";
  kind:          CashBookKind;
  /** Order payments only: paid in one go, a DP, or the final payment after an earlier one. */
  paymentType:   "full" | "dp" | "balance" | null;
  /** Net effect on the drawer (a payment minus the change given back). */
  amount:        number;
  /** Cash the customer handed over — set only when change was given back. */
  tendered:      number | null;
  change:        number | null;
  orderId:       number | null;
  orderNumber:   string | null;
  customerName:  string | null;
  description:   string;
  categoryLabel: string;
  categoryColor: string;
}

export interface CashBookDay {
  day:      string;
  opening:  number;
  cashIn:   number;
  cashOut:  number;
  closing:  number;
  /** Order payments received that day. */
  payments: number;
  /** All movements that day. */
  entries:  number;
}

export interface CashBook {
  openingBalance: number;
  closingBalance: number;
  cashIn:         number;
  cashOut:        number;
  /** Part of `cashIn` that came from order payments. */
  orderIncome:    number;
  paymentCount:   number;
  dpCount:        number;
  outCount:       number;
  /**
   * Recorded register balance at the end of the period minus what the movements
   * add up to. Zero unless the ledger itself doesn't add up.
   */
  drift:          number;
  entries:        CashBookEntry[];
  days:           CashBookDay[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Spans up to this many days list every day, including days without movement. */
const FILL_DAYS_MAX = 62;

function cashBookKind(type: string): CashBookKind {
  switch (type) {
    case "payment_in":        return "payment";
    case "change_out":        return "change";
    case "manual_adjustment": return "adjustment";
    case "initial":           return "opening";
    default:                  return "manual";
  }
}

export async function getCashBook(fromISO: string, toISO: string): Promise<CashBook> {
  const [raw, [prev]] = await Promise.all([
    fetchTransactions(fromISO, toISO),
    db
      .select({ balanceAfter: cashRegisterTransactions.balanceAfter })
      .from(cashRegisterTransactions)
      .where(lt(cashRegisterTransactions.createdAt, bizDayStart(fromISO)))
      .orderBy(desc(cashRegisterTransactions.createdAt), desc(cashRegisterTransactions.id))
      .limit(1),
  ]);
  const openingBalance = prev ? parseFloat(prev.balanceAfter) : 0;

  const netted       = netChangeOut(raw);
  const paymentTypes = await resolvePaymentTypes(netted);

  const entries: CashBookEntry[] = netted.map((t) => {
    const meta   = classify(t);
    const amount = parseFloat(t.amount);
    const kind   = cashBookKind(t.type);

    return {
      id:            t.id,
      createdAt:     t.createdAt,
      day:           isoDayBiz(t.createdAt),
      direction:     t.direction,
      kind,
      paymentType:   kind === "payment" ? (paymentTypes.get(t.id) ?? null) : null,
      amount,
      tendered:      t.changeNetted ? r2(amount + t.changeNetted) : null,
      change:        t.changeNetted ? r2(t.changeNetted) : null,
      orderId:       t.orderId,
      // Deleting an order detaches its ledger rows — fall back to the order
      // number written into the description.
      orderNumber:   t.orderNumber ?? t.description.match(/for order (\S+)/)?.[1] ?? null,
      customerName:  t.customerName,
      description:   t.description,
      categoryLabel: meta.label,
      categoryColor: meta.color,
    };
  });

  // ── Roll up totals and per-day figures from the movements ──
  const byDay = new Map<string, CashBookDay>();
  let running = openingBalance;
  let cashIn = 0, cashOut = 0, orderIncome = 0;
  let paymentCount = 0, dpCount = 0, outCount = 0;

  for (const e of entries) {
    let d = byDay.get(e.day);
    if (!d) {
      d = { day: e.day, opening: r2(running), cashIn: 0, cashOut: 0, closing: r2(running), payments: 0, entries: 0 };
      byDay.set(e.day, d);
    }
    if (e.direction === "income") {
      d.cashIn += e.amount; cashIn += e.amount; running += e.amount;
    } else {
      d.cashOut += e.amount; cashOut += e.amount; running -= e.amount; outCount++;
    }
    d.closing = r2(running);
    d.entries++;
    if (e.kind === "payment") {
      d.payments++; paymentCount++; orderIncome += e.amount;
      if (e.paymentType === "dp") dpCount++;
    }
  }

  // List every day of the period (up to today) when the span is short enough,
  // so quiet days show up too; long custom ranges only list active days.
  const today = isoDayBiz(new Date());
  const last  = toISO < today ? toISO : today;
  const span  = (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / 86_400_000 + 1;
  let days: CashBookDay[];
  if (span <= FILL_DAYS_MAX) {
    days = [];
    let carry = r2(openingBalance);
    for (let day = fromISO; day <= last; day = addDaysISO(day, 1)) {
      const d = byDay.get(day)
        ?? { day, opening: carry, cashIn: 0, cashOut: 0, closing: carry, payments: 0, entries: 0 };
      days.push(d);
      carry = d.closing;
    }
  } else {
    days = [...byDay.values()];
  }
  for (const d of days) { d.cashIn = r2(d.cashIn); d.cashOut = r2(d.cashOut); }

  const closingBalance = r2(running);
  const recordedEnd    = raw.length > 0 ? parseFloat(raw[raw.length - 1].balanceAfter) : openingBalance;

  return {
    openingBalance: r2(openingBalance),
    closingBalance,
    cashIn:         r2(cashIn),
    cashOut:        r2(cashOut),
    orderIncome:    r2(orderIncome),
    paymentCount,
    dpCount,
    outCount,
    drift:          r2(recordedEnd - closingBalance),
    entries,
    days,
  };
}

// ─── Order book (Daily Cash page, "by order date") ────────────────────────────
// The other way to read revenue: every order on the day it was PLACED, at its
// full price, whatever the payment method — instead of the cash book's "money
// that went through the drawer on the day it arrived". `collected` is what has
// been received against those orders so far (on any later day too), so
// collected + outstanding = value.

export type OrderBookMethod = "cash" | "transfer" | "qris" | "other";

export interface OrderBookOrder {
  id:            number;
  orderNumber:   string;
  createdAt:     Date;
  /** Business-local day the order was placed, YYYY-MM-DD. */
  day:           string;
  customerName:  string | null;
  paymentStatus: "unpaid" | "partial" | "paid";
  /** Method of the most recent payment — null while nothing is paid. */
  method:        OrderBookMethod | null;
  total:         number;
  collected:     number;
  outstanding:   number;
  /** Day the order was settled, when that wasn't the day it was placed. */
  paidDay:       string | null;
}

export interface OrderBookDay {
  day:         string;
  orders:      number;
  value:       number;
  collected:   number;
  outstanding: number;
}

export interface OrderBook {
  orderCount:    number;
  value:         number;
  collected:     number;
  outstanding:   number;
  unpaidCount:   number;
  partialCount:  number;
  paidCount:     number;
  /** Still owed on orders with nothing paid yet / on part-paid orders. */
  unpaidDue:     number;
  partialDue:    number;
  byMethod:      { method: OrderBookMethod; amount: number; count: number }[];
  orders:        OrderBookOrder[];
  days:          OrderBookDay[];
}

export async function getOrderBook(fromISO: string, toISO: string): Promise<OrderBook> {
  const rows = await db
    .select({
      id:                   orders.id,
      orderNumber:          orders.orderNumber,
      createdAt:            orders.createdAt,
      totalPrice:           orders.totalPrice,
      paymentStatus:        orders.paymentStatus,
      paymentMethod:        orders.paymentMethod,
      amountPaid:           orders.amountPaid,
      paidAt:               orders.paidAt,
      editedAfterPaymentAt: orders.editedAfterPaymentAt,
      customerName:         customers.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(and(
      gte(orders.createdAt, bizDayStart(fromISO)),
      lte(orders.createdAt, bizDayEnd(toISO)),
    ))
    .orderBy(asc(orders.createdAt), asc(orders.id));

  const byDay    = new Map<string, OrderBookDay>();
  const byMethod = new Map<OrderBookMethod, { amount: number; count: number }>();
  const list: OrderBookOrder[] = [];
  let value = 0, collected = 0, outstanding = 0;
  let unpaidCount = 0, partialCount = 0, paidCount = 0, unpaidDue = 0, partialDue = 0;

  for (const o of rows) {
    const total = parseFloat(o.totalPrice);
    // Same definition as the dashboard / email / ledgers (lib/utils/revenue.ts);
    // an overpayment isn't this order's revenue, so `got` never exceeds `total`.
    const got    = r2(collectedAmount(o));
    const due    = r2(outstandingAmount(o));
    const day    = isoDayBiz(o.createdAt);
    const paidOn = o.paymentStatus === "paid" && o.paidAt ? isoDayBiz(o.paidAt) : null;
    const method: OrderBookMethod | null = got > 0 ? (o.paymentMethod ?? "other") : null;

    list.push({
      id: o.id, orderNumber: o.orderNumber, createdAt: o.createdAt, day,
      customerName:  o.customerName,
      paymentStatus: o.paymentStatus,
      method,
      total, collected: got, outstanding: due,
      paidDay: paidOn && paidOn !== day ? paidOn : null,
    });

    value += total; collected += got; outstanding += due;
    if (o.paymentStatus === "paid")         paidCount++;
    else if (o.paymentStatus === "partial") { partialCount++; partialDue += due; }
    else                                    { unpaidCount++;  unpaidDue  += due; }
    if (method) {
      const m = byMethod.get(method) ?? { amount: 0, count: 0 };
      m.amount += got; m.count++;
      byMethod.set(method, m);
    }

    const d = byDay.get(day) ?? { day, orders: 0, value: 0, collected: 0, outstanding: 0 };
    d.orders++; d.value += total; d.collected += got; d.outstanding += due;
    byDay.set(day, d);
  }

  // Same rule as the cash book: short spans list every day up to today (quiet
  // days included); long custom ranges only the days that had orders.
  const today = isoDayBiz(new Date());
  const last  = toISO < today ? toISO : today;
  const span  = (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / 86_400_000 + 1;
  let days: OrderBookDay[];
  if (span <= FILL_DAYS_MAX) {
    days = [];
    for (let day = fromISO; day <= last; day = addDaysISO(day, 1)) {
      days.push(byDay.get(day) ?? { day, orders: 0, value: 0, collected: 0, outstanding: 0 });
    }
  } else {
    days = [...byDay.values()];
  }
  for (const d of days) { d.value = r2(d.value); d.collected = r2(d.collected); d.outstanding = r2(d.outstanding); }

  const ORDER: OrderBookMethod[] = ["cash", "transfer", "qris", "other"];
  return {
    orderCount: list.length,
    value:       r2(value),
    collected:   r2(collected),
    outstanding: r2(outstanding),
    unpaidCount, partialCount, paidCount,
    unpaidDue:   r2(unpaidDue),
    partialDue:  r2(partialDue),
    byMethod:    ORDER.filter((m) => byMethod.has(m))
                      .map((m) => ({ method: m, amount: r2(byMethod.get(m)!.amount), count: byMethod.get(m)!.count })),
    orders:      list,
    days,
  };
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

/** Revenue for a day range, from the one shared definition (lib/utils/revenue.ts). */
async function fetchPeriodRevenue(fromISO: string, toISO: string): Promise<RevenueSummary> {
  const start = bizDayStart(fromISO);
  const end   = bizDayEnd(toISO);
  return summarizeRevenue(await fetchRevenueRows(start, end), start, end);
}

export async function getFinanceRecap(fromISO: string, toISO: string): Promise<FinanceRecap> {
  const [raw, revenue] = await Promise.all([
    fetchTransactions(fromISO, toISO),
    fetchPeriodRevenue(fromISO, toISO),
  ]);
  return buildRecap(netChangeOut(raw), revenue);
}

/**
 * Income / expense recap of already-netted drawer transactions.
 *
 * Order income does NOT come from the drawer: the drawer only sees cash, so a
 * transfer or QRIS sale — or a payment whose order was later deleted — would
 * skew it. `inc:orders` is the shared revenue figure instead, the same number
 * the dashboard and the daily email show. Everything else (manual income,
 * adjustments, expenses) is a real drawer movement and comes from the ledger.
 */
function buildRecap(txs: RawTx[], revenue: RevenueSummary): FinanceRecap {
  const acc = new Map<string, RecapRow>();
  for (const tx of txs) {
    const meta = classify(tx);
    if (meta.key === "initial" || meta.key === "inc:orders") continue;
    const amount = parseFloat(tx.amount);
    const row = acc.get(meta.key) ?? { key: meta.key, label: meta.label, color: meta.color, total: 0, count: 0 };
    row.total += amount;
    row.count += 1;
    acc.set(meta.key, row);
  }
  if (revenue.revenue > 0) {
    acc.set("inc:orders", { key: "inc:orders", ...AUTO_META["inc:orders"], total: revenue.revenue, count: revenue.payments });
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

// ─── General ledger (Buku Besar) ──────────────────────────────────────────────
// The CONTROL accounts: one total per account for the period. Detail lives one
// level down in the subsidiary ledgers (Buku Kecil) — Kas → every cash movement,
// Piutang Usaha → what each customer owes — and the checks at the bottom prove
// that detail adds back up to the control total.
//
//   Kas               cash drawer        (1-1100)  from the cash register ledger
//   Piutang Usaha     customer balances  (1-1200)  orders billed − payments received
//   Pendapatan Jasa   laundry revenue    (4-1000)  money received on orders (shared definition)
//   Pendapatan Lain   other income       (4-2000)  manual income + drawer corrections in
//   Beban Operasional expenses           (5-1000)  manual expenses + drawer corrections out
//
// Revenue is the SAME number as the dashboard / daily email / marketing: it comes
// from lib/utils/revenue.ts, not from the drawer (which only ever sees cash).

export interface LedgerAccountLine {
  key:    string;
  label:  string;
  color:  string;
  /** Always positive — `side` says which column it adds to. */
  amount: number;
  count:  number;
  side:   "debit" | "credit";
}

export interface LedgerAccount {
  code:    string;
  name:    string;
  caption: string;
  group:   "asset" | "revenue" | "expense";
  /** Balance accounts carry a balance across periods; revenue / expense accounts restart at zero. */
  opening: number | null;
  debit:   number;
  credit:  number;
  closing: number | null;
  entries: number;
  lines:   LedgerAccountLine[];
  /** Where the detail behind this account lives. `{from}` / `{to}` are filled in by the page. */
  sub:     { label: string; path: string } | null;
}

/**
 * ok   — balanced.
 * note — worth knowing but nothing to fix (timing differences between sources).
 * warn — the books genuinely disagree; someone should look.
 */
export interface LedgerCheck {
  id:     string;
  status: "ok" | "note" | "warn";
  title:  string;
  detail: string;
}

export interface GeneralLedger {
  from: string;
  to:   string;
  accounts: LedgerAccount[];
  /** Laba Rugi: what the period earned. */
  statement: {
    revenue:     number;
    otherIncome: number;
    totalIncome: number;
    expenses:    number;
    netProfit:   number;
    margin:      number | null;
    byMethod:    RevenueSummary["byMethod"];
  };
  /** The same orders seen "by order": everything placed in the period. */
  placed: RevenueSummary["placed"];
  receivables: {
    opening: number; billed: number; collected: number; adjustments: number; closing: number;
    customers: number; orders: number;
  };
  drawer: {
    opening: number; cashIn: number; cashOut: number; closing: number;
    /** Register balance right now — only when the period runs up to today. */
    registerBalance: number | null;
    /** Cash taken on orders per the drawer minus cash revenue per the orders. */
    salesGap: number;
    /** Part of the gap that belongs to orders deleted since (their cash stays in the drawer). */
    deletedOrderCash: number;
  };
  checks: LedgerCheck[];
}

const METHOD_LABEL: Record<RevenueMethod, string> = {
  cash: "Cash", transfer: "Bank transfer", qris: "QRIS", other: "Other / unknown",
};
const METHOD_COLOR: Record<RevenueMethod, string> = {
  cash: "#16a34a", transfer: "#0891b2", qris: "#7c3aed", other: "#94a3b8",
};

/** Sum a set of lines into account lines, biggest first. */
function toLines(
  rows: { key: string; label: string; color: string; amount: number; side: "debit" | "credit" }[],
): LedgerAccountLine[] {
  const acc = new Map<string, LedgerAccountLine>();
  for (const r of rows) {
    const cur = acc.get(r.key) ?? { ...r, amount: 0, count: 0 };
    cur.amount += r.amount;
    cur.count++;
    acc.set(r.key, cur);
  }
  return [...acc.values()]
    .map((l) => ({ ...l, amount: r2(l.amount) }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getGeneralLedger(fromISO: string, toISO: string): Promise<GeneralLedger> {
  const start = bizDayStart(fromISO);
  const end   = bizDayEnd(toISO);
  const today = isoDayBiz(new Date());

  const [book, allOrders, [register]] = await Promise.all([
    getCashBook(fromISO, toISO),
    fetchRevenueRows(new Date(0)),
    db.select({ balance: cashRegister.balance }).from(cashRegister).limit(1),
  ]);
  const revenue = summarizeRevenue(allOrders, start, end);

  // ── 1-1100 Kas ──
  const kasLines = toLines(book.entries.map((e) => {
    const side = e.direction === "income" ? "debit" : "credit";
    const label =
      e.kind === "payment" ? "Cash taken on orders"
      : e.kind === "change" ? "Change given"
      : e.kind === "opening" ? "Opening balance entry"
      : e.categoryLabel;
    return { key: `${side}:${label}`, label, color: e.categoryColor, amount: e.amount, side } as const;
  }));
  const kas: LedgerAccount = {
    code: "1-1100", name: "Kas", caption: "Cash drawer", group: "asset",
    opening: book.openingBalance, debit: book.cashIn, credit: book.cashOut, closing: book.closingBalance,
    entries: book.entries.length, lines: kasLines,
    sub: { label: "Cash transactions", path: "/admin/buku-kecil?tab=kas&from={from}&to={to}" },
  };

  // ── 1-1200 Piutang Usaha ──
  const sumBalances = (asOf: Date) => r2(allOrders.reduce((s, o) => s + balanceAsOf(o, asOf), 0));
  const openingAr = sumBalances(new Date(start.getTime() - 1));
  const closingAr = sumBalances(end);
  const billed    = revenue.placed.value;
  const received  = revenue.revenue;
  const adjustments = r2(closingAr - (openingAr + billed - received));

  const owing = new Map<number, number>();
  let owingOrders = 0;
  for (const o of allOrders) {
    const bal = balanceAsOf(o, end);
    if (bal <= 0) continue;
    owing.set(o.customerId, (owing.get(o.customerId) ?? 0) + bal);
    owingOrders++;
  }
  const subsidiaryTotal = r2([...owing.values()].reduce((s, v) => s + v, 0));

  const arLines: LedgerAccountLine[] = [
    { key: "ar:billed", label: "Orders placed", color: "#1a7fba", amount: billed, count: revenue.placed.orders, side: "debit" },
    { key: "ar:paid", label: "Payments received", color: "#16a34a", amount: received, count: revenue.payments, side: "credit" },
  ];
  if (Math.abs(adjustments) >= 0.01) {
    arLines.push({
      key: "ar:adjust", label: "Corrections (edited / backdated orders)", color: "#a855f7",
      amount: Math.abs(adjustments), count: 1, side: adjustments > 0 ? "debit" : "credit",
    });
  }
  const piutang: LedgerAccount = {
    code: "1-1200", name: "Piutang Usaha", caption: "Customer receivables", group: "asset",
    opening: openingAr,
    debit:   r2(billed + Math.max(adjustments, 0)),
    credit:  r2(received + Math.max(-adjustments, 0)),
    closing: closingAr,
    entries: revenue.placed.orders + revenue.payments,
    lines:   arLines.filter((l) => l.amount > 0),
    sub:     { label: "Receivables per customer", path: "/admin/buku-kecil?tab=piutang&to={to}" },
  };

  // ── 4-1000 Pendapatan Jasa Laundry ──
  const pendapatan: LedgerAccount = {
    code: "4-1000", name: "Pendapatan Jasa Laundry", caption: "Laundry revenue — money received on orders", group: "revenue",
    opening: null, debit: 0, credit: revenue.revenue, closing: null,
    entries: revenue.payments,
    lines: revenue.byMethod.map((m) => ({
      key: `rev:${m.method}`, label: METHOD_LABEL[m.method], color: METHOD_COLOR[m.method],
      amount: m.amount, count: m.count, side: "credit" as const,
    })),
    sub: { label: "Orders by date", path: "/admin/daily-cash?view=custom&from={from}&to={to}&basis=orders" },
  };

  // ── 4-2000 Pendapatan Lain-lain  /  5-1000 Beban Operasional ──
  const manual = book.entries.filter((e) => e.kind === "manual" || e.kind === "adjustment");
  const otherLines = toLines(manual.filter((e) => e.direction === "income").map((e) => ({
    key: `inc:${e.categoryLabel}`, label: e.categoryLabel, color: e.categoryColor, amount: e.amount, side: "credit" as const,
  })));
  const expenseLines = toLines(manual.filter((e) => e.direction === "outcome").map((e) => ({
    key: `exp:${e.categoryLabel}`, label: e.categoryLabel, color: e.categoryColor, amount: e.amount, side: "debit" as const,
  })));
  const otherIncome = r2(otherLines.reduce((s, l) => s + l.amount, 0));
  const expenses    = r2(expenseLines.reduce((s, l) => s + l.amount, 0));

  const lain: LedgerAccount = {
    code: "4-2000", name: "Pendapatan Lain-lain", caption: "Other income & drawer corrections in", group: "revenue",
    opening: null, debit: 0, credit: otherIncome, closing: null,
    entries: otherLines.reduce((s, l) => s + l.count, 0), lines: otherLines,
    sub: { label: "Cash transactions", path: "/admin/buku-kecil?tab=kas&from={from}&to={to}" },
  };
  const beban: LedgerAccount = {
    code: "5-1000", name: "Beban Operasional", caption: "Operating expenses & drawer corrections out", group: "expense",
    opening: null, debit: expenses, credit: 0, closing: null,
    entries: expenseLines.reduce((s, l) => s + l.count, 0), lines: expenseLines,
    sub: { label: "Cash transactions", path: "/admin/buku-kecil?tab=kas&from={from}&to={to}" },
  };

  const totalIncome = r2(revenue.revenue + otherIncome);
  const netProfit   = r2(totalIncome - expenses);

  // ── Sales gap: cash the drawer took on orders vs cash revenue booked from orders ──
  // Deleting an order detaches its ledger rows (the cash really was received and
  // stays in the drawer) but removes it from revenue — that is the usual cause.
  const cashRevenue  = revenue.byMethod.find((m) => m.method === "cash")?.amount ?? 0;
  const salesGap     = r2(book.orderIncome - cashRevenue);
  const deletedPays  = book.entries.filter((e) => e.kind === "payment" && e.orderId == null);
  const deletedCash  = r2(deletedPays.reduce((s, e) => s + e.amount, 0));
  const unexplained  = r2(salesGap - deletedCash);
  const registerBalance = toISO >= today && register ? parseFloat(register.balance) : null;

  const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;
  const checks: LedgerCheck[] = [
    {
      id: "drawer-sum", status: Math.abs(book.drift) < 0.01 ? "ok" : "warn",
      title: "Drawer movements add up",
      detail: Math.abs(book.drift) < 0.01
        ? "Opening balance + cash in − cash out equals the recorded balance."
        : `The recorded balance is ${money(book.drift)} ${book.drift > 0 ? "higher" : "lower"} than the movements add up to.`,
    },
  ];
  if (registerBalance !== null) {
    const diff = r2(registerBalance - book.closingBalance);
    checks.push({
      id: "drawer-register", status: Math.abs(diff) < 0.01 ? "ok" : "warn",
      title: "Kas matches the cash register",
      detail: Math.abs(diff) < 0.01
        ? `Both show ${money(registerBalance)}.`
        : `The register says ${money(registerBalance)} but the ledger closes at ${money(book.closingBalance)}.`,
    });
  }
  checks.push(
    {
      id: "ar-rollforward", status: Math.abs(adjustments) < 0.01 ? "ok" : "warn",
      title: "Piutang rolls forward",
      detail: Math.abs(adjustments) < 0.01
        ? "Opening + orders placed − payments received equals the closing balance."
        : `Edited or backdated orders moved the balance by ${money(adjustments)} (shown as a correction).`,
    },
    {
      id: "ar-subsidiary", status: Math.abs(subsidiaryTotal - closingAr) < 0.01 ? "ok" : "warn",
      title: "Customer balances add up to Piutang",
      detail: Math.abs(subsidiaryTotal - closingAr) < 0.01
        ? `${owing.size} customer${owing.size === 1 ? "" : "s"} owe ${money(closingAr)} in total — see Buku Kecil › Receivables.`
        : `Customer balances total ${money(subsidiaryTotal)} but Piutang closes at ${money(closingAr)}.`,
    },
    {
      id: "sales-vs-drawer", status: Math.abs(unexplained) < 0.01 ? "ok" : "note",
      title: "Cash sales match the drawer",
      detail: Math.abs(unexplained) >= 0.01
        ? `The drawer took ${money(book.orderIncome)} on orders but orders show ${money(cashRevenue)} in cash sales — ${money(unexplained)} ${unexplained > 0 ? "more" : "less"} than deleted orders explain. That is a timing difference: an order whose paid date was changed after payment (e.g. it was edited), or a DP settled on another day, lands in a different period in each book.`
        : deletedPays.length > 0
          ? `Matches. The drawer also holds ${money(deletedCash)} from ${deletedPays.length} payment${deletedPays.length === 1 ? "" : "s"} on orders that were deleted — received cash that is no longer counted as revenue.`
          : "Cash received on orders equals what the drawer took.",
    },
  );

  return {
    from: fromISO,
    to:   toISO,
    accounts: [kas, piutang, pendapatan, lain, beban],
    statement: {
      revenue:     revenue.revenue,
      otherIncome,
      totalIncome,
      expenses,
      netProfit,
      margin:      totalIncome > 0 ? netProfit / totalIncome : null,
      byMethod:    revenue.byMethod,
    },
    placed: revenue.placed,
    receivables: {
      opening: openingAr, billed, collected: received, adjustments, closing: closingAr,
      customers: owing.size, orders: owingOrders,
    },
    drawer: {
      opening: book.openingBalance, cashIn: book.cashIn, cashOut: book.cashOut, closing: book.closingBalance,
      registerBalance, salesGap, deletedOrderCash: deletedCash,
    },
    checks,
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
