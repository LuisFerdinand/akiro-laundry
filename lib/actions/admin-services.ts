/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/admin-services.ts
"use server";

import { db } from "@/lib/db";
import { servicePricing } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Plain interface — no re-exports from schema to avoid Turbopack "use server" errors
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

export interface ServiceActionResult {
  success: boolean;
  error?: string;
}

export async function getAdminServices(): Promise<ServicePricing[]> {
  const rows = await db.select().from(servicePricing).orderBy(desc(servicePricing.createdAt));
  return rows.map((r) => ({
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
  }));
}

export async function createService(data: {
  name: string;
  basePricePerKg: string;
  category: string;
  pricingUnit: string;
  minimumKg?: string;
  duration?: string;
  notes?: string;
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
    name: string;
    basePricePerKg: string;
    category: string;
    pricingUnit: string;
    minimumKg?: string;
    duration?: string;
    notes?: string;
    isActive: boolean;
  }
): Promise<ServiceActionResult> {
  try {
    await db
      .update(servicePricing)
      .set({
        name:           data.name.trim(),
        basePricePerKg: data.basePricePerKg,
        category:       data.category,
        pricingUnit:    data.pricingUnit,
        minimumKg:      data.minimumKg?.trim() || null,
        duration:       data.duration?.trim()  || null,
        notes:          data.notes?.trim()     || null,
        isActive:       data.isActive,
      })
      .where(eq(servicePricing.id, id));

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