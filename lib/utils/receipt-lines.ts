// lib/utils/receipt-lines.ts
//
// Single source of truth for the receipt's content — one freeform template
// with {{variable}} placeholders, exactly the same model as the WhatsApp
// templates (lib/utils/wa-message.ts). Used by BOTH the actual ESC/POS print
// path (lib/utils/escpos-receipt.ts) and the admin Receipt Settings live
// preview (components/admin/ReceiptTemplateEditor.tsx), so the admin editor
// can never again show something different from what actually prints.
//
// Supports inline *bold* markdown (parsed once here into segments) — the only
// formatting a thermal printer can actually render (via ESC/POS bold on/off).

import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";
import type { OrderFormData, OrderPriceBreakdown } from "./order-form";
import type { ReceiptSettings } from "@/lib/db/schema/receipt";

export interface ReceiptData {
  orderNumber:    string;
  createdAt:      Date;
  formData:       OrderFormData;
  services:       ServicePricing[];
  soaps:          Soap[];
  pewangis:       Pewangi[];
  breakdown:      OrderPriceBreakdown;
  paymentMethod?: string;
  amountPaid?:    number;
  changeGiven?:   number;
  settings?:      ReceiptSettings | null;
}

// ─── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_RECEIPT_TEMPLATE =
  "*{{shopName}}*\n{{shopTagline}}\n{{divider}}\nOrder: {{orderNumber}}\nDate    : {{date}}\nCustomer: {{customerName}}\nPhone   : {{customerPhone}}\nAddress : {{customerAddress}}\n{{divider}}\n{{items}}\n{{divider}}\n*TOTAL: {{totalPrice}}*\n{{divider}}\n{{paymentLine}}\n{{divider}}\nNote:\n{{notes}}\n{{divider}}\nThank you for choosing {{shopName}}!\n{{footerContact}}";

const DEFAULTS: Omit<ReceiptSettings, "id" | "updatedAt" | "isActive"> = {
  paperWidth:            "58mm",
  paperPadding:          "3mm 4mm 8mm",
  fontFamily:            "'IBM Plex Mono', 'Courier New', monospace",
  fontImportUrl:         "",
  baseFontSizePx:        9,
  shopName:              "Akiro Laundry",
  shopTagline:           "Premium Laundry & Perfume Service",
  logoUrl:               "",
  logoAlt:               "Akiro Laundry",
  logoMaxHeight:         "32px",
  accentColor:           "#0f5a85",
  accentBgColor:         "#f0f7fd",
  accentBorderColor:     "#b6def5",
  metaLabelColor:        "#607080",
  notesBgColor:          "#fffbeb",
  notesBorderColor:      "#fcd34d",
  notesAccentColor:      "#f59e0b",
  notesTextColor:        "#78350f",
  changeColor:           "#15803d",
  unpaidColor:           "#d97706",
  showLogo:              false,
  showShopName:          true,
  showTagline:           true,
  showOrderNumber:       true,
  showCustomerAddress:   true,
  showPaymentMethod:     true,
  showAmountPaid:        true,
  showChangeGiven:       true,
  showNotes:             true,
  showFooter:            true,
  footerThankYou:        "Thank you for choosing {{shopName}}!",
  footerContact:         "📞 +670 7675 8 7380  ·  akirolaundry.com",
  unpaidMessageTemplate: "*** AMOUNT DUE: {{totalPrice}} ***",
  paymentPaidTemplate:   "Payment: {{paymentMethod}}\nAmount Paid: {{amountPaid}}\nChange: {{change}}",
  receiptTemplate:       DEFAULT_RECEIPT_TEMPLATE,
  fontSize:              "normal",
  dividerChar:           "-",
  printDelayMs:          600,
};

export function mergeReceiptSettings(settings?: ReceiptSettings | null) {
  return { ...DEFAULTS, ...(settings ?? {}) };
}

/** Most 58mm thermal heads print ~32 characters per line at the default font; 80mm ~48. */
export function charsPerLineFor(paperWidth: string): number {
  return paperWidth.includes("80") ? 48 : 32;
}

