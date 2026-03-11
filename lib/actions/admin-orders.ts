// lib/actions/admin-orders.ts
"use server";

import { db } from "@/lib/db";
import { orders, customers, servicePricing, soaps, pewangi } from "@/lib/db/schema";
import type { Order } from "@/lib/db/schema";
import { eq, ilike, desc, and, or, gte, lte, count, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminOrderRow extends Order {
  customerName:  string;
  customerPhone: string;
  serviceName:   string;
  soapName:      string | null;
  pewangiName:   string | null;
}

export interface OrderFilters {
  search?:    string;   // order number or customer name
  status?:    string;
  payment?:   string;
  dateFrom?:  string;   // ISO date string
  dateTo?:    string;
  page?:      number;
  limit?:     number;
}

export interface PaginatedOrders {
  rows:       AdminOrderRow[];
  total:      number;
  page:       number;
  totalPages: number;
}

// ─── List with filters + pagination ──────────────────────────────────────────

export async function getAdminOrders(filters: OrderFilters = {}): Promise<PaginatedOrders> {
  const {
    search, status, payment,
    dateFrom, dateTo,
    page  = 1,
    limit = 20,
  } = filters;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (status  && status  !== "all") conditions.push(eq(orders.status,        status  as Order["status"]));
  if (payment && payment !== "all") conditions.push(eq(orders.paymentStatus, payment as Order["paymentStatus"]));
  if (dateFrom) conditions.push(gte(orders.createdAt, new Date(dateFrom)));
  if (dateTo)   conditions.push(lte(orders.createdAt, new Date(dateTo + "T23:59:59")));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Search is done as a subquery filter on joined customer name / order number
  const rows = await db
    .select({
      order:         orders,
      customerName:  customers.name,
      customerPhone: customers.phone,
      serviceName:   servicePricing.name,
      soapName:      soaps.name,
      pewangiName:   pewangi.name,
    })
    .from(orders)
    .leftJoin(customers,      eq(orders.customerId,       customers.id))
    .leftJoin(servicePricing, eq(orders.servicePricingId, servicePricing.id))
    .leftJoin(soaps,          eq(orders.soapId,           soaps.id))
    .leftJoin(pewangi,        eq(orders.pewangiId,        pewangi.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit + 50)   // fetch a bit more so client-side search still paginates
    .offset(offset);

  // Client-side search filter on joined fields (avoids complex SQL ILIKE across joins)
  const filtered = search
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.order.orderNumber.toLowerCase().includes(q) ||
          (r.customerName  ?? "").toLowerCase().includes(q) ||
          (r.customerPhone ?? "").includes(q)
        );
      })
    : rows;

  const mapped: AdminOrderRow[] = filtered.slice(0, limit).map((r) => ({
    ...r.order,
    customerName:  r.customerName  ?? "Unknown",
    customerPhone: r.customerPhone ?? "—",
    serviceName:   r.serviceName   ?? "—",
    soapName:      r.soapName      ?? null,
    pewangiName:   r.pewangiName   ?? null,
  }));

  return {
    rows:       mapped,
    total:      filtered.length,
    page,
    totalPages: Math.ceil(filtered.length / limit),
  };
}

// ─── Single order detail ──────────────────────────────────────────────────────

export async function getAdminOrderById(id: number): Promise<AdminOrderRow | null> {
  const rows = await db
    .select({
      order:         orders,
      customerName:  customers.name,
      customerPhone: customers.phone,
      serviceName:   servicePricing.name,
      soapName:      soaps.name,
      pewangiName:   pewangi.name,
    })
    .from(orders)
    .leftJoin(customers,      eq(orders.customerId,       customers.id))
    .leftJoin(servicePricing, eq(orders.servicePricingId, servicePricing.id))
    .leftJoin(soaps,          eq(orders.soapId,           soaps.id))
    .leftJoin(pewangi,        eq(orders.pewangiId,        pewangi.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!rows[0]) return null;
  return {
    ...rows[0].order,
    customerName:  rows[0].customerName  ?? "Unknown",
    customerPhone: rows[0].customerPhone ?? "—",
    serviceName:   rows[0].serviceName   ?? "—",
    soapName:      rows[0].soapName      ?? null,
    pewangiName:   rows[0].pewangiName   ?? null,
  };
}

// ─── Revenue stats for cash register page ────────────────────────────────────

export interface RevenueStats {
  todayRevenue:   number;
  weekRevenue:    number;
  monthRevenue:   number;
  totalPaidOrders: number;
  totalUnpaid:    number;
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week  = new Date(today); week.setDate(today.getDate() - 7);
  const month = new Date(today); month.setDate(1);

  const all = await db
    .select({
      totalPrice:    orders.totalPrice,
      paymentStatus: orders.paymentStatus,
      createdAt:     orders.createdAt,
    })
    .from(orders);

  const paid   = all.filter((o) => o.paymentStatus === "paid");
  const unpaid = all.filter((o) => o.paymentStatus === "unpaid");

  const sum = (rows: typeof paid, from: Date) =>
    rows
      .filter((o) => new Date(o.createdAt) >= from)
      .reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);

  return {
    todayRevenue:    sum(paid, today),
    weekRevenue:     sum(paid, week),
    monthRevenue:    sum(paid, month),
    totalPaidOrders: paid.length,
    totalUnpaid:     unpaid.length,
  };
}