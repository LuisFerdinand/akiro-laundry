// lib/actions/dashboard-stats.ts
"use server";

import { db } from "@/lib/db";
import { orders, customers, servicePricing, cashRegisterTransactions, cashRegister } from "@/lib/db/schema";
import { desc, eq, gte, and } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PeriodRevenue {
  today:     number;
  thisWeek:  number;
  thisMonth: number;
  lastMonth: number;
  allTime:   number;
}

export interface PeriodOrders {
  today:     number;
  thisWeek:  number;
  thisMonth: number;
  lastMonth: number;
}

export interface DailyRevenuePoint {
  date:    string; // "Mon", "Tue" etc.
  revenue: number;
  orders:  number;
}

export interface MonthlyRevenuePoint {
  month:   string; // "Jan", "Feb" etc.
  revenue: number;
  orders:  number;
}

export interface TopCustomer {
  id:          number;
  name:        string;
  totalSpent:  number;
  totalOrders: number;
}

export interface TopService {
  id:          number;
  name:        string;
  category:    string;
  totalOrders: number;
  totalRevenue: number;
}

export interface OrderStatusBreakdown {
  pending:    number;
  processing: number;
  done:       number;
  picked_up:  number;
}

export interface PaymentBreakdown {
  paid:         number;
  unpaid:       number;
  paidRevenue:  number;
  unpaidValue:  number;
}

export interface SocialPost {
  id:        number;
  platform:  "tiktok" | "instagram";
  caption:   string;
  url:       string;
  likes:     number;
  comments:  number;
  shares:    number;
  views:     number;
  postedAt:  Date;
  createdAt: Date;
}

export interface FullDashboardStats {
  revenue:         PeriodRevenue;
  orderCounts:     PeriodOrders;
  dailyRevenue:    DailyRevenuePoint[];   // last 7 days
  monthlyRevenue:  MonthlyRevenuePoint[]; // last 6 months
  statusBreakdown: OrderStatusBreakdown;
  paymentBreakdown: PaymentBreakdown;
  topCustomers:    TopCustomer[];
  topServices:     TopService[];
  cashBalance:     number;
  newCustomersThisMonth: number;
  avgOrderValue:   number;
  recentOrders:    {
    id: number; orderNumber: string; customerName: string;
    totalPrice: string; status: string; paymentStatus: string; createdAt: Date;
  }[];
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getFullDashboardStats(): Promise<FullDashboardStats> {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ── Fetch all orders (manageable dataset for a laundry shop) ──
  const allOrders = await db
    .select({
      id:               orders.id,
      orderNumber:      orders.orderNumber,
      customerId:       orders.customerId,
      servicePricingId: orders.servicePricingId,
      totalPrice:       orders.totalPrice,
      paymentStatus:    orders.paymentStatus,
      status:           orders.status,
      createdAt:        orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));

  // ── Fetch all customers ──
  const allCustomers = await db.select({ id: customers.id, name: customers.name, createdAt: customers.createdAt }).from(customers);

  // ── Fetch all services ──
  const allServices = await db.select({ id: servicePricing.id, name: servicePricing.name, category: servicePricing.category }).from(servicePricing);

  // ── Cash register ──
  const [cashRow] = await db.select({ balance: cashRegister.balance }).from(cashRegister).limit(1);

  // ── Helpers ──
  const paidOrders   = allOrders.filter(o => o.paymentStatus === "paid");
  const unpaidOrders = allOrders.filter(o => o.paymentStatus === "unpaid");

  const sumRevenue = (rows: typeof paidOrders, from?: Date, to?: Date) =>
    rows
      .filter(o => {
        const d = new Date(o.createdAt);
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      })
      .reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);

  const countOrders = (rows: typeof allOrders, from?: Date, to?: Date) =>
    rows.filter(o => {
      const d = new Date(o.createdAt);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    }).length;

