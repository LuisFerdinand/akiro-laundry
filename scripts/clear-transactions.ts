// scripts/clear-transactions.ts
// Empties order data and the cash register — and NOTHING else:
//   • orders
//   • order_items
//   • cash_register
//   • cash_register_transactions
// All four id sequences are reset so the next inserted row starts back at
// id = 1. Customers, soaps, pewangi, service pricing, expense categories,
// users/roles, and CMS/WhatsApp/receipt tables are left untouched.
//
// Usage:
//   npx tsx scripts/clear-transactions.ts            ← dry-run, shows row counts only
//   npx tsx scripts/clear-transactions.ts --confirm  ← actually executes the delete
//
// package.json (optional):
//   "data:clear":     "tsx scripts/clear-transactions.ts --confirm"
//   "data:clear:dry": "tsx scripts/clear-transactions.ts"

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Order matters only for readability here — TRUNCATE checks FK constraints
// across the whole listed set, so having order_items/cash_register_transactions
// (the children) in the same statement as orders/cash_register (the parents)
// works without needing CASCADE.
const TABLES = ["orders", "order_items", "cash_register", "cash_register_transactions"] as const;

// Raw neon sql tag — no drizzle wrapper needed, just firing raw SQL.
const sql = neon(DATABASE_URL);

const DRY_RUN = !process.argv.includes("--confirm");

async function clearData() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   CLEAR ORDER DATA + CASH REGISTER (production)      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  if (DRY_RUN) {
    console.warn("⚠️  DRY RUN MODE — nothing will be changed.");
    console.warn("⚠️  Pass --confirm to execute for real.\n");
  }

  // ── 1. Sanity-check all target tables exist ────────────────────────────────
  const existingRows = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = ANY(${TABLES as unknown as string[]})
  `;
  const existing = new Set(existingRows.map((r) => r.tablename as string));
  const missing = TABLES.filter((t) => !existing.has(t));
  if (missing.length > 0) {
    console.error(`❌  Table(s) not found in public schema: ${missing.join(", ")}. Aborting.`);
    process.exit(1);
  }

  // ── 2. Refuse to run if any table OUTSIDE this set has a FK pointing into it ─
  // (safety net — as of writing, only order_items/cash_register_transactions
  // reference orders, and both are already in TABLES)
  const referencingTables = await sql`
    SELECT DISTINCT tc.table_name AS referencing, ccu.table_name AS referenced
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = ANY(${TABLES as unknown as string[]})
      AND NOT (tc.table_name = ANY(${TABLES as unknown as string[]}))
  `;
  if (referencingTables.length > 0) {
    console.error(`❌  Refusing to run: table(s) outside the target set still reference it:`);
    referencingTables.forEach((r) =>
      console.error(`   • ${r.referencing} → ${r.referenced}`)
    );
    process.exit(1);
  }

  // ── 3. Show current row counts ──────────────────────────────────────────────
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const rows = await sql.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = (rows as { count: number }[])[0].count;
  }
  console.log("📋 Current row counts:\n");
  TABLES.forEach((t) => console.log(`   • ${t}: ${counts[t]}`));
  console.log("");

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  // ── 4. Dry-run exit ───────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log("─────────────────────────────────────────────────────");
    console.log("DRY RUN complete. The following would be executed:\n");
    console.log(`  TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY;`);
    console.log("");
    console.log(`This permanently deletes all ${totalRows} row(s) across these tables`);
    console.log("and resets each id sequence back to 1. No other table is touched.");
    console.log("");
    console.log(
      "Note: the app auto-recreates a fresh cash_register row (balance 0)"
    );
    console.log("the next time it's needed — no manual reseed required.");
    console.log("");
    console.log("To execute:  npx tsx scripts/clear-transactions.ts --confirm");
    console.log("");
    process.exit(0);
  }

  // ── 5. Execute ────────────────────────────────────────────────────────────
  console.log("🚨 EXECUTING DELETE — this is irreversible!\n");

  console.log(`   Truncating ${TABLES.join(", ")} and restarting identities...`);
  await sql.query(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY`);

  console.log("");
  console.log("✅ Done!\n");
  console.log("📋 What happened:");
  TABLES.forEach((t) => console.log(`   • ${t}: ${counts[t]} row(s) removed, id reset to 1`));
  console.log("   • no other table was modified");
  console.log("");

  process.exit(0);
}

clearData().catch((err) => {
  console.error("\n❌ Failed:", err);
  process.exit(1);
});
