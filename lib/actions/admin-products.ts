/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/admin-products.ts
"use server";

import { db } from "@/lib/db";
import { soaps, pewangi } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ProductActionResult {
  success: boolean;
  error?: string;
}

// ─── Plain data shapes (no schema type re-exports) ────────────────────────────

export interface SoapItem {
  id:         number;
  name:       string;
  brand:      string | null;
  pricePerKg: string;
  isActive:   boolean;
  createdAt:  Date;
}

export interface PewangiItem {
  id:         number;
  name:       string;
  brand:      string | null;
  pricePerKg: string;
  isActive:   boolean;
  createdAt:  Date;
}

// ─── Soaps ────────────────────────────────────────────────────────────────────

export async function getAdminSoaps(): Promise<SoapItem[]> {
  const rows = await db.select().from(soaps).orderBy(desc(soaps.createdAt));
  return rows.map((r) => ({
    id:         r.id,
    name:       r.name,
    brand:      r.brand ?? null,
    pricePerKg: r.pricePerKg,
    isActive:   r.isActive,
    createdAt:  r.createdAt,
  }));
}

export async function createSoap(data: {
  name: string;
  brand?: string;
  pricePerKg: string;
}): Promise<ProductActionResult> {
  try {
    if (!data.name.trim()) return { success: false, error: "Name is required." };
    if (!data.pricePerKg || isNaN(parseFloat(data.pricePerKg)))
      return { success: false, error: "Valid price is required." };

    await db.insert(soaps).values({
      name:       data.name.trim(),
      brand:      data.brand?.trim() || null,
      pricePerKg: data.pricePerKg,
      isActive:   true,
    });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to create detergent." };
  }
}

export async function updateSoap(
  id: number,
  data: { name: string; brand?: string; pricePerKg: string; isActive: boolean }
): Promise<ProductActionResult> {
  try {
    await db
      .update(soaps)
      .set({
        name:       data.name.trim(),
        brand:      data.brand?.trim() || null,
        pricePerKg: data.pricePerKg,
        isActive:   data.isActive,
      })
      .where(eq(soaps.id, id));

    revalidatePath("/admin/products");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to update detergent." };
  }
}

export async function deleteSoap(id: number): Promise<ProductActionResult> {
  try {
    await db.delete(soaps).where(eq(soaps.id, id));
    revalidatePath("/admin/products");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to delete detergent. It may be linked to existing orders." };
  }
}

// ─── Pewangi ──────────────────────────────────────────────────────────────────

export async function getAdminPewangi(): Promise<PewangiItem[]> {
  const rows = await db.select().from(pewangi).orderBy(desc(pewangi.createdAt));
  return rows.map((r) => ({
    id:         r.id,
    name:       r.name,
    brand:      r.brand ?? null,
    pricePerKg: r.pricePerKg,
    isActive:   r.isActive,
    createdAt:  r.createdAt,
  }));
}

export async function createPewangi(data: {
  name: string;
  brand?: string;
  pricePerKg: string;
}): Promise<ProductActionResult> {
  try {
    if (!data.name.trim()) return { success: false, error: "Name is required." };
    if (!data.pricePerKg || isNaN(parseFloat(data.pricePerKg)))
      return { success: false, error: "Valid price is required." };

    await db.insert(pewangi).values({
      name:       data.name.trim(),
      brand:      data.brand?.trim() || null,
      pricePerKg: data.pricePerKg,
      isActive:   true,
    });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to create fragrance." };
  }
}

export async function updatePewangi(
  id: number,
  data: { name: string; brand?: string; pricePerKg: string; isActive: boolean }
): Promise<ProductActionResult> {
  try {
    await db
      .update(pewangi)
      .set({
        name:       data.name.trim(),
        brand:      data.brand?.trim() || null,
        pricePerKg: data.pricePerKg,
        isActive:   data.isActive,
      })
      .where(eq(pewangi.id, id));

    revalidatePath("/admin/products");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to update fragrance." };
  }
}

export async function deletePewangi(id: number): Promise<ProductActionResult> {
  try {
    await db.delete(pewangi).where(eq(pewangi.id, id));
    revalidatePath("/admin/products");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to delete fragrance. It may be linked to existing orders." };
  }
}