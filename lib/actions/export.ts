// lib/actions/export.ts
"use server";

import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  customers,
  servicePricing,
} from "@/lib/db/schema";
import { eq, gte, lte, and, inArray } from "drizzle-orm";
import { formatUSD } from "@/lib/utils/order-form";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderExportRow extends Record<string, unknown> {
  "Order #":        string;
  Customer:         string;
  Phone:            string;
  Services:         string;
  "Weight / Qty":   string;
  "Total Price":    string;
  "Payment Status": string;
  "Payment Method": string;
  Status:           string;
  Notes:            string;
  Date:             string;
}

export interface CustomerExportRow extends Record<string, unknown> {
  Name:           string;
  Phone:          string;
  Address:        string;
  "Total Orders": number;
  "Total Spent":  string;
  "Last Order":   string;
  "Member Since": string;
}

// ─── Orders Export ────────────────────────────────────────────────────────────

export async function getOrdersForExport(
  from: string,
  to:   string,
): Promise<OrderExportRow[]> {
  const start = new Date(from + "T00:00:00");
  const end   = new Date(to   + "T23:59:59");

  // 1. Fetch all orders in the date range joined with their customer
  const orderRows = await db
    .select({
      id:            orders.id,
      orderNumber:   orders.orderNumber,
      totalPrice:    orders.totalPrice,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      status:        orders.status,
      notes:         orders.notes,
      createdAt:     orders.createdAt,
      customerName:  customers.name,
      customerPhone: customers.phone,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
    .orderBy(orders.createdAt);

  if (orderRows.length === 0) return [];

  // 2. Fetch all order items for those orders in one query
  const orderIds = orderRows.map((o) => o.id);

  const itemRows = await db
    .select({
      orderId:     orderItems.orderId,
      weightKg:    orderItems.weightKg,
      quantity:    orderItems.quantity,
      serviceName: servicePricing.name,
      pricingUnit: servicePricing.pricingUnit,
    })
    .from(orderItems)
    .innerJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
    .where(
      orderIds.length === 1
        ? eq(orderItems.orderId, orderIds[0])
        : inArray(orderItems.orderId, orderIds),
    );

  // 3. Group items by orderId
  const itemsByOrder = new Map<number, typeof itemRows>();
  for (const item of itemRows) {
    const existing = itemsByOrder.get(item.orderId) ?? [];
    existing.push(item);
    itemsByOrder.set(item.orderId, existing);
  }

  // 4. Map to export rows
  return orderRows.map((o) => {
    const items = itemsByOrder.get(o.id) ?? [];

    const serviceNames = items.map((i) => i.serviceName).join(", ") || "—";

    const weightQty = items
      .map((i) => {
        if (i.pricingUnit === "per_kg"  && i.weightKg != null) return `${i.weightKg} kg`;
        if (i.pricingUnit === "per_pcs" && i.quantity  != null) return `${i.quantity} pcs`;
        return "—";
      })
      .join(", ") || "—";

    const statusLabel = o.status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const methodLabel =
      o.paymentMethod === "cash"     ? "Cash"     :
      o.paymentMethod === "transfer" ? "Transfer" :
      o.paymentMethod === "qris"     ? "QRIS"     :
      "—";

    return {
      "Order #":        o.orderNumber,
      Customer:         o.customerName,
      Phone:            o.customerPhone,
      Services:         serviceNames,
      "Weight / Qty":   weightQty,
      "Total Price":    formatUSD(parseFloat(String(o.totalPrice))),
      "Payment Status": o.paymentStatus === "paid" ? "Paid" : "Unpaid",
      "Payment Method": methodLabel,
      Status:           statusLabel,
      Notes:            o.notes ?? "",
      Date:             new Date(o.createdAt).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      }),
    };
  });
}

// ─── Customers Export ─────────────────────────────────────────────────────────

export async function getCustomersForExport(
  from: string,
  to:   string,
): Promise<CustomerExportRow[]> {
  const start = new Date(from + "T00:00:00");
  const end   = new Date(to   + "T23:59:59");

  // 1. Fetch customers created in the date range
  const customerRows = await db
    .select()
    .from(customers)
    .where(and(gte(customers.createdAt, start), lte(customers.createdAt, end)))
    .orderBy(customers.createdAt);

  if (customerRows.length === 0) return [];

  // 2. Fetch all orders for those customers in one query
  const customerIds = customerRows.map((c) => c.id);

  const orderRows = await db
    .select({
      customerId: orders.customerId,
      totalPrice: orders.totalPrice,
      createdAt:  orders.createdAt,
    })
    .from(orders)
    .where(
      customerIds.length === 1
        ? eq(orders.customerId, customerIds[0])
        : inArray(orders.customerId, customerIds),
    );

  // 3. Group orders by customerId
  const ordersByCustomer = new Map<number, typeof orderRows>();
  for (const order of orderRows) {
    const existing = ordersByCustomer.get(order.customerId) ?? [];
    existing.push(order);
    ordersByCustomer.set(order.customerId, existing);
  }

  // 4. Map to export rows
  return customerRows.map((c) => {
    const cOrders     = ordersByCustomer.get(c.id) ?? [];
    const totalOrders = cOrders.length;
    const totalSpent  = cOrders.reduce(
      (sum, o) => sum + parseFloat(String(o.totalPrice)),
      0,
    );
    const lastOrderDate = cOrders.reduce<Date | null>((latest, o) => {
      const d = new Date(o.createdAt);
      return !latest || d > latest ? d : latest;
    }, null);

    return {
      Name:           c.name,
      Phone:          c.phone,
      Address:        c.address,
      "Total Orders": totalOrders,
      "Total Spent":  formatUSD(totalSpent),
      "Last Order":   lastOrderDate
        ? lastOrderDate.toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
          })
        : "No orders yet",
      "Member Since": new Date(c.createdAt).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      }),
    };
  });
}