// lib/actions/dashboard-stats.ts
"use server";

import { db } from "@/lib/db";
import {
  orders,
  customers,
  orderItems,
  servicePricing,
  cashRegister,
} from "@/lib/db/schema";
import { eq, desc, gte, inArray } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyRevenuePoint  { date: string;  revenue: number; orders: number }
export interface MonthlyRevenuePoint { month: string; revenue: number; orders: number }

export interface FullDashboardStats {
  revenue: {
    today:     number;
    thisWeek:  number;
    thisMonth: number;
    lastMonth: number;
  };
  orderCounts: {
    today:     number;
    thisWeek:  number;
    thisMonth: number;
    lastMonth: number;
  };
  statusBreakdown: {
    pending:    number;
    processing: number;
    done:       number;
    picked_up:  number;
  };
  paymentBreakdown: {
    paid:         number;
    unpaid:       number;
    paidRevenue:  number;
    unpaidValue:  number;
  };
  dailyRevenue:   DailyRevenuePoint[];
  monthlyRevenue: MonthlyRevenuePoint[];
  topCustomers: {
    id:          number;
    name:        string;
    totalSpent:  number;
    totalOrders: number;
  }[];
  topServices: {
    id:           number;
    name:         string;
    category:     string;
    totalOrders:  number;
    totalRevenue: number;
  }[];
  cashBalance:          number;
  newCustomersThisMonth: number;
  avgOrderValue:        number;
  recentOrders: {
    id:            number;
    orderNumber:   string;
    customerName:  string;
    totalPrice:    string;
    paymentStatus: string;
    status:        string;
    createdAt:     Date;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date)  { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function subDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() - n); return x; }
function subMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() - n);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function getFullDashboardStats(): Promise<FullDashboardStats> {
  const now         = new Date();
  const todayStart  = startOfDay(now);
  const weekStart   = subDays(todayStart, 6);        // last 7 days incl. today
  const monthStart  = startOfMonth(now);
  const lastMonthS  = subMonths(now, 1);
  const lastMonthE  = new Date(monthStart.getTime() - 1);
  const sixMonthsAgo = subMonths(now, 5);

  // ── 1. Fetch all orders needed (6 months back is plenty for all stats) ───────
  const allOrders = await db
    .select({
      id:            orders.id,
      customerId:    orders.customerId,
      totalPrice:    orders.totalPrice,
      paymentStatus: orders.paymentStatus,
      status:        orders.status,
      orderNumber:   orders.orderNumber,
      paidAt:        orders.paidAt,
      createdAt:     orders.createdAt,
    })
    .from(orders)
    .where(gte(orders.createdAt, sixMonthsAgo))
    .orderBy(desc(orders.createdAt));

  // ── 2. Derived slices ────────────────────────────────────────────────────────

  const inRange   = (d: Date, from: Date, to?: Date) => d >= from && (!to || d <= to);
  const price     = (o: { totalPrice: string }) => parseFloat(o.totalPrice ?? "0");
  const paidDate  = (o: { paidAt: Date | null; createdAt: Date }) =>
    new Date(o.paidAt ?? o.createdAt);

  const paidOrders   = allOrders.filter((o) => o.paymentStatus === "paid");
  const unpaidOrders = allOrders.filter((o) => o.paymentStatus === "unpaid");

  // Revenue (counted on paid date)
  const revenueIn = (from: Date, to?: Date) =>
    paidOrders
      .filter((o) => inRange(paidDate(o), from, to))
      .reduce((s, o) => s + price(o), 0);

  // Order counts (counted on createdAt)
  const ordersIn = (from: Date, to?: Date) =>
    allOrders.filter((o) => inRange(new Date(o.createdAt), from, to)).length;

  // ── 3. Status / payment breakdown ───────────────────────────────────────────

  const statusBreakdown = {
    pending:    0,
    processing: 0,
    done:       0,
    picked_up:  0,
  };
  for (const o of allOrders) {
    if (o.status in statusBreakdown) {
      (statusBreakdown as Record<string, number>)[o.status]++;
    }
  }

  const paymentBreakdown = {
    paid:        paidOrders.length,
    unpaid:      unpaidOrders.length,
    paidRevenue: paidOrders.reduce((s, o) => s + price(o), 0),
    unpaidValue: unpaidOrders.reduce((s, o) => s + price(o), 0),
  };

  // ── 4. Daily revenue — last 7 days ──────────────────────────────────────────

  const dailyRevenue: DailyRevenuePoint[] = Array.from({ length: 7 }, (_, i) => {
    const day    = subDays(todayStart, 6 - i);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    return {
      date:    fmt(day),
      revenue: revenueIn(day, dayEnd),
      orders:  allOrders.filter((o) =>
        inRange(new Date(o.createdAt), day, dayEnd),
      ).length,
    };
  });

  // ── 5. Monthly revenue — last 6 months ──────────────────────────────────────

  const monthlyRevenue: MonthlyRevenuePoint[] = Array.from({ length: 6 }, (_, i) => {
    const mStart = subMonths(now, 5 - i);
    const mEnd   = i < 5
      ? new Date(subMonths(now, 5 - i - 1).getTime() - 1)
      : now;
    return {
      month:   fmtMonth(mStart),
      revenue: revenueIn(mStart, mEnd),
      orders:  allOrders.filter((o) =>
        inRange(new Date(o.createdAt), mStart, mEnd),
      ).length,
    };
  });

  // ── 6. Top customers (by paid spend) ─────────────────────────────────────────

  const spendByCustomer = new Map<number, { spent: number; orders: number }>();
  for (const o of paidOrders) {
    const cur = spendByCustomer.get(o.customerId) ?? { spent: 0, orders: 0 };
    spendByCustomer.set(o.customerId, {
      spent:  cur.spent + price(o),
      orders: cur.orders + 1,
    });
  }

  let topCustomers: FullDashboardStats["topCustomers"] = [];
  if (spendByCustomer.size > 0) {
    const topIds = [...spendByCustomer.entries()]
      .sort((a, b) => b[1].spent - a[1].spent)
      .slice(0, 3)
      .map(([id]) => id);

    const custRows = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(inArray(customers.id, topIds));

    topCustomers = topIds
      .map((id) => {
        const c   = custRows.find((r) => r.id === id);
        const s   = spendByCustomer.get(id)!;
        return c
          ? { id, name: c.name, totalSpent: s.spent, totalOrders: s.orders }
          : null;
      })
      .filter(Boolean) as FullDashboardStats["topCustomers"];
  }

  // ── 7. Top services (by order_items count) ───────────────────────────────────

  let topServices: FullDashboardStats["topServices"] = [];
  const orderIds = allOrders.map((o) => o.id);
  if (orderIds.length > 0) {
    const itemRows = await db
      .select({
        servicePricingId: orderItems.servicePricingId,
        subtotal:         orderItems.subtotal,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const byService = new Map<number, { count: number; revenue: number }>();
    for (const r of itemRows) {
      const cur = byService.get(r.servicePricingId) ?? { count: 0, revenue: 0 };
      byService.set(r.servicePricingId, {
        count:   cur.count + 1,
        revenue: cur.revenue + parseFloat(r.subtotal ?? "0"),
      });
    }

    const topSvcIds = [...byService.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([id]) => id);

    if (topSvcIds.length > 0) {
      const svcRows = await db
        .select({
          id:       servicePricing.id,
          name:     servicePricing.name,
          category: servicePricing.category,
        })
        .from(servicePricing)
        .where(inArray(servicePricing.id, topSvcIds));

      topServices = topSvcIds
        .map((id) => {
          const s = svcRows.find((r) => r.id === id);
          const d = byService.get(id)!;
          return s
            ? { id, name: s.name, category: s.category, totalOrders: d.count, totalRevenue: d.revenue }
            : null;
        })
        .filter(Boolean) as FullDashboardStats["topServices"];
    }
  }

  // ── 8. Cash register balance ──────────────────────────────────────────────────

  const cashRows  = await db.select({ balance: cashRegister.balance }).from(cashRegister).limit(1);
  const cashBalance = cashRows[0] ? parseFloat(cashRows[0].balance) : 0;

  // ── 9. New customers this month ───────────────────────────────────────────────

  const newCustRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(gte(customers.createdAt, monthStart));
  const newCustomersThisMonth = newCustRows.length;

  // ── 10. Average order value (paid orders, this month) ─────────────────────────

  const paidThisMonth = paidOrders.filter(
    (o) => inRange(paidDate(o), monthStart),
  );
  const avgOrderValue =
    paidThisMonth.length > 0
      ? paidThisMonth.reduce((s, o) => s + price(o), 0) / paidThisMonth.length
      : 0;

  // ── 11. Recent orders (last 10, with customer name) ───────────────────────────

  const recentRaw = allOrders.slice(0, 10);
  const recentCustIds = [...new Set(recentRaw.map((o) => o.customerId))];

  let custNameMap = new Map<number, string>();
  if (recentCustIds.length > 0) {
    const names = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(inArray(customers.id, recentCustIds));
    for (const c of names) custNameMap.set(c.id, c.name);
  }

  const recentOrders = recentRaw.map((o) => ({
    id:            o.id,
    orderNumber:   o.orderNumber,
    customerName:  custNameMap.get(o.customerId) ?? "Unknown",
    totalPrice:    o.totalPrice,
    paymentStatus: o.paymentStatus,
    status:        o.status,
    createdAt:     o.createdAt,
  }));

  // ── Return ────────────────────────────────────────────────────────────────────

  return {
    revenue: {
      today:     revenueIn(todayStart),
      thisWeek:  revenueIn(weekStart),
      thisMonth: revenueIn(monthStart),
      lastMonth: revenueIn(lastMonthS, lastMonthE),
    },
    orderCounts: {
      today:     ordersIn(todayStart),
      thisWeek:  ordersIn(weekStart),
      thisMonth: ordersIn(monthStart),
      lastMonth: ordersIn(lastMonthS, lastMonthE),
    },
    statusBreakdown,
    paymentBreakdown,
    dailyRevenue,
    monthlyRevenue,
    topCustomers,
    topServices,
    cashBalance,
    newCustomersThisMonth,
    avgOrderValue,
    recentOrders,
  };
}