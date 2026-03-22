// scripts/db-reset.ts
// Drops EVERY table in the public schema and clears the Drizzle migration
// journal so the next `drizzle-kit migrate` reruns all migrations cleanly.
//
// Usage:
//   npx tsx scripts/db-reset.ts            ← dry-run, shows what would be dropped
//   npx tsx scripts/db-reset.ts --confirm  ← actually executes the reset
//
// package.json:
//   "db:reset":     "tsx scripts/db-reset.ts --confirm"
//   "db:reset:dry": "tsx scripts/db-reset.ts"

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Raw neon sql tag — no drizzle wrapper needed, just firing raw SQL.
const sql = neon(DATABASE_URL);

const DRY_RUN = !process.argv.includes("--confirm");

async function reset() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║           DATABASE NUCLEAR RESET SCRIPT             ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  if (DRY_RUN) {
    console.warn("⚠️  DRY RUN MODE — nothing will be changed.");
    console.warn("⚠️  Pass --confirm to execute for real.\n");
  }

  // ── 1. Discover all user tables in the public schema ──────────────────────
  const tableRows = await sql`
    SELECT tablename
    FROM   pg_tables
    WHERE  schemaname = 'public'
    ORDER  BY tablename
  `;

  const allTables = tableRows.map((r) => r.tablename as string);

  if (allTables.length === 0) {
    console.log("ℹ️  No tables found in the public schema. Nothing to drop.");
    process.exit(0);
  }

  console.log(`📋 Found ${allTables.length} table(s) in public schema:\n`);
  allTables.forEach((t) => console.log(`   • ${t}`));
  console.log("");

  // ── 2. Show Drizzle migration records if the table exists ─────────────────
  if (allTables.includes("__drizzle_migrations")) {
    const migrations = await sql`
      SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id
    `;
    console.log(`📜 Found ${migrations.length} Drizzle migration record(s):\n`);
    migrations.forEach((m) =>
      console.log(`   • [${m.id}] ${m.hash}  (${new Date(m.created_at as string).toISOString()})`)
    );
    console.log("");
  } else {
    console.log("ℹ️  No __drizzle_migrations table found.\n");
  }

  // ── 3. Dry-run exit ───────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log("─────────────────────────────────────────────────────");
    console.log("DRY RUN complete. The following would be executed:\n");
    console.log("  DROP SCHEMA public CASCADE;");
    console.log("  CREATE SCHEMA public;");
    console.log("  GRANT ALL ON SCHEMA public TO PUBLIC;");
    console.log("");
    console.log("This permanently deletes ALL tables, sequences, views,");
    console.log("indexes, and Drizzle migration records in this database.");
    console.log("");
    console.log("To execute:  npx tsx scripts/db-reset.ts --confirm");
    console.log("");
    process.exit(0);
  }

  // ── 4. Execute ────────────────────────────────────────────────────────────
  console.log("🚨 EXECUTING RESET — this is irreversible!\n");

  console.log("   Dropping schema public CASCADE…");
  await sql`DROP SCHEMA public CASCADE`;

  console.log("   Recreating schema public…");
  await sql`CREATE SCHEMA public`;

  // Grant schema access to all roles. PUBLIC covers the Neon project owner
  // role automatically — no hardcoded role name needed, so this works on
  // Neon, Supabase, and standard Postgres alike.
  console.log("   Restoring grants…");
  await sql`GRANT ALL ON SCHEMA public TO PUBLIC`;

  console.log("");
  console.log("✅ Reset complete!\n");
  console.log("📋 What was removed:");
  console.log(`   • ${allTables.length} table(s) including all data`);
  console.log("   • All sequences (ID counters reset to 1 on next migrate)");
  console.log("   • All indexes, views, and constraints");
  console.log("   • Drizzle migration journal (__drizzle_migrations)");
  console.log("");
  console.log("📋 Next steps:");
  console.log("   1. npx drizzle-kit migrate   ← reapply all migrations");
  console.log("   2. npm run seed:cms           ← reseed with fresh IDs");
  console.log("");

  process.exit(0);
}

reset().catch((err) => {
  console.error("\n❌ Reset failed:", err);
  process.exit(1);
});