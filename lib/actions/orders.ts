// lib/actions/orders.ts
"use server";

import { db } from "@/lib/db";
import {
  customers,
  orders,
  soaps,
  pewangi,
  servicePricing,
} from "@/lib/db/schema";
import type { Customer, Soap, Pewangi, ServicePricing, Order } from "@/lib/db/schema";
import { eq, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  generateOrderNumber,
  calculateOrderPrice,
  OrderFormData,
} from "@/lib/utils/order-form";
import { buildE164, parseE164, stripTrunkPrefix, DEFAULT_COUNTRY } from "@/lib/utils/phone";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise any phone string to E.164 for storage.
 * - If it already starts with "+", trust it as-is (already E.164).
 * - Otherwise assume Timor-Leste (+670) as the default country.
 */
function normalizeForStorage(raw: string): string {
  if (!raw?.trim()) return raw;
  if (raw.startsWith("+")) {
    // Validate it parses to a known country; if not, store as-is
    return parseE164(raw) ? raw : raw;
  }
  // Assume TL for legacy unformatted numbers
  return buildE164(DEFAULT_COUNTRY, raw) ?? raw;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function lookupCustomerByPhone(phone: string): Promise<Customer | null> {
  // phone is already E.164 from the form
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);
  return result[0] ?? null;
}

export async function searchCustomersByName(query: string): Promise<Customer[]> {
  if (!query.trim()) return [];
  return db.select().from(customers).where(ilike(customers.name, `%${query}%`)).limit(10);
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

export interface OrderWithCustomer extends Order {
  customerName: string;
  customerPhone: string;
  serviceName: string;
}

export async function getOrders(limit = 50): Promise<OrderWithCustomer[]> {
  const rows = await db
    .select({
      order:         orders,
      customerName:  customers.name,
      customerPhone: customers.phone,
      serviceName:   servicePricing.name,
    })
    .from(orders)
    .leftJoin(customers,      eq(orders.customerId,       customers.id))
    .leftJoin(servicePricing, eq(orders.servicePricingId, servicePricing.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.order,
    customerName:  r.customerName  ?? "Unknown",
    customerPhone: r.customerPhone ?? "—",
    serviceName:   r.serviceName   ?? "—",
  }));
}

export async function getOrderById(id: number): Promise<OrderWithCustomer | null> {
  const rows = await db
    .select({
      order:         orders,
      customerName:  customers.name,
      customerPhone: customers.phone,
      serviceName:   servicePricing.name,
    })
    .from(orders)
    .leftJoin(customers,      eq(orders.customerId,       customers.id))
    .leftJoin(servicePricing, eq(orders.servicePricingId, servicePricing.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!rows[0]) return null;
  return {
    ...rows[0].order,
    customerName:  rows[0].customerName  ?? "Unknown",
    customerPhone: rows[0].customerPhone ?? "—",
    serviceName:   rows[0].serviceName   ?? "—",
  };
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateOrderStatus(
  id: number,
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
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  error?: string;
}

export async function createOrder(formData: OrderFormData): Promise<CreateOrderResult> {
  try {
    const { customer, servicePricingId, weightKg, soapId, pewangiId, notes } = formData;

    if (!servicePricingId || !weightKg) {
      return { success: false, error: "Service or weight is missing." };
    }

    // Resolve or create customer
    let customerId: number;
    if (customer.existingCustomerId) {
      customerId = customer.existingCustomerId;
    } else {
      // phone from the form is already E.164 (built by buildE164 in the UI)
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

    const [serviceRow] = await db
      .select()
      .from(servicePricing)
      .where(eq(servicePricing.id, servicePricingId))
      .limit(1);
    if (!serviceRow) return { success: false, error: "Service not found." };

    const soapRow    = soapId
      ? (await db.select().from(soaps).where(eq(soaps.id, soapId)).limit(1))[0] ?? null
      : null;
    const pewangiRow = pewangiId
      ? (await db.select().from(pewangi).where(eq(pewangi.id, pewangiId)).limit(1))[0] ?? null
      : null;

    const breakdown   = calculateOrderPrice(serviceRow, weightKg, soapRow, pewangiRow);
    const orderNumber = generateOrderNumber();

    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        weightKg:        weightKg.toString(),
        soapId:          soapId    ?? null,
        pewangiId:       pewangiId ?? null,
        servicePricingId,
        basePricePerKg:  serviceRow.basePricePerKg,
        soapCost:        breakdown.soapCost.toString(),
        pewangiCost:     breakdown.pewangiCost.toString(),
        totalPrice:      breakdown.totalPrice.toString(),
        notes:           notes.trim() || null,
        status:          "pending",
      })
      .returning({ id: orders.id, orderNumber: orders.orderNumber });

    revalidatePath("/employee/orders");
    return { success: true, orderId: newOrder.id, orderNumber: newOrder.orderNumber };
  } catch (err) {
    console.error("[createOrder]", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Search customers by the subscriber digits portion of their phone number.
 *
 * The DB stores numbers in E.164 (+{code}{local}). We search by the local
 * part (passed in as `query`) using ILIKE so partial matches work.
 */
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
    todayOrders:  todayOrders.length,
    activeOrders: activeOrders.length,
    doneOrders:   doneOrders.length,
    todayRevenue,
    pendingRevenue,
  };
}