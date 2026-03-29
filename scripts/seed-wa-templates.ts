// scripts/seed-wa-templates.ts
//
// Seeds the WhatsApp message template tables with the default
// Tetum messages (matching the current hardcoded values).
//
// Run: npm run seed:wa   (or: npx tsx scripts/seed-wa-templates.ts)

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import {
  waTemplateSettings,
  waStatusTemplates,
} from "@/lib/db/schema/whatsapp";

// Load .env.local manually for the seeder
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("📱 Seeding WhatsApp template tables...\n");

  // ── 1. Global template settings ─────────────────────────────────────────────
  console.log("⚙️  Seeding wa_template_settings...");
  await db
    .insert(waTemplateSettings)
    .values({
      businessName:  "Akiro Laundry",
      businessPhone: "+670 7675 8 7380",
      businessUrl:   "akirolaundry.com",

      greetingTemplate:
        "Ola Sr/a *{{customerName}}*,\nAmi husi *{{businessName}}* hakarak informa kona-ba ita-nia pedidu foun.",

      orderDetailHeader: "🧾 *DETALLU PEDIDU*",

      footerTemplate:
        "{{businessName}}\n📞 {{businessPhone}}\n🌐 {{businessUrl}}",

      reviewCtaTemplate:
        "⭐ *Kontenti ho ami-nia servisu?*\nHusik review ida iha: {{reviewUrl}}\nObrigadu barak! 🙏",

      paymentPaidTemplate:   "✅ *Pagamentu:* Kompletu ona",
      paymentUnpaidTemplate:
        "⚠️ *Pagamentu:* Seidauk selu — favor prepara {{totalPrice}} bainhira mai foti",

      notesSectionHeader: "📝 *NOTA ESPESIAL*",
      separator: "─────────────────────────",
    })
    .onConflictDoNothing();

  // ── 2. Per-status body templates ────────────────────────────────────────────
  console.log("📋 Seeding wa_status_templates...");
  await db
    .insert(waStatusTemplates)
    .values([
      {
        status: "pending",
        bodyTemplate:
          "📋 Ita-nia pedidu ami *simu no rejista* ona.\nAmi sei hahú prosesu ropa ita-nia ho lalais.",
        sortOrder: 0,
      },
      {
        status: "processing",
        bodyTemplate:
          "🫧 Ita-nia pedidu iha *prosesu fase* agora.\nAmi sei hateten fali bainhira remata ona.",
        sortOrder: 1,
      },
      {
        status: "done",
        bodyTemplate:
          "✅ Ita-nia pedidu *remata ona* no prontu atu foti.\nFavor mai foti lalais. Obrigadu! 🙏",
        sortOrder: 2,
      },
      {
        status: "picked_up",
        bodyTemplate:
          "🎉 Ita-nia pedidu *foti ona*. Obrigadu tan uza ami-nia servisu!",
        sortOrder: 3,
      },
    ])
    .onConflictDoNothing();

  console.log("\n✅ WhatsApp templates seeded successfully!");
  console.log("\n📋 Summary:");
  console.log("   • 1 global template settings row");
  console.log("   • 4 status-specific body templates (pending, processing, done, picked_up)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ WA template seed failed:", err);
  process.exit(1);
});