/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/admin-customers.ts
"use server";

import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import type { Customer } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  startOfMonthBiz,
  subMonthsBiz,
  formatBiz,
  startOfDayBiz,
  endOfDayBiz,
  subDaysBiz,
} from "@/lib/utils/business-time";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerWithStats extends Customer {
  totalOrders:   number;
  totalSpent:    number;
  lastOrderDate: Date | null;
}

export type SortOption = "recent" | "top_spender" | "most_orders" | "newest";

/** Date window (yyyy-mm-dd, inclusive) for the "no order in this period" filter. */
export interface InactiveRange {
  from: string;
  to:   string;
}

export interface MonthlyCustomerCount {
  month:     string;  // short label, e.g. "Aug 26" — axis tick
  monthFull: string;  // full label, e.g. "August 2026" — tooltip
  count:     number;
}

export interface CustomerInsights {
  topSpenders:    CustomerWithStats[];
  mostRepeat:     CustomerWithStats[];
  newThisMonth:   CustomerWithStats[];
  newByMonth:     MonthlyCustomerCount[];
}

// ─── List all customers with stats ───────────────────────────────────────────

export async function getAdminCustomers(
  search?: string,
  sort: SortOption = "recent",
  inactive?: InactiveRange,
): Promise<CustomerWithStats[]> {
  const allCustomers = await db
    .select()
    .from(customers)
    .orderBy(desc(customers.createdAt));

  const filtered = search
    ? allCustomers.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q);
      })
    : allCustomers;

  const allOrders = await db
    .select({
      customerId:    orders.customerId,
      totalPrice:    orders.totalPrice,
      createdAt:     orders.createdAt,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders);

  const withStats: CustomerWithStats[] = filtered.map((c) => {
    const customerOrders = allOrders.filter((o) => o.customerId === c.id);
    const paid = customerOrders.filter((o) => o.paymentStatus === "paid");
    const sorted = [...customerOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      ...c,
      totalOrders:   customerOrders.length,
      totalSpent:    paid.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
      lastOrderDate: sorted[0]?.createdAt ?? null,
    };
  });

  // Inactivity filter — customers who have ordered before but placed no order
  // inside the selected date window (a churn / win-back list).
  let scoped = withStats;
  if (inactive) {
    const winStart = startOfDayBiz(new Date(`${inactive.from}T00:00:00.000Z`)).getTime();
    const winEnd   = endOfDayBiz(new Date(`${inactive.to}T00:00:00.000Z`)).getTime();
    scoped = withStats.filter((c) => {
      const custOrders = allOrders.filter((o) => o.customerId === c.id);
      if (custOrders.length === 0) return false;
      const orderedInWindow = custOrders.some((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= winStart && t <= winEnd;
      });
      return !orderedInWindow;
    });
  }

  // Apply sort
  switch (sort) {
    case "top_spender":
      return scoped.sort((a, b) => b.totalSpent - a.totalSpent);
    case "most_orders":
      return scoped.sort((a, b) => b.totalOrders - a.totalOrders);
    case "newest":
      return scoped.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "recent":
    default:
      return scoped.sort((a, b) => {
        const aDate = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        const bDate = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        return bDate - aDate;
      });
  }
}

// ─── Insights: top spenders, repeat buyers, monthly new ──────────────────────

