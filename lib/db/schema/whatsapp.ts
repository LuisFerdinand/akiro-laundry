// lib/db/schema/whatsapp.ts
//
// WhatsApp message template schema.
// Allows admin to customise the notification messages sent to customers
// via WhatsApp when order status changes.
//
// Available placeholder variables (used inside template fields):
//   {{customerName}}    — customer's name
//   {{orderNumber}}     — e.g. AK-20260329-001
//   {{servicesSummary}} — comma-separated service names
//   {{statusLabel}}     — human-readable status label
//   {{totalPrice}}      — formatted price e.g. $12.50
//   {{paymentLine}}     — auto-generated payment status line
//   {{reviewUrl}}       — link to the review page
//   {{notes}}           — order notes (only rendered if present)
//   {{businessName}}    — from settings
//   {{businessPhone}}   — from settings
//   {{businessUrl}}     — from settings

import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Re-declare the same Postgres enum defined in index.ts ─────────────────────
// We reference it here instead of importing from "./index" to avoid a
// circular dependency (index.ts re-exports * from this file).
// The enum name "order_status" and values MUST match the one in index.ts.
const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "done",
  "picked_up",
]);

// ─── WhatsApp Template Settings (global, single row) ──────────────────────────
// Controls the greeting, footer, and business info shared across all templates.

export const waTemplateSettings = pgTable("wa_template_settings", {
  id: serial("id").primaryKey(),

  // Business info shown in footer
  businessName:  text("business_name").notNull().default("Akiro Laundry"),
  businessPhone: text("business_phone").notNull().default("+670 7675 8 7380"),
  businessUrl:   text("business_url").notNull().default("akirolaundry.com"),

  // Greeting template (top of message)
  greetingTemplate: text("greeting_template")
    .notNull()
    .default(
      "Ola Sr/a *{{customerName}}*,\nAmi husi *{{businessName}}* hakarak informa kona-ba ita-nia pedidu foun.",
    ),

  // Order detail header
  orderDetailHeader: text("order_detail_header")
    .notNull()
    .default("🧾 *DETALLU PEDIDU*"),

  // Footer template (bottom of message)
  footerTemplate: text("footer_template")
    .notNull()
    .default("{{businessName}}\n📞 {{businessPhone}}\n🌐 {{businessUrl}}"),

  // Review CTA
  reviewCtaTemplate: text("review_cta_template")
    .notNull()
    .default(
      "⭐ *Kontenti ho ami-nia servisu?*\nHusik review ida iha: {{reviewUrl}}\nObrigadu barak! 🙏",
    ),

  // Payment line templates
  paymentPaidTemplate: text("payment_paid_template")
    .notNull()
    .default("✅ *Pagamentu:* Kompletu ona"),

  paymentUnpaidTemplate: text("payment_unpaid_template")
    .notNull()
    .default(
      "⚠️ *Pagamentu:* Seidauk selu — favor prepara {{totalPrice}} bainhira mai foti",
    ),

  // Notes section header (only shown if order has notes)
  notesSectionHeader: text("notes_section_header")
    .notNull()
    .default("📝 *NOTA ESPESIAL*"),

  // Separator character/line
  separator: text("separator")
    .notNull()
    .default("─────────────────────────"),

  isActive:  boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── WhatsApp Status Templates (one per order status) ─────────────────────────
// Each status has its own body lines that describe what's happening with the order.

export const waStatusTemplates = pgTable("wa_status_templates", {
  id: serial("id").primaryKey(),

  // Which order status this template is for
  status: orderStatusEnum("status").notNull().unique(),

  // The body text lines for this status (supports multiple lines via \n)
  bodyTemplate: text("body_template").notNull(),

  // Sort order (for admin UI display)
  sortOrder: integer("sort_order").notNull().default(0),

  isActive:  boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type WaTemplateSettings    = typeof waTemplateSettings.$inferSelect;
export type NewWaTemplateSettings = typeof waTemplateSettings.$inferInsert;
export type WaStatusTemplate      = typeof waStatusTemplates.$inferSelect;
export type NewWaStatusTemplate   = typeof waStatusTemplates.$inferInsert;