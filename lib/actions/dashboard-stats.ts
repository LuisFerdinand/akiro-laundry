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
import {
  startOfDayBiz,
  endOfDayBiz,
  startOfMonthBiz,
  subDaysBiz,
  subMonthsBiz,
  hourBiz,
  formatBiz,
} from "@/lib/utils/business-time";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyRevenuePoint  { date: string;  revenue: number; orders: number }
export interface WeeklyRevenuePoint { week: string;  revenue: number; orders: number }
export interface MonthlyRevenuePoint { month: string; revenue: number; orders: number }

export interface BusyHourPoint { hour: number; avgOrders: number; totalOrders: number }

export interface BusyHoursByPeriod {
  month:     BusyHourPoint[];
  sixMonths: BusyHourPoint[];
  allTime:   BusyHourPoint[];
}

export interface PaymentBreakdown {
  paid:        number;
  unpaid:      number;
  paidRevenue: number;
  unpaidValue: number;
}

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
  paymentBreakdown: PaymentBreakdown;
  paymentBreakdownByPeriod: {
    daily:   PaymentBreakdown;
    weekly:  PaymentBreakdown;
    monthly: PaymentBreakdown;
  };
  dailyRevenue:   DailyRevenuePoint[];
  weeklyRevenue:  WeeklyRevenuePoint[];
  monthlyRevenue: MonthlyRevenuePoint[];
  busyHoursByPeriod: BusyHoursByPeriod;
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

const startOfDay   = startOfDayBiz;
const startOfMonth = startOfMonthBiz;
const subDays      = subDaysBiz;
const subMonths    = subMonthsBiz;
function fmt(d: Date) {
  return formatBiz(d, { month: "short", day: "numeric" });
}
function fmtMonth(d: Date) {
  return formatBiz(d, { month: "short", year: "2-digit" });
}
function fmtWeek(d: Date) {
  return formatBiz(d, { month: "short", day: "numeric" });
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

  // Paid orders are bucketed by paid date, unpaid by createdAt (they have no
  // paidAt yet) — same convention as revenueIn()/ordersIn() above.
  const paymentBreakdownFor = (from: Date, to?: Date): PaymentBreakdown => {
    const paidIn   = paidOrders.filter((o) => inRange(paidDate(o), from, to));
    const unpaidIn = unpaidOrders.filter((o) => inRange(new Date(o.createdAt), from, to));
    return {
      paid:        paidIn.length,
      unpaid:      unpaidIn.length,
      paidRevenue: paidIn.reduce((s, o) => s + price(o), 0),
      unpaidValue: unpaidIn.reduce((s, o) => s + price(o), 0),
    };
  };

  const paymentBreakdownByPeriod = {
    daily:   paymentBreakdownFor(todayStart),
    weekly:  paymentBreakdownFor(weekStart),
    monthly: paymentBreakdownFor(monthStart),
  };

  // ── 4. Daily revenue — last 7 days ──────────────────────────────────────────

  const dailyRevenue: DailyRevenuePoint[] = Array.from({ length: 7 }, (_, i) => {
    const day    = subDays(todayStart, 6 - i);
    const dayEnd = endOfDayBiz(day);
    return {
      date:    fmt(day),
      revenue: revenueIn(day, dayEnd),
      orders:  allOrders.filter((o) =>
        inRange(new Date(o.createdAt), day, dayEnd),
      ).length,
    };
  });

  // ── 4b. Weekly revenue — last 8 weeks ───────────────────────────────────────

  const weeklyRevenue: WeeklyRevenuePoint[] = Array.from({ length: 8 }, (_, i) => {
    const weeksAgo = 7 - i;
    const wStart = subDays(todayStart, weeksAgo * 7 + 6);
    const wEnd   = endOfDayBiz(subDays(todayStart, weeksAgo * 7));
    return {
      week:    fmtWeek(wStart),
      revenue: revenueIn(wStart, wEnd),
      orders:  allOrders.filter((o) =>
        inRange(new Date(o.createdAt), wStart, wEnd),
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

  // ── 5c. Busy hours — total (and average) orders per hour-of-day, clamped to
  // store hours. Orders logged outside 8AM–8PM (e.g. backdated entries) count
  // against the nearest edge hour rather than being dropped.

  const storeOpenHour  = 8;  // 8 AM — kept in sync with BusyHourChart's default range
  const storeCloseHour = 20; // 8 PM
  const dayMs = 24 * 60 * 60 * 1000;

  const computeBusyHours = (rows: { createdAt: Date }[], daySpan: number): BusyHourPoint[] => {
    const hourCounts = new Map<number, number>();
    for (let h = storeOpenHour; h <= storeCloseHour; h++) hourCounts.set(h, 0);
    for (const o of rows) {
      const rawHour = hourBiz(new Date(o.createdAt));
      const hour = Math.min(storeCloseHour, Math.max(storeOpenHour, rawHour));
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }
    return Array.from({ length: storeCloseHour - storeOpenHour + 1 }, (_, i) => {
      const hour  = storeOpenHour + i;
      const total = hourCounts.get(hour) ?? 0;
      return { hour, totalOrders: total, avgOrders: Math.round((total / daySpan) * 100) / 100 };
    });
  };

  // Denominator: calendar days spanned by each window, so the average
  // reflects "per day the shop was open" rather than just raw totals.
  const sixMonthDaySpan = Math.max(1, Math.round((now.getTime() - sixMonthsAgo.getTime()) / dayMs));
  const busyHoursSixMonths = computeBusyHours(allOrders, sixMonthDaySpan);

  const pastMonthStart = subDays(todayStart, 29); // rolling 30-day window
  const pastMonthDaySpan = Math.max(1, Math.round((now.getTime() - pastMonthStart.getTime()) / dayMs));
  const busyHoursMonth = computeBusyHours(
    allOrders.filter((o) => inRange(new Date(o.createdAt), pastMonthStart)),
    pastMonthDaySpan,
  );

  // All-time needs its own query since `allOrders` is capped to the last 6 months.
  const allTimeOrderDates = await db
    .select({ createdAt: orders.createdAt })
    .from(orders);
  const earliestOrderDate = allTimeOrderDates.reduce(
    (min, o) => (o.createdAt < min ? o.createdAt : min),
    now,
  );
  const allTimeDaySpan = Math.max(1, Math.round((now.getTime() - earliestOrderDate.getTime()) / dayMs));
  const busyHoursAllTime = computeBusyHours(allTimeOrderDates, allTimeDaySpan);

  const busyHoursByPeriod: BusyHoursByPeriod = {
    month:     busyHoursMonth,
    sixMonths: busyHoursSixMonths,
    allTime:   busyHoursAllTime,
  };

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

  const custNameMap = new Map<number, string>();
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
    paymentBreakdownByPeriod,
    dailyRevenue,
    weeklyRevenue,
    monthlyRevenue,
    busyHoursByPeriod,
    topCustomers,
    topServices,
    cashBalance,
    newCustomersThisMonth,
    avgOrderValue,
    recentOrders,
  };
}