  // ── Revenue periods ──
  const revenue: PeriodRevenue = {
    today:     sumRevenue(paidOrders, todayStart),
    thisWeek:  sumRevenue(paidOrders, weekStart),
    thisMonth: sumRevenue(paidOrders, monthStart),
    lastMonth: sumRevenue(paidOrders, lastMonthStart, lastMonthEnd),
    allTime:   sumRevenue(paidOrders),
  };

  // ── Order count periods ──
  const orderCounts: PeriodOrders = {
    today:     countOrders(allOrders, todayStart),
    thisWeek:  countOrders(allOrders, weekStart),
    thisMonth: countOrders(allOrders, monthStart),
    lastMonth: countOrders(allOrders, lastMonthStart, lastMonthEnd),
  };

  // ── Daily revenue — last 7 days ──
  const dailyRevenue: DailyRevenuePoint[] = [];
  const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart); dayStart.setDate(todayStart.getDate() - i);
    const dayEnd   = new Date(dayStart);   dayEnd.setHours(23, 59, 59, 999);
    dailyRevenue.push({
      date:    i === 0 ? "Today" : DAY_LABELS[dayStart.getDay()],
      revenue: sumRevenue(paidOrders, dayStart, dayEnd),
      orders:  countOrders(allOrders, dayStart, dayEnd),
    });
  }

  // ── Monthly revenue — last 6 months ──
  const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyRevenue: MonthlyRevenuePoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    monthlyRevenue.push({
      month:   MONTH_LABELS[mStart.getMonth()],
      revenue: sumRevenue(paidOrders, mStart, mEnd),
      orders:  countOrders(allOrders, mStart, mEnd),
    });
  }

  // ── Status breakdown ──
  const statusBreakdown: OrderStatusBreakdown = {
    pending:    allOrders.filter(o => o.status === "pending").length,
    processing: allOrders.filter(o => o.status === "processing").length,
    done:       allOrders.filter(o => o.status === "done").length,
    picked_up:  allOrders.filter(o => o.status === "picked_up").length,
  };

  // ── Payment breakdown ──
  const paymentBreakdown: PaymentBreakdown = {
    paid:        paidOrders.length,
    unpaid:      unpaidOrders.length,
    paidRevenue: sumRevenue(paidOrders),
    unpaidValue: unpaidOrders.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
  };

  // ── Top 3 customers by spend ──
  const customerSpend: Record<number, { spent: number; orders: number }> = {};
  for (const o of paidOrders) {
    if (!customerSpend[o.customerId]) customerSpend[o.customerId] = { spent: 0, orders: 0 };
    customerSpend[o.customerId].spent  += parseFloat(o.totalPrice ?? "0");
    customerSpend[o.customerId].orders += 1;
  }
  const topCustomers: TopCustomer[] = Object.entries(customerSpend)
    .sort((a, b) => b[1].spent - a[1].spent)
    .slice(0, 3)
    .map(([id, stats]) => {
      const c = allCustomers.find(c => c.id === Number(id));
      return { id: Number(id), name: c?.name ?? "Unknown", totalSpent: stats.spent, totalOrders: stats.orders };
    });

  // ── Top 3 services by order count ──
  const serviceCount: Record<number, { orders: number; revenue: number }> = {};
  for (const o of allOrders) {
    if (!o.servicePricingId) continue;
    if (!serviceCount[o.servicePricingId]) serviceCount[o.servicePricingId] = { orders: 0, revenue: 0 };
    serviceCount[o.servicePricingId].orders += 1;
    if (o.paymentStatus === "paid") serviceCount[o.servicePricingId].revenue += parseFloat(o.totalPrice ?? "0");
  }
  const topServices: TopService[] = Object.entries(serviceCount)
    .sort((a, b) => b[1].orders - a[1].orders)
    .slice(0, 3)
    .map(([id, stats]) => {
      const s = allServices.find(s => s.id === Number(id));
      return { id: Number(id), name: s?.name ?? "Unknown", category: s?.category ?? "—", totalOrders: stats.orders, totalRevenue: stats.revenue };
    });

  // ── New customers this month ──
  const newCustomersThisMonth = allCustomers.filter(c => new Date(c.createdAt) >= monthStart).length;

  // ── Average order value ──
  const avgOrderValue = paidOrders.length > 0
    ? sumRevenue(paidOrders) / paidOrders.length
    : 0;

  // ── Recent orders (last 8) ──
  const recentRaw = allOrders.slice(0, 8);
  const customerMap = Object.fromEntries(allCustomers.map(c => [c.id, c.name]));
  const recentOrders = recentRaw.map(o => ({
    id:           o.id,
    orderNumber:  o.orderNumber,
    customerName: customerMap[o.customerId] ?? "Unknown",
    totalPrice:   o.totalPrice,
    status:       o.status,
    paymentStatus: o.paymentStatus,
    createdAt:    o.createdAt,
  }));

  return {
    revenue, orderCounts, dailyRevenue, monthlyRevenue,
    statusBreakdown, paymentBreakdown,
    topCustomers, topServices,
    cashBalance:  parseFloat(cashRow?.balance ?? "0"),
    newCustomersThisMonth,
    avgOrderValue,
    recentOrders,
  };
}

