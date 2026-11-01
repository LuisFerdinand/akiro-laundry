// lib/actions/receivables.ts
"use server";
//
// Buku Kecil › Receivables (Piutang per pelanggan): the SUBSIDIARY ledger behind
// the Piutang Usaha account in Buku Besar. Same orders, same maths
// (balanceAsOf in lib/utils/revenue.ts) — grouped by customer instead of
// totalled, so the two always add up.

import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { bizDayEnd, isoDayBiz } from "@/lib/utils/business-time";
import { balanceAsOf, round2 } from "@/lib/utils/revenue";
import { AGING_BUCKETS, ageInDays, bucketOf, type AgingBucket } from "@/lib/utils/receivables";
import { fetchRevenueRows } from "@/lib/db/queries/revenue.queries";

export interface ReceivableOrder {
  id:            number;
  orderNumber:   string;
  /** ISO timestamp the order was placed. */
  createdAt:     string;
  ageDays:       number;
  status:        string;
  paymentStatus: string;
  total:         number;
  paid:          number;
  balance:       number;
}

export interface CustomerReceivable {
  customerId:   number;
  name:         string;
  phone:        string;
  orders:       ReceivableOrder[];
  billed:       number;
  paid:         number;
  balance:      number;
  oldestAge:    number;
  bucket:       AgingBucket;
}

export interface ReceivablesLedger {
  /** Balances as at the end of this day, YYYY-MM-DD. */
  asOf:      string;
  total:     number;
  orders:    number;
  customers: CustomerReceivable[];
  aging:     { key: AgingBucket; label: string; hint: string; amount: number; customers: number }[];
}

export async function getReceivablesLedger(asOfISO?: string): Promise<ReceivablesLedger> {
  const today = isoDayBiz(new Date());
  const asOf  = asOfISO && asOfISO <= today ? asOfISO : today;
  const end   = bizDayEnd(asOf);

  const rows = await fetchRevenueRows(new Date(0));

  const open = rows
    .map((o) => ({ o, balance: balanceAsOf(o, end) }))
    .filter((x) => x.balance > 0);

  const ids = [...new Set(open.map((x) => x.o.customerId))];
  const people = ids.length === 0 ? [] : await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(inArray(customers.id, ids));
  const personById = new Map(people.map((p) => [p.id, p]));

  const byCustomer = new Map<number, CustomerReceivable>();
  for (const { o, balance } of open) {
    const total   = parseFloat(o.totalPrice ?? "0");
    const ageDays = ageInDays(o.createdAt, end);
    const person  = personById.get(o.customerId);

    const entry = byCustomer.get(o.customerId) ?? {
      customerId: o.customerId,
      name:       person?.name  ?? "Unknown customer",
      phone:      person?.phone ?? "",
      orders:     [], billed: 0, paid: 0, balance: 0, oldestAge: 0, bucket: "current" as AgingBucket,
    };
    entry.orders.push({
      id: o.id, orderNumber: o.orderNumber, createdAt: o.createdAt.toISOString(), ageDays,
      status: o.status, paymentStatus: o.paymentStatus,
      total, paid: round2(total - balance), balance,
    });
    entry.billed += total;
    entry.paid   += total - balance;
    entry.balance += balance;
    entry.oldestAge = Math.max(entry.oldestAge, ageDays);
    byCustomer.set(o.customerId, entry);
  }

  const list = [...byCustomer.values()]
    .map((c) => ({
      ...c,
      billed:  round2(c.billed),
      paid:    round2(c.paid),
      balance: round2(c.balance),
      bucket:  bucketOf(c.oldestAge),
      orders:  c.orders.sort((a, b) => b.ageDays - a.ageDays),
    }))
    .sort((a, b) => b.oldestAge - a.oldestAge || b.balance - a.balance);

  return {
    asOf,
    total:     round2(list.reduce((s, c) => s + c.balance, 0)),
    orders:    open.length,
    customers: list,
    aging: AGING_BUCKETS.map((b) => {
      // Aged by each ORDER, not by the customer's oldest one, so the strip adds up to the total.
      const inBucket = open.filter(({ o }) => bucketOf(ageInDays(o.createdAt, end)) === b.key);
      return {
        ...b,
        amount:    round2(inBucket.reduce((s, x) => s + x.balance, 0)),
        customers: new Set(inBucket.map((x) => x.o.customerId)).size,
      };
    }),
  };
}
