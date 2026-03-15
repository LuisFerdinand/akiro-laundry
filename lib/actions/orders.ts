// lib/actions/orders.ts
"use server";

import { db } from "@/lib/db";
import {
  customers,
  orders,
  orderItems,
  soaps,
  pewangi,
  servicePricing,
} from "@/lib/db/schema";
import type {
  Customer,
  Soap,
  Pewangi,
  ServicePricing,
  Order,
  OrderItem,
} from "@/lib/db/schema";
import { eq, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  generateOrderNumber,
  calculateItemPrice,
  OrderFormData,
} from "@/lib/utils/order-form";
import {
  buildE164,
  parseE164,
  stripTrunkPrefix,
  DEFAULT_COUNTRY,
} from "@/lib/utils/phone";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeForStorage(raw: string): string {
  if (!raw?.trim()) return raw;
  if (raw.startsWith("+")) {
    return parseE164(raw) ? raw : raw;
  }
  return buildE164(DEFAULT_COUNTRY, raw) ?? raw;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function lookupCustomerByPhone(phone: string): Promise<Customer | null> {
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);
  return result[0] ?? null;
}

export async function searchCustomersByName(query: string): Promise<Customer[]> {
  if (!query.trim()) return [];
  return db
    .select()
    .from(customers)
    .where(ilike(customers.name, `%${query}%`))
    .limit(10);
}

export async function getActiveSoaps(): Promise<Soap[]> {
  return db.select().from(soaps).where(eq(soaps.isActive, true));
}

export async function getActivePewangi(): Promise<Pewangi[]> {
  return db.select().from(pewangi).where(eq(pewangi.isActive, true));
}

export async function getActiveServicePricing(): Promise<ServicePricing[]> {
  return db.select().from(servicePricing).where(eq(servicePricing.isActive, true));
}

// ─── Orders List ──────────────────────────────────────────────────────────────

// Extended item type — includes joined fields needed for receipt printing
export type OrderItemWithDetails = OrderItem & {
  serviceName:  string;
  pricingUnit:  string;
  soapName:     string | null;
  pewangiName:  string | null;
};

export interface OrderWithDetails extends Order {
  customerName:    string;
  customerPhone:   string;
  customerAddress: string | null;
  items:           OrderItemWithDetails[];
}

// ── Shared item select shape ───────────────────────────────────────────────────
const itemSelect = {
  item:        orderItems,
  serviceName: servicePricing.name,
  pricingUnit: servicePricing.pricingUnit,
  soapName:    soaps.name,
  pewangiName: pewangi.name,
} as const;

function buildItemJoins<T extends typeof db.select>(q: ReturnType<T>) {
  // Helper type — not called directly; joins are inlined below for type safety
}

