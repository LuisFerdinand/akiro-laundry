/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/actions/admin-users.ts
"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export interface UserItem {
  id:        number;
  name:      string;
  email:     string;
  role:      "admin" | "employee" | "user";
  createdAt: Date;
}

export interface UserActionResult {
  success: boolean;
  error?:  string;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getAdminUsers(): Promise<UserItem[]> {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt));
  return rows.map((r) => ({
    id:        r.id,
    name:      r.name,
    email:     r.email,
    role:      r.role,
    createdAt: r.createdAt,
  }));
}

// ─── Update name / email (non-admin users only) ───────────────────────────────

export async function updateUser(
  id: number,
  data: { name: string; email: string },
  currentAdminId: number,
): Promise<UserActionResult> {
  try {
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "admin" && target.id !== currentAdminId)
      return { success: false, error: "Cannot edit another admin's profile." };

    if (!data.name.trim())  return { success: false, error: "Name is required." };
    if (!data.email.trim()) return { success: false, error: "Email is required." };

    await db.update(users).set({ name: data.name.trim(), email: data.email.trim().toLowerCase() }).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    if (e.message?.includes("unique")) return { success: false, error: "That email is already in use." };
    return { success: false, error: e.message ?? "Failed to update user." };
  }
}

// ─── Promote / demote role (cannot touch other admins) ───────────────────────

export async function updateUserRole(
  id: number,
  role: "admin" | "employee" | "user",
  currentAdminId: number,
): Promise<UserActionResult> {
  try {
    if (id === currentAdminId) return { success: false, error: "You cannot change your own role here." };

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "admin") return { success: false, error: "Cannot change another admin's role." };

    await db.update(users).set({ role }).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to update role." };
  }
}

// ─── Change password for non-admin users ─────────────────────────────────────

export async function changeUserPassword(
  id: number,
  newPassword: string,
  currentAdminId: number,
): Promise<UserActionResult> {
  try {
    if (id === currentAdminId) return { success: false, error: "Use the Settings page to change your own password." };

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "admin") return { success: false, error: "Cannot change another admin's password." };

    if (!newPassword || newPassword.length < 6)
      return { success: false, error: "Password must be at least 6 characters." };

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to change password." };
  }
}

// ─── Delete user (cannot delete admins) ──────────────────────────────────────

export async function deleteUser(
  id: number,
  currentAdminId: number,
): Promise<UserActionResult> {
  try {
    if (id === currentAdminId) return { success: false, error: "You cannot delete your own account." };

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "admin") return { success: false, error: "Cannot delete another admin account." };

    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to delete user." };
  }
}

// ─── Admin changes their own password (Settings page) ────────────────────────

export async function changeAdminPassword(
  adminId: number,
  currentPassword: string,
  newPassword: string,
): Promise<UserActionResult> {
  try {
    const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
    if (!admin) return { success: false, error: "User not found." };

    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) return { success: false, error: "Current password is incorrect." };

    if (!newPassword || newPassword.length < 6)
      return { success: false, error: "New password must be at least 6 characters." };

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, adminId));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to change password." };
  }
}