// ─── Variable interpolation ────────────────────────────────────────────────────

/** Substitutes {{token}} placeholders — unresolved tokens are left visible so typos are easy to spot. */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(n);
}

function padLine(left: string, right: string, width: number): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

// ─── Inline bold parsing ────────────────────────────────────────────────────────
// The only formatting a thermal printer can render — *text* becomes an ESC/POS
// bold run. Same markdown the admin already knows from the WA template editor.

export interface ReceiptSegment {
  text: string;
  bold: boolean;
}
export type ReceiptLine = ReceiptSegment[];

function parseBoldLine(line: string): ReceiptLine {
  const segments: ReceiptSegment[] = [];
  const parts = line.split(/(\*[^*]+\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      segments.push({ text: part.slice(1, -1), bold: true });
    } else {
      segments.push({ text: part, bold: false });
    }
  }
  if (segments.length === 0) segments.push({ text: "", bold: false });
  return segments;
}

// ─── {{items}} block ──────────────────────────────────────────────────────────

function buildItemsBlock(data: ReceiptData, charsPerLine: number): string {
  const lines: string[] = [];

  data.formData.items.forEach((item, i) => {
    const svc      = data.services.find((sv) => sv.id === item.servicePricingId);
    const soap     = data.soaps.find((so) => so.id === item.soapId);
    const pewangi  = data.pewangis.find((p) => p.id === item.pewangiId);
    const b        = data.breakdown.items[i];
    const isPerPcs = svc?.pricingUnit === "per_pcs";

    const qtyLine = isPerPcs
      ? `${item.quantity ?? 0}pcs x ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/pcs`
      : `${item.weightKg ?? 0}kg x ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/kg`;

    lines.push(`*${svc?.name ?? "Service"}*`);
    lines.push(padLine(qtyLine, formatUSD(b?.baseServiceCost ?? 0), charsPerLine));
    if (soap)    lines.push(padLine(`  +Soap: ${soap.name}`,    formatUSD(b?.soapCost    ?? 0), charsPerLine));
    if (pewangi) lines.push(padLine(`  +Frag: ${pewangi.name}`, formatUSD(b?.pewangiCost ?? 0), charsPerLine));
    lines.push(padLine("Subtotal", formatUSD(b?.subtotal ?? 0), charsPerLine));
  });

  return lines.join("\n");
}

// ─── Main entry point ──────────────────────────────────────────────────────────

/**
 * Builds the receipt's full content by interpolating the admin's freeform
 * template, then parses the result into bold/plain segments per line — ready
 * for either ESC/POS byte conversion or HTML preview rendering.
 */
export function buildReceiptContent(data: ReceiptData, charsPerLine: number): ReceiptLine[] {
  const s = mergeReceiptSettings(data.settings);

  const vars: Record<string, string> = {
    shopName:        s.shopName,
    shopTagline:     s.shopTagline,
    orderNumber:     data.orderNumber,
    date: new Intl.DateTimeFormat("en-US", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Dili",
    }).format(data.createdAt),
    customerName:    data.formData.customer.name,
    customerPhone:   data.formData.customer.phone,
    customerAddress: data.formData.customer.address?.trim() ?? "",
    items:           buildItemsBlock(data, charsPerLine),
    totalPrice:      formatUSD(data.breakdown.totalPrice),
    paymentMethod:   data.paymentMethod ?? "",
    amountPaid:      data.amountPaid != null ? formatUSD(data.amountPaid) : "",
    change:          data.changeGiven && data.changeGiven > 0 ? formatUSD(data.changeGiven) : "",
    notes:           data.formData.notes?.trim() ?? "",
    footerContact:   s.footerContact,
    divider:         (s.dividerChar || "-").repeat(charsPerLine),
  };

  vars.paymentLine = data.amountPaid != null
    ? interpolate(s.paymentPaidTemplate, vars)
    : interpolate(s.unpaidMessageTemplate, vars);

  const fullText = interpolate(s.receiptTemplate, vars);
  return fullText.split("\n").map(parseBoldLine);
}
