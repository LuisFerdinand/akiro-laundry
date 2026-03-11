/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/admin-customers.ts
"use server";

import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import type { Customer } from "@/lib/db/schema";
import { eq, desc, ilike, or, sql, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerWithStats extends Customer {
  totalOrders:   number;
  totalSpent:    number;
  lastOrderDate: Date | null;
}

// ─── List all customers with stats ───────────────────────────────────────────

export async function getAdminCustomers(search?: string): Promise<CustomerWithStats[]> {
  const allCustomers = await db
    .select()
    .from(customers)
    .orderBy(desc(customers.createdAt));

  const filtered = search
    ? allCustomers.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q);
      })
    : allCustomers;

  // Fetch all orders once and group in JS (avoids N+1 queries)
  const allOrders = await db
    .select({
      customerId: orders.customerId,
      totalPrice: orders.totalPrice,
      createdAt:  orders.createdAt,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders);

  return filtered.map((c) => {
    const customerOrders = allOrders.filter((o) => o.customerId === c.id);
    const paid = customerOrders.filter((o) => o.paymentStatus === "paid");
    const sorted = [...customerOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      ...c,
      totalOrders:   customerOrders.length,
      totalSpent:    paid.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
      lastOrderDate: sorted[0]?.createdAt ?? null,
    };
  });
}

// ─── Single customer + their orders ──────────────────────────────────────────

export interface CustomerDetail extends CustomerWithStats {
  recentOrders: {
    id:           number;
    orderNumber:  string;
    totalPrice:   string;
    status:       string;
    paymentStatus: string;
    createdAt:    Date;
    serviceName:  string;
  }[];
}

export async function getAdminCustomerById(id: number): Promise<CustomerDetail | null> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return null;

  const customerOrders = await db
    .select({
      id:            orders.id,
      orderNumber:   orders.orderNumber,
      totalPrice:    orders.totalPrice,
      status:        orders.status,
      paymentStatus: orders.paymentStatus,
      createdAt:     orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  const paid = customerOrders.filter((o) => o.paymentStatus === "paid");

  return {
    ...customer,
    totalOrders:   customerOrders.length,
    totalSpent:    paid.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
    lastOrderDate: customerOrders[0]?.createdAt ?? null,
    recentOrders:  customerOrders.map((o) => ({ ...o, serviceName: "—" })),
  };
}

// ─── Create customer ──────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string; phone: string; address: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const [c] = await db
      .insert(customers)
      .values({ name: data.name.trim(), phone: data.phone.trim(), address: data.address.trim() })
      .returning({ id: customers.id });
    revalidatePath("/admin/customers");
    return { success: true, id: c.id };
  } catch (err: any) {
    if (err?.message?.includes("unique")) return { success: false, error: "Phone number already exists." };
    return { success: false, error: "Failed to create customer." };
  }
}

// ─── Update customer ──────────────────────────────────────────────────────────

export async function updateCustomer(
  id: number,
  data: { name: string; phone: string; address: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(customers)
      .set({ name: data.name.trim(), phone: data.phone.trim(), address: data.address.trim(), updatedAt: new Date() })
      .where(eq(customers.id, id));
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { success: true };
  } catch (err: any) {
    if (err?.message?.includes("unique")) return { success: false, error: "Phone number already exists." };
    return { success: false, error: "Failed to update customer." };
  }
}