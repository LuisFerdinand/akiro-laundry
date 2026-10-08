// lib/actions/orders.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  customers,
  orders,
  orderItems,
  soaps,
  pewangi,
  servicePricing,
  orderSpecialRequests,
  orderClothingCounts,
} from "@/lib/db/schema";
import type {
  Customer,
  Soap,
  Pewangi,
  ServicePricing,
  Order,
  OrderItem,
  OrderSpecialRequest,
  OrderClothingCount,
} from "@/lib/db/schema";
import { eq, ilike, desc, asc, and, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { startOfDayBiz } from "@/lib/utils/business-time";
import { sumRevenue } from "@/lib/utils/revenue";
import { paymentAfterTotalChange, paymentBalance } from "@/lib/utils/order-payment";
import { isClothesCountMode } from "@/lib/utils/clothes-count";
import { cleanCountLines, writeOrderClothesCounts } from "@/lib/db/clothes-counts";
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
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  return db
    .select()
    .from(customers)
    .where(ilike(customers.name, `%${trimmed}%`))
    .orderBy(customers.name)
    .limit(5);
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
  specialRequests: OrderSpecialRequest[];
  /** Clothes count lines — loaded by getOrders and getOrderById. */
  clothesCounts?:  OrderClothingCount[];
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

export interface EmployeeOrderFilters {
  search?: string;
  status?: string;
  limit?:  number;
}

export async function getOrders(filters: EmployeeOrderFilters = {}): Promise<OrderWithDetails[]> {
  const { search, status, limit = 100 } = filters;

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
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderRows = await db
    .select({
      order:           orders,
      customerName:    customers.name,
      customerPhone:   customers.phone,
      customerAddress: customers.address,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
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

  const allSpecialRequests = await db
    .select()
    .from(orderSpecialRequests)
    .where(inArray(orderSpecialRequests.orderId, orderIds));
  const requestsByOrder = new Map<number, OrderSpecialRequest[]>();
  for (const r of allSpecialRequests) {
    const list = requestsByOrder.get(r.orderId) ?? [];
    list.push(r);
    requestsByOrder.set(r.orderId, list);
  }

  // For the WA notify button's {{clothesCount}} / {{clothesTotal}}.
  const allClothesCounts = await db
    .select()
    .from(orderClothingCounts)
    .where(inArray(orderClothingCounts.orderId, orderIds))
    .orderBy(asc(orderClothingCounts.id));
  const countsByOrder = new Map<number, OrderClothingCount[]>();
  for (const c of allClothesCounts) {
    const list = countsByOrder.get(c.orderId) ?? [];
    list.push(c);
    countsByOrder.set(c.orderId, list);
  }

  return orderRows.map((r) => ({
    ...r.order,
    customerName:    r.customerName    ?? "Unknown",
    customerPhone:   r.customerPhone   ?? "—",
    customerAddress: r.customerAddress ?? null,
    items:           itemsByOrder.get(r.order.id) ?? [],
    specialRequests: requestsByOrder.get(r.order.id) ?? [],
    clothesCounts:   countsByOrder.get(r.order.id) ?? [],
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

  const specialRequests = await db
    .select()
    .from(orderSpecialRequests)
    .where(eq(orderSpecialRequests.orderId, id))
    .orderBy(desc(orderSpecialRequests.createdAt));

  const clothesCounts = await db
    .select()
    .from(orderClothingCounts)
    .where(eq(orderClothingCounts.orderId, id))
    .orderBy(asc(orderClothingCounts.id));

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
    specialRequests,
    clothesCounts,
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
    const { customer, items, notes, specialRequests, clothesCount } = formData;

    if (!items || items.length === 0) {
      return { success: false, error: "At least one service item is required." };
    }

    // Clothes count — counted with the customer (printed on the receipt) or left
    // for staff to count later. Only a with-customer count is saved at creation.
    const countMode   = isClothesCountMode(clothesCount?.mode) ? clothesCount!.mode : null;
    const countLines  = countMode === "customer" ? cleanCountLines(clothesCount?.lines) : [];
    if (!countMode) {
      return { success: false, error: "Choose how the clothes are counted." };
    }
    if (countMode === "customer" && countLines.length === 0) {
      return { success: false, error: "Count at least one piece with the customer." };
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
            name:           customer.name.trim(),
            phone:          phoneE164,
            address:        customer.address.trim(),
            referralSource: customer.referralSource?.trim() || null,
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

    // ── 3. Sum totals — items + any special-request price adjustments ─────────
    const validRequests = (specialRequests ?? []).filter(
      (r) => r.description.trim() && r.priceAdjustment !== 0,
    );
    const totalPrice =
      resolvedItems.reduce((sum, r) => sum + r.breakdown.subtotal, 0) +
      validRequests.reduce((sum, r) => sum + r.priceAdjustment, 0);

    // ── 4. Insert order header ────────────────────────────────────────────────
    const orderNumber = generateOrderNumber();
    // Creator comes from the server session, not the form payload, so it
    // can't be spoofed by the client.
    const session = await auth();

    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        totalPrice:    totalPrice.toString(),
        notes:         notes.trim() || null,
        status:        "pending",
        paymentStatus: "unpaid",
        createdByName: session?.user?.name?.trim() || null,
        clothesCountMode: countMode,
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

    // ── 6. Insert special requests, if any ─────────────────────────────────────
    if (validRequests.length > 0) {
      await db.insert(orderSpecialRequests).values(
        validRequests.map((r) => ({
          orderId:         newOrder.id,
          description:     r.description.trim(),
          priceAdjustment: r.priceAdjustment.toFixed(2),
        })),
      );
    }

    // ── 7. Clothes counted with the customer ──────────────────────────────────
    if (countLines.length > 0) {
      await writeOrderClothesCounts(newOrder.id, countLines);
    }

    revalidatePath("/employee/orders");
    return { success: true, orderId: newOrder.id, orderNumber: newOrder.orderNumber };
  } catch (err) {
    console.error("[createOrder]", err);
    const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return { success: false, error: message };
  }
}

// ─── Update Order ─────────────────────────────────────────────────────────────
// Corrects customer/service/notes data on an existing order (typo fixes, wrong
// weight, wrong service picked, etc). Each successful edit bumps `editCount` so
// staff can see an order was changed after creation.
//
// Paid and DP orders can be edited too. That never touches the cash register —
// the money already received stays as recorded — but the payment status follows
// the new total (lib/utils/order-payment.ts): a higher total reopens a balance
// due, a lower one leaves the order paid with an overpayment to refund by hand.
// Such edits also stamp `editedAfterPaymentAt` for the "Edited after payment" flag.

export interface UpdateOrderResult {
  success: boolean;
  error?:  string;
  /** Payment outcome of the edit — only for orders that already had a payment. */
  payment?: { status: "partial" | "paid"; balanceDue: number; overpaid: number };
}

export async function updateOrder(
  orderId:  number,
  formData: OrderFormData,
): Promise<UpdateOrderResult> {
  try {
    const { customer, items, notes } = formData;

    if (!items || items.length === 0) {
      return { success: false, error: "At least one service item is required." };
    }

    const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing) return { success: false, error: "Order not found." };

    // ── 1. Resolve customer — reassign to a picked existing customer, or
    //        update the current one in place so typos get fixed rather than
    //        spawning a duplicate customer record ──────────────────────────
    let customerId = existing.customerId;
    if (customer.existingCustomerId) {
      customerId = customer.existingCustomerId;
    } else {
      await db
        .update(customers)
        .set({
          name:      customer.name.trim(),
          phone:     normalizeForStorage(customer.phone),
          address:   customer.address.trim(),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, existing.customerId));
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

        return { item, serviceRow, breakdown };
      }),
    );

    // ── 3. Sum totals — items + the special requests already on the order
    //        (managed separately on the order page, so they're kept as-is) ───
    const [requestsSum] = await db
      .select({ total: sql<string>`coalesce(sum(${orderSpecialRequests.priceAdjustment}), 0)` })
      .from(orderSpecialRequests)
      .where(eq(orderSpecialRequests.orderId, orderId));
    const totalPrice = Math.round((
      resolvedItems.reduce((sum, r) => sum + r.breakdown.subtotal, 0) +
      parseFloat(requestsSum?.total ?? "0")
    ) * 100) / 100;

    // ── 4. Replace order items wholesale — simplest way to keep them in sync
    //        with whatever the staffer edited in the form ─────────────────────
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.insert(orderItems).values(
      resolvedItems.map(({ item, serviceRow, breakdown }) => ({
        orderId,
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

    // ── 5. Update order header + bump the edit counter. A payment on file
    //        stays as received — only its status follows the new total. ──────
    const now     = new Date();
    const hasPaid = existing.paymentStatus !== "unpaid";
    const payment = paymentAfterTotalChange(existing, totalPrice, now);
    await db
      .update(orders)
      .set({
        customerId,
        totalPrice: totalPrice.toFixed(2),
        notes:      notes.trim() || null,
        editCount:  existing.editCount + 1,
        updatedAt:  now,
        ...(hasPaid && payment),
      })
      .where(eq(orders.id, orderId));

    revalidatePath("/employee/orders");
    revalidatePath(`/employee/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");

    if (!hasPaid) return { success: true };
    const balance = paymentBalance({ ...existing, ...payment, totalPrice: totalPrice.toFixed(2) });
    return {
      success: true,
      payment: {
        status:     payment.paymentStatus as "partial" | "paid",
        balanceDue: balance.balanceDue,
        overpaid:   balance.overpaid,
      },
    };
  } catch (err) {
    console.error("[updateOrder]", err);
    const code = (err as { code?: string } | null)?.code;
    if (code === "23505") {
      return { success: false, error: "That phone number belongs to another customer." };
    }
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
  const todayStart = startOfDayBiz(new Date());

  const allOrders = await db.select().from(orders);

  const todayOrders  = allOrders.filter((o) => new Date(o.createdAt) >= todayStart);
  const activeOrders = allOrders.filter((o) => o.status === "pending" || o.status === "processing");
  const doneOrders   = allOrders.filter((o) => o.status === "done");

  // Includes partial (DP) payments, not just fully paid orders.
  const todayRevenue = sumRevenue(allOrders, todayStart);

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