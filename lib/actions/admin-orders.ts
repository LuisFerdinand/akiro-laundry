// lib/actions/admin-orders.ts
"use server";

import { db } from "@/lib/db";
import {
  orders,
  customers,
  orderItems,
  servicePricing,
  soaps,
  pewangi,
} from "@/lib/db/schema";
import type { Order, OrderItem } from "@/lib/db/schema";
import { eq, ilike, and, desc, or, count, gte, lte, inArray } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

/** One service line inside an order — all fields needed for display */
export interface AdminOrderItem extends OrderItem {
  serviceName: string;
  soapName:    string | null;
  pewangiName: string | null;
}

/** Full order record returned by all admin queries */
export interface AdminOrderWithDetails extends Order {
  customerName:  string;
  customerPhone: string;
  items: AdminOrderItem[];
}

/** Shape returned by paginated list query */
export interface PaginatedOrders {
  rows:       AdminOrderWithDetails[];
  total:      number;
  page:       number;
  totalPages: number;
}

/** Filter + pagination parameters */
export interface OrderFilters {
  search?:   string;
  status?:   string;
  payment?:  string;
  dateFrom?: string;   // ISO date string "YYYY-MM-DD"
  dateTo?:   string;   // ISO date string "YYYY-MM-DD"
  page?:     number;
  limit?:    number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch all order_items (with joined service/soap/pewangi names) for a set of
 * order IDs and return them grouped by orderId.
 */
async function fetchItemsByOrderIds(
  orderIds: number[],
): Promise<Map<number, AdminOrderItem[]>> {
  if (orderIds.length === 0) return new Map();

  const rows = await db
    .select({
      item:        orderItems,
      serviceName: servicePricing.name,
      soapName:    soaps.name,
      pewangiName: pewangi.name,
    })
    .from(orderItems)
    .leftJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
    .leftJoin(soaps,          eq(orderItems.soapId,    soaps.id))
    .leftJoin(pewangi,        eq(orderItems.pewangiId, pewangi.id))
    .where(inArray(orderItems.orderId, orderIds));

  const map = new Map<number, AdminOrderItem[]>();
  for (const r of rows) {
    const list = map.get(r.item.orderId) ?? [];
    list.push({
      ...r.item,
      serviceName: r.serviceName ?? "—",
      soapName:    r.soapName    ?? null,
      pewangiName: r.pewangiName ?? null,
    });
    map.set(r.item.orderId, list);
  }
  return map;
}

// ─── Paginated orders list ────────────────────────────────────────────────────

export async function getAdminOrders(
  filters: OrderFilters = {},
): Promise<PaginatedOrders> {
  const { search, status, payment, dateFrom, dateTo, page = 1, limit = 25 } = filters;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];

  if (search?.trim()) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${search.trim()}%`),
        ilike(customers.name,    `%${search.trim()}%`),
        ilike(customers.phone,   `%${search.trim()}%`),
      ),
    );
  }
  if (status && status !== "all") {
    conditions.push(eq(orders.status, status as Order["status"]));
  }
  if (payment && payment !== "all") {
    conditions.push(eq(orders.paymentStatus, payment as Order["paymentStatus"]));
  }
  if (dateFrom) {
    conditions.push(gte(orders.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(orders.createdAt, new Date(dateTo + "T23:59:59")));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total matching rows
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(where);

  // Fetch page of orders
  const orderRows = await db
    .select({
      order:         orders,
      customerName:  customers.name,
      customerPhone: customers.phone,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const orderIds  = orderRows.map((r) => r.order.id);
  const itemsMap  = await fetchItemsByOrderIds(orderIds);

  const rows: AdminOrderWithDetails[] = orderRows.map((r) => ({
    ...r.order,
    customerName:  r.customerName  ?? "Unknown",
    customerPhone: r.customerPhone ?? "—",
    items:         itemsMap.get(r.order.id) ?? [],
  }));

  return {
    rows,
    total:      Number(total),
    page,
    totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
  };
}

// ─── Single order detail ──────────────────────────────────────────────────────

export async function getAdminOrderById(
  id: number,
): Promise<AdminOrderWithDetails | null> {
  const rows = await db
    .select({
      order:         orders,
      customerName:  customers.name,
      customerPhone: customers.phone,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!rows[0]) return null;

  const itemsMap = await fetchItemsByOrderIds([id]);

  return {
    ...rows[0].order,
    customerName:  rows[0].customerName  ?? "Unknown",
    customerPhone: rows[0].customerPhone ?? "—",
    items:         itemsMap.get(id) ?? [],
  };
}
// ─── Revenue stats for cash register page ────────────────────────────────────

export interface RevenueStats {
  todayRevenue:    number;
  weekRevenue:     number;
  monthRevenue:    number;
  totalPaidOrders: number;
  totalUnpaid:     number;
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week  = new Date(today); week.setDate(today.getDate() - 7);
  const month = new Date(today); month.setDate(1);

  // Only pull the columns we need — no join required
  const all = await db
    .select({
      totalPrice:    orders.totalPrice,
      paymentStatus: orders.paymentStatus,
      paidAt:        orders.paidAt,
      createdAt:     orders.createdAt,
    })
    .from(orders);

  const paid   = all.filter((o) => o.paymentStatus === "paid");
  const unpaid = all.filter((o) => o.paymentStatus === "unpaid");

  // Revenue counted on paidAt date, falls back to createdAt for legacy rows
  const sum = (rows: typeof paid, from: Date) =>
    rows
      .filter((o) => new Date(o.paidAt ?? o.createdAt) >= from)
      .reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);

  return {
    todayRevenue:    sum(paid, today),
    weekRevenue:     sum(paid, week),
    monthRevenue:    sum(paid, month),
    totalPaidOrders: paid.length,
    totalUnpaid:     unpaid.length,
  };
}