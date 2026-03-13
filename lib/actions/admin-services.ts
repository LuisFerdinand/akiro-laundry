/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/admin-services.ts
"use server";

import { db } from "@/lib/db";
import { servicePricing, orders } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ServicePricing {
  id:             number;
  name:           string;
  basePricePerKg: string;
  category:       string;
  pricingUnit:    string;
  minimumKg:      string | null;
  duration:       string | null;
  notes:          string | null;
  isActive:       boolean;
  createdAt:      Date;
}

export interface ServiceWithStats extends ServicePricing {
  totalOrders:   number;
  totalRevenue:  number;
}

export interface ServiceActionResult {
  success: boolean;
  error?:  string;
}

export async function getAdminServices(search?: string): Promise<ServiceWithStats[]> {
  const rows = await db.select().from(servicePricing).orderBy(desc(servicePricing.createdAt));

  // Fetch all orders once to compute per-service stats
  const allOrders = await db
    .select({
      servicePricingId: orders.servicePricingId,
      totalPrice:       orders.totalPrice,
      paymentStatus:    orders.paymentStatus,
    })
    .from(orders);

  const filtered = search
    ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return filtered.map((r) => {
    const serviceOrders = allOrders.filter((o) => o.servicePricingId === r.id);
    const paid = serviceOrders.filter((o) => o.paymentStatus === "paid");
    return {
      id:             r.id,
      name:           r.name,
      basePricePerKg: r.basePricePerKg,
      category:       r.category,
      pricingUnit:    r.pricingUnit,
      minimumKg:      r.minimumKg  ?? null,
      duration:       r.duration   ?? null,
      notes:          r.notes      ?? null,
      isActive:       r.isActive,
      createdAt:      r.createdAt,
      totalOrders:    serviceOrders.length,
      totalRevenue:   paid.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
    };
  });
}

export async function createService(data: {
  name: string; basePricePerKg: string; category: string; pricingUnit: string;
  minimumKg?: string; duration?: string; notes?: string;
}): Promise<ServiceActionResult> {
  try {
    if (!data.name.trim()) return { success: false, error: "Name is required." };
    if (!data.basePricePerKg || isNaN(parseFloat(data.basePricePerKg)))
      return { success: false, error: "Valid price is required." };

    await db.insert(servicePricing).values({
      name:           data.name.trim(),
      basePricePerKg: data.basePricePerKg,
      category:       data.category   || "package",
      pricingUnit:    data.pricingUnit || "per_kg",
      minimumKg:      data.minimumKg?.trim() || null,
      duration:       data.duration?.trim()  || null,
      notes:          data.notes?.trim()     || null,
      isActive:       true,
    });
    revalidatePath("/admin/services");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to create service." };
  }
}

export async function updateService(
  id: number,
  data: {
    name: string; basePricePerKg: string; category: string; pricingUnit: string;
    minimumKg?: string; duration?: string; notes?: string; isActive: boolean;
  }
): Promise<ServiceActionResult> {
  try {
    await db.update(servicePricing).set({
      name:           data.name.trim(),
      basePricePerKg: data.basePricePerKg,
      category:       data.category,
      pricingUnit:    data.pricingUnit,
      minimumKg:      data.minimumKg?.trim() || null,
      duration:       data.duration?.trim()  || null,
      notes:          data.notes?.trim()     || null,
      isActive:       data.isActive,
    }).where(eq(servicePricing.id, id));
    revalidatePath("/admin/services");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to update service." };
  }
}

export async function deleteService(id: number): Promise<ServiceActionResult> {
  try {
    await db.delete(servicePricing).where(eq(servicePricing.id, id));
    revalidatePath("/admin/services");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to delete service. It may be linked to existing orders." };
  }
}