export async function getOrders(limit = 50): Promise<OrderWithDetails[]> {
  const orderRows = await db
    .select({
      order:           orders,
      customerName:    customers.name,
      customerPhone:   customers.phone,
      customerAddress: customers.address,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((r) => r.order.id);

  const { inArray } = await import("drizzle-orm");
  const allItems = await db
    .select({
      item:        orderItems,
      serviceName: servicePricing.name,
      pricingUnit: servicePricing.pricingUnit,
      soapName:    soaps.name,
      pewangiName: pewangi.name,
    })
    .from(orderItems)
    .leftJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
    .leftJoin(soaps,    eq(orderItems.soapId,    soaps.id))
    .leftJoin(pewangi,  eq(orderItems.pewangiId, pewangi.id))
    .where(inArray(orderItems.orderId, orderIds));

  const itemsByOrder = new Map<number, OrderItemWithDetails[]>();
  for (const row of allItems) {
    const list = itemsByOrder.get(row.item.orderId) ?? [];
    list.push({
      ...row.item,
      serviceName: row.serviceName ?? "—",
      pricingUnit: row.pricingUnit ?? "per_kg",
      soapName:    row.soapName    ?? null,
      pewangiName: row.pewangiName ?? null,
    });
    itemsByOrder.set(row.item.orderId, list);
  }

  return orderRows.map((r) => ({
    ...r.order,
    customerName:    r.customerName    ?? "Unknown",
    customerPhone:   r.customerPhone   ?? "—",
    customerAddress: r.customerAddress ?? null,
    items:           itemsByOrder.get(r.order.id) ?? [],
  }));
}

export async function getOrderById(id: number): Promise<OrderWithDetails | null> {
  const rows = await db
    .select({
      order:           orders,
      customerName:    customers.name,
      customerPhone:   customers.phone,
      customerAddress: customers.address,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!rows[0]) return null;

  const items = await db
    .select({
      item:        orderItems,
      serviceName: servicePricing.name,
      pricingUnit: servicePricing.pricingUnit,
      soapName:    soaps.name,
      pewangiName: pewangi.name,
    })
    .from(orderItems)
    .leftJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
    .leftJoin(soaps,   eq(orderItems.soapId,    soaps.id))
    .leftJoin(pewangi, eq(orderItems.pewangiId, pewangi.id))
    .where(eq(orderItems.orderId, id));

  return {
    ...rows[0].order,
    customerName:    rows[0].customerName    ?? "Unknown",
    customerPhone:   rows[0].customerPhone   ?? "—",
    customerAddress: rows[0].customerAddress ?? null,
    items: items.map((r) => ({
      ...r.item,
      serviceName: r.serviceName ?? "—",
      pricingUnit: r.pricingUnit ?? "per_kg",
      soapName:    r.soapName    ?? null,
      pewangiName: r.pewangiName ?? null,
    })),
  };
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateOrderStatus(
  id:     number,
  status: Order["status"],
): Promise<{ success: boolean; error?: string }> {
  try {
    if (status === "picked_up") {
      const [order] = await db
        .select({ paymentStatus: orders.paymentStatus })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (!order) return { success: false, error: "Order not found." };
      if (order.paymentStatus !== "paid") {
        return {
          success: false,
          error: "Order must be paid before it can be marked as picked up.",
        };
      }
    }

    await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id));

    revalidatePath("/employee/orders");
    return { success: true };
  } catch (err) {
    console.error("[updateOrderStatus]", err);
    return { success: false, error: "Failed to update order status." };
  }
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export interface CreateOrderResult {
  success:      boolean;
  orderId?:     number;
  orderNumber?: string;
  error?:       string;
}

export async function createOrder(formData: OrderFormData): Promise<CreateOrderResult> {
  try {
    const { customer, items, notes } = formData;

    if (!items || items.length === 0) {
      return { success: false, error: "At least one service item is required." };
    }

    // ── 1. Resolve or create customer ─────────────────────────────────────────
    let customerId: number;
    if (customer.existingCustomerId) {
      customerId = customer.existingCustomerId;
    } else {
      const phoneE164 = normalizeForStorage(customer.phone);
      const existing  = await lookupCustomerByPhone(phoneE164);
      if (existing) {
        customerId = existing.id;
      } else {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            name:    customer.name.trim(),
            phone:   phoneE164,
            address: customer.address.trim(),
          })
          .returning({ id: customers.id });
        customerId = newCustomer.id;
      }
    }

    // ── 2. Resolve service, soap, and pewangi rows for each item ──────────────
    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        if (!item.servicePricingId) {
          throw new Error("Each item must have a servicePricingId.");
        }

        const [serviceRow] = await db
          .select()
          .from(servicePricing)
          .where(eq(servicePricing.id, item.servicePricingId))
          .limit(1);
        if (!serviceRow) throw new Error(`Service ${item.servicePricingId} not found.`);

        const soapRow = item.soapId
          ? (await db.select().from(soaps).where(eq(soaps.id, item.soapId)).limit(1))[0] ?? null
          : null;

        const pewangiRow = item.pewangiId
          ? (await db.select().from(pewangi).where(eq(pewangi.id, item.pewangiId)).limit(1))[0] ?? null
          : null;

        const breakdown = calculateItemPrice(
          serviceRow,
          item.weightKg,
          item.quantity,
          soapRow,
          pewangiRow,
        );

        return { item, serviceRow, soapRow, pewangiRow, breakdown };
      }),
    );

    // ── 3. Sum totals ─────────────────────────────────────────────────────────
    const totalPrice = resolvedItems.reduce((sum, r) => sum + r.breakdown.subtotal, 0);

    // ── 4. Insert order header ────────────────────────────────────────────────
    const orderNumber = generateOrderNumber();

    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        totalPrice:    totalPrice.toString(),
        notes:         notes.trim() || null,
        status:        "pending",
        paymentStatus: "unpaid",
      })
      .returning({ id: orders.id, orderNumber: orders.orderNumber });

    // ── 5. Insert order items ─────────────────────────────────────────────────
    await db.insert(orderItems).values(
      resolvedItems.map(({ item, serviceRow, breakdown }) => ({
        orderId:          newOrder.id,
        servicePricingId: serviceRow.id,
        weightKg:
          serviceRow.pricingUnit !== "per_pcs" && item.weightKg != null
            ? item.weightKg.toString()
            : null,
        quantity:
          serviceRow.pricingUnit === "per_pcs" && item.quantity != null
            ? item.quantity
            : null,
        soapId:         item.soapId    ?? null,
        pewangiId:      item.pewangiId ?? null,
        basePricePerKg: serviceRow.basePricePerKg,
        soapCost:       breakdown.soapCost.toString(),
        pewangiCost:    breakdown.pewangiCost.toString(),
        subtotal:       breakdown.subtotal.toString(),
      })),
    );

    revalidatePath("/employee/orders");
    return { success: true, orderId: newOrder.id, orderNumber: newOrder.orderNumber };
  } catch (err) {
    console.error("[createOrder]", err);
    const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return { success: false, error: message };
  }
}

// ─── Phone search ─────────────────────────────────────────────────────────────

export async function searchCustomersByPhone(query: string): Promise<Customer[]> {
  const local = stripTrunkPrefix(query);
  if (local.length < 3) return [];

  return db
    .select()
    .from(customers)
    .where(ilike(customers.phone, `%${local}%`))
    .orderBy(customers.phone)
    .limit(5);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  todayOrders:    number;
  activeOrders:   number;
  doneOrders:     number;
  todayRevenue:   number;
  pendingRevenue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const allOrders = await db.select().from(orders);

  const todayOrders  = allOrders.filter((o) => new Date(o.createdAt) >= todayStart);
  const activeOrders = allOrders.filter((o) => o.status === "pending" || o.status === "processing");
  const doneOrders   = allOrders.filter((o) => o.status === "done");

  const todayRevenue = allOrders
    .filter((o) => o.paymentStatus === "paid" && o.paidAt && new Date(o.paidAt) >= todayStart)
    .reduce((sum, o) => sum + parseFloat(o.totalPrice ?? "0"), 0);

  const pendingRevenue = allOrders
    .filter((o) => o.paymentStatus === "unpaid")
    .reduce((sum, o) => sum + parseFloat(o.totalPrice ?? "0"), 0);

  return {
    todayOrders:    todayOrders.length,
    activeOrders:   activeOrders.length,
    doneOrders:     doneOrders.length,
    todayRevenue,
    pendingRevenue,
  };
}