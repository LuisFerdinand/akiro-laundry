// lib/db/seed.ts

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import {
  users,
  soaps,
  pewangi,
  servicePricing,
} from "@/lib/db/schema";

// Load .env.local manually for the seeder
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ─── 1. Admin User ─────────────────────────────────────────────────────────
  // We'll add bcrypt hashing in the auth step — plain for now as placeholder
  console.log("👤 Seeding admin user...");
  await db
    .insert(users)
    .values({
      name: "Admin Akiro",
      email: "admin@akirolaundry.com",
      password: "WILL_BE_HASHED_LATER",
      role: "admin",
    })
    .onConflictDoNothing();

  // ─── 2. Soaps (Deterjen) ───────────────────────────────────────────────────
  console.log("🧴 Seeding soaps...");
  await db
    .insert(soaps)
    .values([
      { name: "Rinso Anti Noda",   brand: "Rinso",    pricePerKg: "0.10" },
      { name: "So Klin Deterjen",  brand: "So Klin",  pricePerKg: "0.10" },
      { name: "Attack Easy",       brand: "Attack",   pricePerKg: "0.10" },
      { name: "Boom Cream",        brand: "Boom",     pricePerKg: "0.08" },
      { name: "Daia Deterjen",     brand: "Daia",     pricePerKg: "0.08" },
    ])
    .onConflictDoNothing();

  // ─── 3. Pewangi ────────────────────────────────────────────────────────────
  console.log("🌸 Seeding pewangi...");
  await db
    .insert(pewangi)
    .values([
      { name: "Downy Passion",            brand: "Downy",    pricePerKg: "0.15" },
      { name: "Molto Ultra Sekali Bilas", brand: "Molto",    pricePerKg: "0.12" },
      { name: "So Klin Softener",         brand: "So Klin",  pricePerKg: "0.10" },
      { name: "Znappy Fresh",             brand: "Znappy",   pricePerKg: "0.10" },
    ])
    .onConflictDoNothing();

  // ─── 4. Service Pricing ────────────────────────────────────────────────────
  console.log("🏷️  Seeding service pricing...\n");

  await db
    .insert(servicePricing)
    .values([

      // ── PROGRAMS (PACKAGES) ──────────────────────────────────────────────
      {
        name: "Wash & Dry",
        basePricePerKg: "1.00",
        category: "package",
        pricingUnit: "per_kg",
        minimumKg: "2",
        duration: "1 Day",
      },
      {
        name: "Wash, Dry & Iron — Express (6 Hours)",
        basePricePerKg: "3.00",
        category: "package",
        pricingUnit: "per_kg",
        minimumKg: "2",
        duration: "6 Hours",
      },
      {
        name: "Wash, Dry & Iron — Standard (1 Day)",
        basePricePerKg: "2.50",
        category: "package",
        pricingUnit: "per_kg",
        minimumKg: "2",
        duration: "1 Day",
      },
      {
        name: "Wash, Dry & Iron — Economy (2-3 Days)",
        basePricePerKg: "1.25",
        category: "package",
        pricingUnit: "per_kg",
        minimumKg: "2",
        duration: "2-3 Days",
      },
      {
        name: "Wash, Dry & Press — Express (6 Hours)",
        basePricePerKg: "3.50",
        category: "package",
        pricingUnit: "per_kg",
        minimumKg: "2",
        duration: "6 Hours",
      },
      {
        name: "Wash, Dry & Press — Standard (1 Day)",
        basePricePerKg: "3.00",
        category: "package",
        pricingUnit: "per_kg",
        minimumKg: "2",
        duration: "1 Day",
      },
      {
        name: "Wash, Dry & Press — Economy (2-3 Days)",
        basePricePerKg: "1.50",
        category: "package",
        pricingUnit: "per_kg",
        minimumKg: "2",
        duration: "2-3 Days",
      },

      // ── ITEM WASHING (FASE SATUAN) ────────────────────────────────────────
      {
        name: "Blankets / Bed Sheets / Towels",
        basePricePerKg: "1.75",
        category: "item",
        pricingUnit: "per_kg",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Shoes",
        basePricePerKg: "2.00",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Helmet",
        basePricePerKg: "1.25",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Bag",
        basePricePerKg: "1.25",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Doll / Soft Toy",
        basePricePerKg: "2.00",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
        notes: "Price range $1–$3/pcs depending on size",
      },
      {
        name: "Inner Wear / Underwear",
        basePricePerKg: "0.20",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Stained Clothes",
        basePricePerKg: "0.75",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Stained Jacket",
        basePricePerKg: "1.00",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Work Uniform",
        basePricePerKg: "0.75",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "1-2 Days",
      },
      {
        name: "School Uniform",
        basePricePerKg: "0.50",
        category: "item",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "1-2 Days",
      },

      // ── PREMIUM SERVICE ───────────────────────────────────────────────────
      {
        name: "Branded Clothes",
        basePricePerKg: "2.50",
        category: "premium",
        pricingUnit: "per_kg",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Regular Suit / Blazer",
        basePricePerKg: "3.00",
        category: "premium",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
      },
      {
        name: "Wedding Dress",
        basePricePerKg: "7.50",
        category: "premium",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
        notes: "Price range $5–$10/pcs",
      },
      {
        name: "Wedding Suit / Tuxedo",
        basePricePerKg: "7.50",
        category: "premium",
        pricingUnit: "per_pcs",
        minimumKg: null,
        duration: "2 Days",
        notes: "Price range $5–$10/pcs",
      },

    ])
    .onConflictDoNothing();

  console.log("✅ All data seeded successfully!");
  console.log("\n📋 Summary:");
  console.log("   • 1 admin user");
  console.log("   • 5 soaps (deterjen)");
  console.log("   • 4 pewangi");
  console.log("   • 7 package services");
  console.log("   • 10 item washing services");
  console.log("   • 4 premium services");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});