// scripts/seed-receipt-settings.ts
//
// Seeds the receipt_settings table with the default values that match
// the current hardcoded PrintReceipt.tsx template.
//
// Run: npm run seed:receipt   (or: npx tsx scripts/seed-receipt-settings.ts)

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import { receiptSettings } from "@/lib/db/schema/receipt";

// Load .env.local manually for the seeder
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db  = drizzle(sql);

async function seed() {
  console.log("🧾 Seeding receipt_settings table...\n");

  await db
    .insert(receiptSettings)
    .values({
      // ── Paper ────────────────────────────────────────────────────────────
      paperWidth:   "58mm",
      paperPadding: "3mm 4mm 8mm",

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily:    "'IBM Plex Mono', 'Courier New', monospace",
      fontImportUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap",
      baseFontSizePx: 9,

      // ── Header ───────────────────────────────────────────────────────────
      shopName:      "Akiro Laundry",
      shopTagline:   "Premium Laundry & Perfume Service",
      logoUrl:       "",
      logoAlt:       "Akiro Laundry",
      logoMaxHeight: "32px",

      // ── Colors ───────────────────────────────────────────────────────────
      accentColor:       "#0f5a85",
      accentBgColor:     "#f0f7fd",
      accentBorderColor: "#b6def5",
      metaLabelColor:    "#607080",
      notesBgColor:      "#fffbeb",
      notesBorderColor:  "#fcd34d",
      notesAccentColor:  "#f59e0b",
      notesTextColor:    "#78350f",
      changeColor:       "#15803d",
      unpaidColor:       "#d97706",

      // ── Section toggles ──────────────────────────────────────────────────
      showLogo:            false,
      showShopName:        true,
      showTagline:         true,
      showOrderNumber:     true,
      showCustomerAddress: true,
      showPaymentMethod:   true,
      showAmountPaid:      true,
      showChangeGiven:     true,
      showNotes:           true,
      showFooter:          true,

      // ── Footer ───────────────────────────────────────────────────────────
      footerThankYou: "Thank you for choosing {{shopName}}!",
      footerContact:  "📞 +670 7675 8 7380  ·  akirolaundry.com",

      // ── Print timing ─────────────────────────────────────────────────────
      printDelayMs: 600,
    })
    .onConflictDoNothing();

  console.log("✅ receipt_settings seeded successfully!\n");
  console.log("📋 Summary:");
  console.log("   • 1 receipt settings row (58mm paper, IBM Plex Mono, Akiro Laundry defaults)");
  console.log("   • All section toggles ON");
  console.log("   • Logo OFF (no URL set yet)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Receipt settings seed failed:", err);
  process.exit(1);
});