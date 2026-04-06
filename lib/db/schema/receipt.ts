// lib/db/schema/receipt.ts
//
// Receipt print-template settings.
// Allows admin to customise every visual / layout aspect of the thermal receipt
// without touching code — mirrors the same pattern used by whatsapp.ts.
//
// Customisable areas:
//   • Paper   — width, padding
//   • Fonts   — family, base size
//   • Header  — shop name, tagline, logo toggle
//   • Colors  — primary accent, subtle background tints
//   • Sections — show/hide individual blocks (notes, change, payment method, footer)
//   • Footer  — thank-you line, contact line

import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── Receipt Settings (global, single row) ────────────────────────────────────

export const receiptSettings = pgTable("receipt_settings", {
  id: serial("id").primaryKey(),

  // ── Paper ──────────────────────────────────────────────────────────────────
  // Width as a CSS value — change "58mm" to "80mm" when upgrading the printer
  paperWidth:      text("paper_width").notNull().default("58mm"),
  // Vertical + horizontal padding inside the paper (CSS shorthand, e.g. "3mm 4mm 8mm")
  paperPadding:    text("paper_padding").notNull().default("3mm 4mm 8mm"),

  // ── Typography ─────────────────────────────────────────────────────────────
  // Primary font stack (must be available via @import or system font)
  fontFamily:      text("font_family")
    .notNull()
    .default("'IBM Plex Mono', 'Courier New', monospace"),
  // Google Fonts @import URL — set to empty string to skip the import
  fontImportUrl:   text("font_import_url")
    .notNull()
    .default(
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap",
    ),
  // Base font size in px (all other sizes scale from this)
  baseFontSizePx:  integer("base_font_size_px").notNull().default(9),

  // ── Header ─────────────────────────────────────────────────────────────────
  shopName:        text("shop_name").notNull().default("Akiro Laundry"),
  // Tagline shown below the shop name; set to empty string to hide
  shopTagline:     text("shop_tagline").notNull().default("Premium Laundry & Perfume Service"),
  // Full Cloudinary (or any) URL for the logo image; empty = no logo
  logoUrl:         text("logo_url").notNull().default(""),
  logoAlt:         text("logo_alt").notNull().default("Akiro Laundry"),
  // Max height of the logo image as CSS value
  logoMaxHeight:   text("logo_max_height").notNull().default("32px"),

  // ── Colors ─────────────────────────────────────────────────────────────────
  // Main brand accent (order-number badge border, subtotal values, total value)
  accentColor:         text("accent_color").notNull().default("#0f5a85"),
  // Light background tint used in the order-number badge
  accentBgColor:       text("accent_bg_color").notNull().default("#f0f7fd"),
  // Border color for the order-number badge
  accentBorderColor:   text("accent_border_color").notNull().default("#b6def5"),
  // Color for meta/label text (Date, Customer, Phone)
  metaLabelColor:      text("meta_label_color").notNull().default("#607080"),
  // Background / border for the notes box
  notesBgColor:        text("notes_bg_color").notNull().default("#fffbeb"),
  notesBorderColor:    text("notes_border_color").notNull().default("#fcd34d"),
  notesAccentColor:    text("notes_accent_color").notNull().default("#f59e0b"),
  notesTextColor:      text("notes_text_color").notNull().default("#78350f"),
  // Change-given row text color
  changeColor:         text("change_color").notNull().default("#15803d"),
  // Unpaid badge text color
  unpaidColor:         text("unpaid_color").notNull().default("#d97706"),

  // ── Section toggles ────────────────────────────────────────────────────────
  showLogo:            boolean("show_logo").notNull().default(false),
  showShopName:        boolean("show_shop_name").notNull().default(true),
  showTagline:         boolean("show_tagline").notNull().default(true),
  showOrderNumber:     boolean("show_order_number").notNull().default(true),
  showCustomerAddress: boolean("show_customer_address").notNull().default(true),
  showPaymentMethod:   boolean("show_payment_method").notNull().default(true),
  showAmountPaid:      boolean("show_amount_paid").notNull().default(true),
  showChangeGiven:     boolean("show_change_given").notNull().default(true),
  showNotes:           boolean("show_notes").notNull().default(true),
  showFooter:          boolean("show_footer").notNull().default(true),

  // ── Footer text ────────────────────────────────────────────────────────────
  // Supports {{shopName}} placeholder
  footerThankYou:  text("footer_thank_you")
    .notNull()
    .default("Thank you for choosing {{shopName}}!"),
  footerContact:   text("footer_contact")
    .notNull()
    .default("📞 +670 7675 8 7380  ·  akirolaundry.com"),

  // ── Print delay ────────────────────────────────────────────────────────────
  // Milliseconds to wait before triggering window.print() — increase if fonts
  // are slow to load on the target printer device
  printDelayMs:    integer("print_delay_ms").notNull().default(600),

  // ── Misc ───────────────────────────────────────────────────────────────────
  isActive:  boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type ReceiptSettings    = typeof receiptSettings.$inferSelect;
export type NewReceiptSettings = typeof receiptSettings.$inferInsert;