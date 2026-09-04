// scripts/fix-change-out-ledger.ts
//
// One-off repair for the cash-register ledger bug.
//
// THE BUG
//   For every cash payment where change was given, processPayment booked:
//     • payment_in  +totalPrice
//     • change_out  −change
//   The customer's overpayment (which funds the change) was never added to the
//   drawer, so subtracting the change again left the register short by exactly
//   the change amount on every one of those sales.
//
// THE FIX (code)  lib/actions/payments.ts now books a single payment_in of
//   totalPrice for cash sales and no change_out row at all.
//
// THE FIX (this script)  removes the historical change_out rows, recomputes the
//   running `balance_after` for every remaining transaction in chronological
//   order, and writes the corrected final balance back to cash_register.
//   The change figure itself is NOT lost — it still lives on orders.change_given.
//
// Usage:
//   npx tsx scripts/fix-change-out-ledger.ts            ← dry-run, shows the diff
//   npx tsx scripts/fix-change-out-ledger.ts --confirm  ← apply the repair
//
// Safe to run more than once: after a successful run there are no change_out
// rows left, so a second run is a no-op.

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const DRY_RUN = !process.argv.includes("--confirm");

// Work in integer cents throughout to avoid binary-float drift.
const toCents = (v: string | number) => Math.round(parseFloat(String(v)) * 100);
const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface TxRow {
  id: number;
  direction: "income" | "outcome";
  type: string;
  amount: string;
  balance_after: string;
  description: string;
  created_at: string;
}

async function run() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║      FIX CASH-REGISTER LEDGER — change_out repair    ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  if (DRY_RUN) {
    console.warn("⚠️  DRY RUN MODE — nothing will be changed.");
    console.warn("⚠️  Pass --confirm to apply the repair.\n");
  }

  // ── 1. Load the whole ledger in chronological order ────────────────────────
  const txs = (await sql`
    SELECT id, direction, type, amount, balance_after, description, created_at
    FROM   cash_register_transactions
    ORDER  BY created_at ASC, id ASC
  `) as unknown as TxRow[];

  if (txs.length === 0) {
    console.log("ℹ️  No cash-register transactions found. Nothing to do.\n");
    process.exit(0);
  }

  const changeOut = txs.filter((t) => t.type === "change_out");
  const keep      = txs.filter((t) => t.type !== "change_out");

  const changeTotal = changeOut.reduce((s, t) => s + toCents(t.amount), 0);

  console.log(`📋 Ledger rows:            ${txs.length}`);
  console.log(`   change_out rows:        ${changeOut.length}`);
  console.log(`   rows kept:              ${keep.length}`);
  console.log(`   total change to add back: ${fmt(changeTotal)}`);
  console.log("");

  if (changeOut.length === 0) {
    console.log("✅ No change_out rows — ledger already uses the corrected model.\n");
    process.exit(0);
  }

  // ── 2. Recompute the running balance over the kept rows ────────────────────
  const registerRows = (await sql`
    SELECT id, balance FROM cash_register ORDER BY id ASC LIMIT 1
  `) as unknown as { id: number; balance: string }[];
  if (registerRows.length === 0) {
    console.error("❌  No cash_register row found. Aborting.");
    process.exit(1);
  }
  const register = registerRows[0];
  const oldBalance = toCents(register.balance);

  let running = 0;
  const updates: { id: number; oldBal: number; newBal: number }[] = [];
  for (const t of keep) {
    running += t.direction === "income" ? toCents(t.amount) : -toCents(t.amount);
    const oldBal = toCents(t.balance_after);
    if (oldBal !== running) updates.push({ id: t.id, oldBal, newBal: running });
  }
  const newBalance = running;

  console.log("─────────────────────────────────────────────────────");
  console.log(`Register balance:  ${fmt(oldBalance)}  →  ${fmt(newBalance)}   (Δ +${fmt(newBalance - oldBalance)})`);
  console.log(`balance_after fixes on kept rows: ${updates.length}`);
  console.log("");
  if (updates.length > 0) {
    console.log("   sample (first 10):");
    updates.slice(0, 10).forEach((u) =>
      console.log(`     • tx #${u.id}: ${fmt(u.oldBal)} → ${fmt(u.newBal)}`),
    );
    console.log("");
  }

  if (newBalance < 0) {
    console.warn("⚠️  Recomputed balance goes negative at some point — review the");
    console.warn("⚠️  ledger manually before applying.\n");
  }

  if (DRY_RUN) {
    console.log("DRY RUN complete. Would:");
    console.log(`  1. DELETE ${changeOut.length} change_out row(s)`);
    console.log(`  2. UPDATE balance_after on ${updates.length} row(s)`);
    console.log(`  3. SET cash_register.balance = ${fmt(newBalance)}`);
    console.log("");
    console.log("To apply:  npx tsx scripts/fix-change-out-ledger.ts --confirm");
    console.log("");
    process.exit(0);
  }

  // ── 3. Apply ──────────────────────────────────────────────────────────────
  console.log("🚨 APPLYING REPAIR…\n");

  const changeIds = changeOut.map((t) => t.id);
  await sql`DELETE FROM cash_register_transactions WHERE id = ANY(${changeIds})`;
  console.log(`   ✔ deleted ${changeIds.length} change_out row(s)`);

  for (const u of updates) {
    await sql`
      UPDATE cash_register_transactions
      SET    balance_after = ${(u.newBal / 100).toFixed(2)}
      WHERE  id = ${u.id}
    `;
  }
  console.log(`   ✔ rewrote balance_after on ${updates.length} row(s)`);

  await sql`
    UPDATE cash_register
    SET    balance = ${(newBalance / 100).toFixed(2)}, last_updated_at = now()
    WHERE  id = ${register.id}
  `;
  console.log(`   ✔ register balance set to ${fmt(newBalance)}`);

  console.log("");
  console.log("✅ Done.\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌ Failed:", err);
  process.exit(1);
});
