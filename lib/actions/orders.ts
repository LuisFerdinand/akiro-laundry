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
import { eq, ilike, desc, asc, and, or, sql, gte, lte, inArray, count, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  startOfDayBiz,
  subDaysBiz,
  bizDayStart,
  bizDayEnd,
  hourBiz,
  isoDayBiz,
} from "@/lib/utils/business-time";
import { sumRevenue } from "@/lib/utils/revenue";
import { paymentAfterTotalChange, paymentBalance } from "@/lib/utils/order-payment";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_LIST_PAGE_SIZE,
  type OrderListQuery,
  type OrderSortKey,
  type OrderStatusFilter,
  type PaymentFilter,
  type SortDir,
} from "@/lib/utils/order-query";
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
  /** Clothes count lines — loaded by getOrderById only (not the list query). */
  clothesCounts?:  OrderClothingCount[];
}

// ── Employee orders list ───────────────────────────────────────────────────────
// Server-side search / filter / sort / pagination for /employee/orders. The
// query comes from the URL (lib/utils/order-query.ts).

/** Lightweight service line for list rows — just enough for a one-line summary. */
export interface OrderListItem {
  id:          number;
  serviceName: string;
  pricingUnit: string;
  weightKg:    string | null;
  quantity:    number | null;
}

export interface OrderListRow extends Order {
  customerName:  string;
  customerPhone: string;
  items:         OrderListItem[];
}

