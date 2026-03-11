// scripts/seed-users.ts
// Run with:  npm run seed:users
// Force-reset passwords for existing users:  npm run seed:users -- --reset

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { users, roles } from "../lib/db/schema";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db  = drizzle(sql);

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  {
    name:     "Admin Akiro",
    email:    "admin@akirolarundry.com",
    password: "admin123",
    role:     "admin" as const,
  },
  {
    name:     "Employee One",
    email:    "employee1@akirolarundry.com",
    password: "employee123",
    role:     "employee" as const,
  },
  {
    name:     "Employee Two",
    email:    "employee2@akirolarundry.com",
    password: "employee123",
    role:     "employee" as const,
  },
] as const;

async function seedUsers() {
  const resetMode = process.argv.includes("--reset");
  console.log(`🌱 Seeding users… ${resetMode ? "(--reset: will overwrite existing passwords)" : ""}\n`);

  // 1. Ensure roles exist
  console.log("📋 Ensuring roles table is seeded...");
  await db
    .insert(roles)
    .values([
      { name: "admin",    description: "Full access to admin console, cash register, settings, and all orders" },
      { name: "employee", description: "Access to employee dashboard: create orders, update status, view cash register" },
      { name: "user",     description: "Standard account — no access to admin or employee portals" },
    ])
    .onConflictDoNothing();

  // 2. Insert / update users
  console.log("👥 Seeding users...");

  for (const u of SEED_USERS) {
    const hashed = await bcrypt.hash(u.password, 12);

    if (resetMode) {
      // Upsert: insert or overwrite name + password + role
      await db
        .insert(users)
        .values({ name: u.name, email: u.email, password: hashed, role: u.role })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: u.name, password: hashed, role: u.role },
        });
      console.log(`   ✓ ${u.role.padEnd(8)}  ${u.email}  [reset]`);
    } else {
      // Insert only — skip if email already exists
      const inserted = await db
        .insert(users)
        .values({ name: u.name, email: u.email, password: hashed, role: u.role })
        .onConflictDoNothing()
        .returning({ id: users.id });

      if (inserted.length > 0) {
        console.log(`   ✓ ${u.role.padEnd(8)}  ${u.email}  [created]`);
      } else {
        // Auto-fix if the existing password is still the old plain-text placeholder
        const [existing] = await db
          .select({ password: users.password })
          .from(users)
          .where(eq(users.email, u.email))
          .limit(1);

        if (existing && !existing.password.startsWith("$2")) {
          await db
            .update(users)
            .set({ password: hashed, role: u.role })
            .where(eq(users.email, u.email));
          console.log(`   ✓ ${u.role.padEnd(8)}  ${u.email}  [fixed unhashed password]`);
        } else {
          console.log(`   – ${u.role.padEnd(8)}  ${u.email}  [already exists, skipped]`);
        }
      }
    }
  }

  console.log("\n✅ Users seeded successfully!");
  console.log(`\n📋 Summary:`);
  console.log(`   • ${SEED_USERS.filter(u => u.role === "admin").length} admin user(s)`);
  console.log(`   • ${SEED_USERS.filter(u => u.role === "employee").length} employee user(s)`);
  console.log("\n⚠️  Remember to change default passwords before deploying to production.");
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error("❌ User seed failed:", err);
  process.exit(1);
});