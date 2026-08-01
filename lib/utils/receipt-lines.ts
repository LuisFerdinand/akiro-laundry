// lib/utils/receipt-lines.ts
//
// Single source of truth for the thermal receipt's content and layout — an
// ordered list of plain-text lines. Used by BOTH the actual ESC/POS print path
// (lib/utils/escpos-receipt.ts) and the admin Receipt Settings live preview
// (components/admin/ReceiptTemplateEditor.tsx), so the admin editor can never
// again show something different from what actually prints on the thermal
// printer — the exact bug that caused the last few rounds of "doesn't match
// the template" reports.

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

const DEFAULTS: Omit<ReceiptSettings, "id" | "updatedAt" | "isActive"> = {
  paperWidth:          "58mm",
  paperPadding:        "3mm 4mm 8mm",
  fontFamily:          "'IBM Plex Mono', 'Courier New', monospace",
  fontImportUrl:       "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap",
  baseFontSizePx:      9,
  shopName:            "Akiro Laundry",
  shopTagline:         "Premium Laundry & Perfume Service",
  logoUrl:             "",
  logoAlt:             "Akiro Laundry",
  logoMaxHeight:       "32px",
  accentColor:         "#0f5a85",
  accentBgColor:       "#f0f7fd",
  accentBorderColor:   "#b6def5",
  metaLabelColor:      "#607080",
  notesBgColor:        "#fffbeb",
  notesBorderColor:    "#fcd34d",
  notesAccentColor:    "#f59e0b",
  notesTextColor:      "#78350f",
  changeColor:         "#15803d",
  unpaidColor:         "#d97706",
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
  footerThankYou:      "Thank you for choosing {{shopName}}!",
  footerContact:       "📞 +670 7675 8 7380  ·  akirolaundry.com",
  printDelayMs:        600,
};

export function mergeReceiptSettings(settings?: ReceiptSettings | null) {
  return { ...DEFAULTS, ...(settings ?? {}) };
}

/** Most 58mm thermal heads print ~32 characters per line at the default font; 80mm ~48. */
export function charsPerLineFor(paperWidth: string): number {
  return paperWidth.includes("80") ? 48 : 32;
}

// ─── Line model ───────────────────────────────────────────────────────────────

export interface ReceiptLine {
  text:   string;
  align?: "left" | "center"; // default "left"
  bold?:  boolean;
  big?:   boolean;            // double-height emphasis (shop name, TOTAL)
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

/**
 * Builds the ordered, plain-text content of a receipt — every toggle, every
 * field, in the exact order and alignment it will actually print in.
 */
export function buildReceiptLines(data: ReceiptData, charsPerLine: number): ReceiptLine[] {
  const s = mergeReceiptSettings(data.settings);
  const lines: ReceiptLine[] = [];
  const push   = (line: ReceiptLine) => lines.push(line);
  const dashed = () => push({ text: "-".repeat(charsPerLine) });

  if (s.showShopName) push({ text: s.shopName, align: "center", bold: true, big: true });
  if (s.showTagline)  push({ text: s.shopTagline, align: "center" });
  dashed();

  if (s.showOrderNumber) push({ text: `Order: ${data.orderNumber}`, bold: true });

  push({ text: `Date    : ${new Intl.DateTimeFormat("en-US", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Dili",
  }).format(data.createdAt)}` });
  push({ text: `Customer: ${data.formData.customer.name}` });
  push({ text: `Phone   : ${data.formData.customer.phone}` });
  if (s.showCustomerAddress && data.formData.customer.address?.trim()) {
    push({ text: `Address : ${data.formData.customer.address}` });
  }
  dashed();

  data.formData.items.forEach((item, i) => {
    const svc      = data.services.find((sv) => sv.id === item.servicePricingId);
    const soap     = data.soaps.find((so) => so.id === item.soapId);
    const pewangi  = data.pewangis.find((p) => p.id === item.pewangiId);
    const b        = data.breakdown.items[i];
    const isPerPcs = svc?.pricingUnit === "per_pcs";

    const qtyLine = isPerPcs
      ? `${item.quantity ?? 0}pcs x ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/pcs`
      : `${item.weightKg ?? 0}kg x ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/kg`;

    push({ text: svc?.name ?? "Service", bold: true });
    push({ text: padLine(qtyLine, formatUSD(b?.baseServiceCost ?? 0), charsPerLine) });
    if (soap)    push({ text: padLine(`  +Soap: ${soap.name}`,    formatUSD(b?.soapCost    ?? 0), charsPerLine) });
    if (pewangi) push({ text: padLine(`  +Frag: ${pewangi.name}`, formatUSD(b?.pewangiCost ?? 0), charsPerLine) });
    push({ text: padLine("Subtotal", formatUSD(b?.subtotal ?? 0), charsPerLine) });
  });
  dashed();

  push({ text: `TOTAL: ${formatUSD(data.breakdown.totalPrice)}`, align: "center", bold: true, big: true });
  dashed();

  if (data.amountPaid != null) {
    if (s.showPaymentMethod) push({ text: padLine("Payment", data.paymentMethod ?? "-", charsPerLine) });
    if (s.showAmountPaid)    push({ text: padLine("Amount Paid", formatUSD(data.amountPaid), charsPerLine) });
    if (s.showChangeGiven && data.changeGiven && data.changeGiven > 0) {
      push({ text: padLine("Change", formatUSD(data.changeGiven), charsPerLine) });
    }
  } else {
    push({ text: "*** UNPAID ***", align: "center", bold: true });
  }

  const notes = data.formData.notes?.trim();
  if (s.showNotes && notes) {
    dashed();
    push({ text: "Note:" });
    push({ text: notes });
  }

  if (s.showFooter) {
    dashed();
    const thankYou = s.footerThankYou.replace(/\{\{shopName\}\}/g, s.shopName);
    push({ text: thankYou, align: "center", bold: true });
    if (s.footerContact) push({ text: s.footerContact, align: "center" });
  }

  return lines;
}