export interface OrderListResult {
  rows:       OrderListRow[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
  /** Matches per status / payment chip — each counted with every *other* filter applied. */
  statusCounts:  Record<OrderStatusFilter, number>;
  paymentCounts: Record<PaymentFilter, number>;
  /** Still owed (unpaid totals + DP balances) across every matching order. */
  toCollect: { amount: number; orders: number };
}

/** Balance still owed on an order, as SQL — mirrors paymentBalance() for unpaid / DP orders. */
const balanceDueSql = sql<string>`case ${orders.paymentStatus}
  when 'unpaid'  then ${orders.totalPrice}
  when 'partial' then greatest(${orders.totalPrice} - coalesce(${orders.amountPaid}, 0), 0)
  else 0 end`;

function orderSearchCondition(raw: string): SQL | undefined {
  const term = raw.trim();
  if (!term) return undefined;
  const like = `%${term}%`;
  const conditions: SQL[] = [
    ilike(orders.orderNumber, like),
    ilike(customers.name,     like),
    ilike(customers.phone,    like),
    // Any service line on the order ("sepatu", "setrika", …)
    sql`exists (
      select 1 from ${orderItems}
      join ${servicePricing} on ${servicePricing.id} = ${orderItems.servicePricingId}
      where ${orderItems.orderId} = ${orders.id} and ${servicePricing.name} ilike ${like}
    )`,
  ];
  // Phones are stored as E.164 (+670…) — still match a number typed the local way ("0767…").
  const localDigits = stripTrunkPrefix(term);
  if (localDigits.length >= 3 && localDigits !== term) {
    conditions.push(ilike(customers.phone, `%${localDigits}%`));
  }
  return or(...conditions);
}

function orderDateCondition(q: OrderListQuery): SQL | undefined {
  const today = startOfDayBiz(new Date());
  switch (q.range) {
    case "today": return gte(orders.createdAt, today);
    case "7d":    return gte(orders.createdAt, subDaysBiz(today, 6));
    case "30d":   return gte(orders.createdAt, subDaysBiz(today, 29));
    case "custom": {
      const bounds: SQL[] = [];
      if (q.from) bounds.push(gte(orders.createdAt, bizDayStart(q.from)));
      if (q.to)   bounds.push(lte(orders.createdAt, bizDayEnd(q.to)));
      return bounds.length > 0 ? and(...bounds) : undefined;
    }
    default:
      return undefined;
  }
}

function orderStatusCondition(status: OrderStatusFilter): SQL | undefined {
  if (status === "all")    return undefined;
  if (status === "active") return inArray(orders.status, ACTIVE_ORDER_STATUSES);
  return eq(orders.status, status);
}

function orderListSort(sort: OrderSortKey, dir: SortDir): SQL[] {
  const by = dir === "asc" ? asc : desc;
  switch (sort) {
    case "customer": return [by(sql`lower(${customers.name})`), desc(orders.createdAt)];
    case "total":    return [by(orders.totalPrice), desc(orders.createdAt)];
    // Enum order: unpaid → partial → paid / pending → processing → done → picked_up
    case "payment":  return [by(orders.paymentStatus), desc(orders.createdAt)];
    case "status":   return [by(orders.status), desc(orders.createdAt)];
    default:         return [by(orders.createdAt)];
  }
}

/** One page of list rows — the order, its customer and a light summary of its service lines. */
async function loadOrderListRows(
  where:   SQL | undefined,
  orderBy: SQL[],
  limit:   number,
  offset = 0,
): Promise<OrderListRow[]> {
  const rows = await db
    .select({
      order:         orders,
      customerName:  customers.name,
      customerPhone: customers.phone,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(...orderBy, desc(orders.id))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) return [];

  const items = await db
    .select({
      orderId:     orderItems.orderId,
      id:          orderItems.id,
      weightKg:    orderItems.weightKg,
      quantity:    orderItems.quantity,
      serviceName: servicePricing.name,
      pricingUnit: servicePricing.pricingUnit,
    })
    .from(orderItems)
    .leftJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
    .where(inArray(orderItems.orderId, rows.map((r) => r.order.id)))
    .orderBy(asc(orderItems.id));

  const itemsByOrder = new Map<number, OrderListItem[]>();
  for (const it of items) {
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push({
      id:          it.id,
      serviceName: it.serviceName ?? "—",
      pricingUnit: it.pricingUnit ?? "per_kg",
      weightKg:    it.weightKg,
      quantity:    it.quantity,
    });
    itemsByOrder.set(it.orderId, list);
  }

  return rows.map((r) => ({
    ...r.order,
    customerName:  r.customerName  ?? "Unknown",
    customerPhone: r.customerPhone ?? "—",
    items:         itemsByOrder.get(r.order.id) ?? [],
  }));
}

export async function getOrderList(
  query:    OrderListQuery,
  pageSize: number = ORDER_LIST_PAGE_SIZE,
): Promise<OrderListResult> {
  const searchCond  = orderSearchCondition(query.search);
  const dateCond    = orderDateCondition(query);
  const statusCond  = orderStatusCondition(query.status);
  const paymentCond = query.payment === "all" ? undefined : eq(orders.paymentStatus, query.payment);
  const where       = and(searchCond, dateCond, statusCond, paymentCond);
  const orderBy     = orderListSort(query.sort, query.dir);

  // One grouped query feeds every chip count + the totals: the search and date
  // filters apply to all of it; status and payment are cross-filtered in JS.
  const groupsQuery = db
    .select({
      status:  orders.status,
      payment: orders.paymentStatus,
      n:       count(),
      due:     sql<string>`coalesce(sum(${balanceDueSql}), 0)`,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(and(searchCond, dateCond))
    .groupBy(orders.status, orders.paymentStatus);

  const requestedPage = Math.max(1, query.page);
  const [groups, firstTry] = await Promise.all([
    groupsQuery,
    loadOrderListRows(where, orderBy, pageSize, (requestedPage - 1) * pageSize),
  ]);

  const statusMatches  = (s: Order["status"]) =>
    query.status === "all" ||
    (query.status === "active" ? ACTIVE_ORDER_STATUSES.includes(s) : s === query.status);
  const paymentMatches = (p: Order["paymentStatus"]) => query.payment === "all" || p === query.payment;

  const statusCounts: Record<OrderStatusFilter, number> =
    { all: 0, active: 0, pending: 0, processing: 0, done: 0, picked_up: 0 };
  const paymentCounts: Record<PaymentFilter, number> = { all: 0, unpaid: 0, partial: 0, paid: 0 };
  let total = 0;
  const toCollect = { amount: 0, orders: 0 };

  for (const g of groups) {
    const n = Number(g.n);
    if (paymentMatches(g.payment)) {
      statusCounts.all      += n;
      statusCounts[g.status] += n;
      if (ACTIVE_ORDER_STATUSES.includes(g.status)) statusCounts.active += n;
    }
    if (statusMatches(g.status)) {
      paymentCounts.all       += n;
      paymentCounts[g.payment] += n;
    }
    if (statusMatches(g.status) && paymentMatches(g.payment)) {
      total += n;
      if (g.payment !== "paid") {
        toCollect.amount += parseFloat(g.due);
        toCollect.orders += n;
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page       = Math.min(requestedPage, totalPages);
  // A page past the end (e.g. after other orders were picked up) falls back to the last one.
  const rows = page === requestedPage
    ? firstTry
    : await loadOrderListRows(where, orderBy, pageSize, (page - 1) * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
    paymentCounts,
    toCollect: { amount: Math.round(toCollect.amount * 100) / 100, orders: toCollect.orders },
  };
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

// ─── Employee Dashboard ───────────────────────────────────────────────────────

export interface EmployeeDashboardData {
  today: {
    orders:              number;
    /** Orders created yesterday up to this same time of day — for a fair "vs yesterday". */
    ordersYesterdaySoFar: number;
    /** Money in today — includes DP payments (see lib/utils/revenue.ts). */
    collected:              number;
    collectedYesterdaySoFar: number;
    /** Orders created today per business-local hour (24 slots). */
    hourly:              number[];
  };
  /** Still owed across all unpaid + DP orders. */
  toCollect: { amount: number; orders: number };
  flow: { pending: number; processing: number; done: number; pickedUpToday: number };
  /**
   * target — today's goal: the recent average day (last 7 days that had orders), at least 5.
   * record — the most orders ever taken in one day before today.
   */
  goal: { target: number; record: number };
  /** Orders taken today per staff member (orders.createdByName), busiest first. */
  team: { name: string; orders: number }[];
  /** Oldest "done" orders first — they have waited longest. */
  readyForPickup: OrderListRow[];
  latest:         OrderListRow[];
}

export async function getEmployeeDashboard(): Promise<EmployeeDashboardData> {
  const now          = new Date();
  const todayStart   = startOfDayBiz(now);
  const yesterday    = subDaysBiz(todayStart, 1);
  const sameTimeYday = subDaysBiz(now, 1);

  const [all, readyForPickup, latest] = await Promise.all([
    db
      .select({
        status:               orders.status,
        paymentStatus:        orders.paymentStatus,
        totalPrice:           orders.totalPrice,
        amountPaid:           orders.amountPaid,
        paidAt:               orders.paidAt,
        editedAfterPaymentAt: orders.editedAfterPaymentAt,
        createdAt:            orders.createdAt,
        updatedAt:            orders.updatedAt,
        createdByName:        orders.createdByName,
      })
      .from(orders),
    loadOrderListRows(eq(orders.status, "done"), [asc(orders.createdAt)], 6),
    loadOrderListRows(undefined, [desc(orders.createdAt)], 6),
  ]);

  const hourly   = Array<number>(24).fill(0);
  const team     = new Map<string, number>();
  const perDay   = new Map<string, number>();
  const flow     = { pending: 0, processing: 0, done: 0, pickedUpToday: 0 };
  const toCollect = { amount: 0, orders: 0 };
  let ordersToday = 0;
  let ordersYesterdaySoFar = 0;

  for (const o of all) {
    if (o.createdAt >= todayStart) {
      ordersToday++;
      hourly[hourBiz(o.createdAt)]++;
      const name = o.createdByName?.trim();
      if (name) team.set(name, (team.get(name) ?? 0) + 1);
    } else {
      const day = isoDayBiz(o.createdAt);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
      if (o.createdAt >= yesterday && o.createdAt <= sameTimeYday) ordersYesterdaySoFar++;
    }

    if (o.status === "picked_up") {
      // No dedicated picked-up timestamp — the status change is the order's last update.
      if (o.updatedAt >= todayStart) flow.pickedUpToday++;
    } else {
      flow[o.status]++;
    }

    if (o.paymentStatus !== "paid") {
      const due = paymentBalance(o).balanceDue;
      if (due > 0) {
        toCollect.amount += due;
        toCollect.orders++;
      }
    }
  }

  // Recent average day → today's goal; best day so far → the record to beat.
  const days    = [...perDay.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  const recent  = days.slice(0, 7).map(([, n]) => n);
  const average = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;

  return {
    today: {
      orders:                  ordersToday,
      ordersYesterdaySoFar,
      collected:               sumRevenue(all, todayStart),
      collectedYesterdaySoFar: sumRevenue(all, yesterday, sameTimeYday),
      hourly,
    },
    toCollect: { amount: Math.round(toCollect.amount * 100) / 100, orders: toCollect.orders },
    flow,
    goal: {
      target: Math.max(5, Math.ceil(average)),
      record: days.reduce((best, [, n]) => Math.max(best, n), 0),
    },
    team: [...team.entries()]
      .map(([name, n]) => ({ name, orders: n }))
      .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name)),
    readyForPickup,
    latest,
  };
}