export async function getCustomerInsights(): Promise<CustomerInsights> {
  const allCustomers = await db
    .select()
    .from(customers)
    .orderBy(desc(customers.createdAt));

  const allOrders = await db
    .select({
      customerId:    orders.customerId,
      totalPrice:    orders.totalPrice,
      createdAt:     orders.createdAt,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders);

  const withStats: CustomerWithStats[] = allCustomers.map((c) => {
    const customerOrders = allOrders.filter((o) => o.customerId === c.id);
    const paid = customerOrders.filter((o) => o.paymentStatus === "paid");
    const sortedOrd = [...customerOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      ...c,
      totalOrders:   customerOrders.length,
      totalSpent:    paid.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
      lastOrderDate: sortedOrd[0]?.createdAt ?? null,
    };
  });

  // Top 5 spenders
  const topSpenders = [...withStats]
    .filter((c) => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // Top 5 repeat buyers
  const mostRepeat = [...withStats]
    .filter((c) => c.totalOrders > 0)
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, 5);

  // New this month
  const now = new Date();
  const startOfMonth = startOfMonthBiz(now);
  const newThisMonth = withStats.filter(
    (c) => new Date(c.createdAt) >= startOfMonth
  );

  // New customers by month (last 12 months)
  const newByMonth: MonthlyCustomerCount[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonthsBiz(now, i);
    const nextMonth = subMonthsBiz(now, i - 1);
    const monthLabel     = formatBiz(d, { month: "short", year: "2-digit" });
    const monthFullLabel = formatBiz(d, { month: "long",  year: "numeric" });
    const count = allCustomers.filter((c) => {
      const created = new Date(c.createdAt);
      return created >= d && created < nextMonth;
    }).length;
    newByMonth.push({ month: monthLabel, monthFull: monthFullLabel, count });
  }

  return { topSpenders, mostRepeat, newThisMonth, newByMonth };
}

// ─── New-customer series (day / month buckets over a custom range) ────────────

export type NewCustomerGranularity = "day" | "month";

export interface NewCustomerBucket {
  label:     string;  // axis tick
  fullLabel: string;  // tooltip
  count:     number;
}

// Hard caps so the bar chart stays readable regardless of the range picked.
// (Mirrored in components/admin/NewCustomersPanel.tsx — a "use server" module
// may only export async functions, so these can't be shared from here.)
const MAX_DAYS = 31;
const MAX_MONTHS = 12;

export async function getNewCustomerSeries(
  fromISO: string,
  toISO: string,
  granularity: NewCustomerGranularity,
): Promise<NewCustomerBucket[]> {
  const parse = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  let from = startOfDayBiz(parse(fromISO));
  const to = endOfDayBiz(parse(toISO));
  if (from > to) from = startOfDayBiz(parse(toISO));

  const rows = await db.select({ createdAt: customers.createdAt }).from(customers);
  const countBetween = (a: Date, b: Date) =>
    rows.filter((r) => {
      const c = new Date(r.createdAt);
      return c >= a && c <= b;
    }).length;

  if (granularity === "day") {
    // Clamp span to the last MAX_DAYS days of the requested range.
    let cursor = startOfDayBiz(from);
    const spanDays = Math.round((endOfDayBiz(to).getTime() - cursor.getTime()) / 86_400_000) + 1;
    if (spanDays > MAX_DAYS) {
      cursor = startOfDayBiz(subDaysBiz(to, MAX_DAYS - 1));
    }
    const out: NewCustomerBucket[] = [];
    while (cursor <= to) {
      const dayEnd = endOfDayBiz(cursor);
      out.push({
        label:     formatBiz(cursor, { month: "short", day: "numeric" }),
        fullLabel: formatBiz(cursor, { weekday: "short", month: "long", day: "numeric", year: "numeric" }),
        count:     countBetween(cursor, dayEnd > to ? to : dayEnd),
      });
      cursor = startOfDayBiz(subDaysBiz(cursor, -1));
    }
    return out;
  }

  // month buckets
  const mEndLimit = startOfMonthBiz(to);
  const months: Date[] = [];
  let m = startOfMonthBiz(from);
  while (m <= mEndLimit) {
    months.push(m);
    m = subMonthsBiz(m, -1);
  }
  const trimmed = months.slice(-MAX_MONTHS);

  return trimmed.map((monthStart, i) => {
    const next = i < trimmed.length - 1 ? trimmed[i + 1] : subMonthsBiz(monthStart, -1);
    const monthEnd = new Date(next.getTime() - 1);
    return {
      label:     formatBiz(monthStart, { month: "short", year: "2-digit" }),
      fullLabel: formatBiz(monthStart, { month: "long", year: "numeric" }),
      count:     countBetween(monthStart, monthEnd > to ? to : monthEnd),
    };
  });
}

// ─── Single customer + their orders ──────────────────────────────────────────

export interface CustomerDetail extends CustomerWithStats {
  recentOrders: {
    id:            number;
    orderNumber:   string;
    totalPrice:    string;
    status:        string;
    paymentStatus: string;
    createdAt:     Date;
    serviceName:   string;
  }[];
}

export async function getAdminCustomerById(id: number): Promise<CustomerDetail | null> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return null;

  const customerOrders = await db
    .select({
      id:            orders.id,
      orderNumber:   orders.orderNumber,
      totalPrice:    orders.totalPrice,
      status:        orders.status,
      paymentStatus: orders.paymentStatus,
      createdAt:     orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  const paid = customerOrders.filter((o) => o.paymentStatus === "paid");

  return {
    ...customer,
    totalOrders:   customerOrders.length,
    totalSpent:    paid.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
    lastOrderDate: customerOrders[0]?.createdAt ?? null,
    recentOrders:  customerOrders.map((o) => ({ ...o, serviceName: "—" })),
  };
}

// ─── Create customer ──────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string; phone: string; address: string; referralSource?: string | null;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const [c] = await db
      .insert(customers)
      .values({
        name:           data.name.trim(),
        phone:          data.phone.trim(),
        address:        data.address.trim(),
        referralSource: data.referralSource?.trim() || null,
      })
      .returning({ id: customers.id });
    revalidatePath("/admin/customers");
    return { success: true, id: c.id };
  } catch (err: any) {
    if (err?.message?.includes("unique")) return { success: false, error: "Phone number already exists." };
    return { success: false, error: "Failed to create customer." };
  }
}

// ─── Update customer ──────────────────────────────────────────────────────────

export async function updateCustomer(
  id: number,
  data: { name: string; phone: string; address: string; referralSource?: string | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(customers)
      .set({
        name:      data.name.trim(),
        phone:     data.phone.trim(),
        address:   data.address.trim(),
        updatedAt: new Date(),
        // Only touch referral_source when the caller explicitly provides it,
        // so unrelated edits don't wipe an existing value.
        ...("referralSource" in data
          ? { referralSource: data.referralSource?.trim() || null }
          : {}),
      })
      .where(eq(customers.id, id));
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { success: true };
  } catch (err: any) {
    if (err?.message?.includes("unique")) return { success: false, error: "Phone number already exists." };
    return { success: false, error: "Failed to update customer." };
  }
}

// ─── Delete customer ──────────────────────────────────────────────────────────

export async function deleteCustomer(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const [target] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!target) return { success: false, error: "Customer not found." };

    // orders.customerId is NOT NULL with no cascade rule — a customer with existing
    // orders can't be deleted without breaking that FK. Refuse instead of erroring.
    const [{ value: orderCount }] = await db
      .select({ value: count() })
      .from(orders)
      .where(eq(orders.customerId, id));

    if (Number(orderCount) > 0) {
      return {
        success: false,
        error: `Cannot delete — this customer has ${orderCount} order${Number(orderCount) !== 1 ? "s" : ""}. Delete their orders first.`,
      };
    }

    await db.delete(customers).where(eq(customers.id, id));
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete customer." };
  }
}