// ─── Social Media Tracking ────────────────────────────────────────────────────
// Since TikTok/Instagram don't offer free API access for analytics,
// this is a manual tracking table you update from the admin.
// Schema note: add this table to your Drizzle schema (see comment below).

export interface SocialMetrics {
  platform:      "tiktok" | "instagram";
  followers:     number;
  totalLikes:    number;
  totalViews:    number;
  totalPosts:    number;
  engagementRate: number; // (likes+comments) / views * 100
  updatedAt:     Date;
}

export interface SocialEntry {
  id:        number;
  platform:  "tiktok" | "instagram";
  followers: number;
  likes:     number;
  views:     number;
  comments:  number;
  posts:     number;
  recordedAt: Date;
  notes:     string | null;
}

/**
 * MANUAL SOCIAL TRACKING — Update these weekly from your TikTok/Instagram Insights.
 *
 * To make this dynamic, add a `social_metrics` table to your schema:
 *
 *   export const socialMetrics = pgTable("social_metrics", {
 *     id:         serial("id").primaryKey(),
 *     platform:   text("platform").notNull(),   // "tiktok" | "instagram"
 *     followers:  integer("followers").notNull().default(0),
 *     likes:      integer("likes").notNull().default(0),
 *     views:      integer("views").notNull().default(0),
 *     comments:   integer("comments").notNull().default(0),
 *     posts:      integer("posts").notNull().default(0),
 *     notes:      text("notes"),
 *     recordedAt: timestamp("recorded_at").defaultNow().notNull(),
 *   });
 *
 * Then replace the mock data below with:
 *   const rows = await db.select().from(socialMetrics).orderBy(desc(socialMetrics.recordedAt)).limit(12);
 *
 * For now, returns static placeholder data you can replace with real numbers.
 */
export async function getSocialMetrics(): Promise<{
  tiktok:    SocialMetrics;
  instagram: SocialMetrics;
  history:   SocialEntry[];
}> {
  // ── Replace with your real numbers ──
  const tiktok: SocialMetrics = {
    platform:       "tiktok",
    followers:      0,
    totalLikes:     0,
    totalViews:     0,
    totalPosts:     0,
    engagementRate: 0,
    updatedAt:      new Date(),
  };

  const instagram: SocialMetrics = {
    platform:       "instagram",
    followers:      0,
    totalLikes:     0,
    totalViews:     0,
    totalPosts:     0,
    engagementRate: 0,
    updatedAt:      new Date(),
  };

  // History placeholder (last 6 weeks, replace with DB query)
  const history: SocialEntry[] = [];

  return { tiktok, instagram, history };
}