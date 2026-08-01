// components/employee/PrintReceipt.tsx
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";
import type { OrderFormData, OrderPriceBreakdown } from "@/lib/utils/order-form";
import type { ReceiptSettings } from "@/lib/db/schema/receipt";
import { printer, isBluetoothSupported, getBluetoothPrinterPreference } from "@/lib/utils/bluetooth-printer";
import { buildReceiptRaster, dotWidthFor } from "@/lib/utils/receipt-raster";
import { toast } from "sonner";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day:      "2-digit",
    month:    "long",
    year:     "numeric",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
    timeZone: "Asia/Dili",
  }).format(date);
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function mergeReceiptSettings(settings?: ReceiptSettings | null) {
  return { ...DEFAULTS, ...(settings ?? {}) };
}

// ─── Receipt HTML builder ──────────────────────────────────────────────────────
// Single source of truth for the receipt's visual template — used by BOTH the
// browser-print (iframe) path and the Bluetooth thermal path (which rasterizes
// this exact HTML into an image, see lib/utils/receipt-raster.ts). This is what
// guarantees the two print methods produce identical-looking receipts.

export function buildReceiptHtml(
  data: ReceiptData,
  opts?: { widthPx?: number },
): string {
  const {
    orderNumber, createdAt, formData,
    services, soaps, pewangis, breakdown,
    paymentMethod, amountPaid, changeGiven,
  } = data;

  const s     = mergeReceiptSettings(data.settings);
  const notes = formData.notes?.trim() ?? "";

  const base = s.baseFontSizePx;
  const sm   = base - 1;
  const xs   = base - 2;
  const lg   = base + 2;
  const xl   = base + 3;

  /* ── Per-item rows ── */
  const itemRows = formData.items.map((item, i) => {
    const svc      = services.find((sv) => sv.id === item.servicePricingId);
    const soap     = soaps.find((so)    => so.id === item.soapId);
    const pewangi  = pewangis.find((p)  => p.id === item.pewangiId);
    const b        = breakdown.items[i];
    const isPerPcs = svc?.pricingUnit === "per_pcs";

    const qtyLine = isPerPcs
      ? `${item.quantity ?? 0} pcs × ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/pcs`
      : `${item.weightKg ?? 0} kg × ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/kg`;

    return `
      <tr><td colspan="2" class="item-name">${svc?.name ?? "Service"}</td></tr>
      <tr>
        <td class="item-detail">${qtyLine}</td>
        <td class="item-price">${formatUSD(b?.baseServiceCost ?? 0)}</td>
      </tr>
      ${soap ? `<tr>
        <td class="item-detail addon">+ Soap: ${soap.name}</td>
        <td class="item-price">${formatUSD(b?.soapCost ?? 0)}</td>
      </tr>` : ""}
      ${pewangi ? `<tr>
        <td class="item-detail addon">+ Fragrance: ${pewangi.name}</td>
        <td class="item-price">${formatUSD(b?.pewangiCost ?? 0)}</td>
      </tr>` : ""}
      <tr>
        <td class="subtotal-label">Subtotal</td>
        <td class="subtotal-value">${formatUSD(b?.subtotal ?? 0)}</td>
      </tr>
      <tr><td colspan="2" class="item-divider"></td></tr>
    `;
  }).join("");

  /* ── Payment rows ── */
  const methodLabel: Record<string, string> = {
    cash: "Cash", transfer: "Transfer", qris: "QRIS",
  };

  const paymentRows = amountPaid != null ? `
    ${s.showPaymentMethod ? `<tr class="payment-row">
      <td>Payment Method</td>
      <td class="right">${methodLabel[paymentMethod ?? ""] ?? paymentMethod ?? "—"}</td>
    </tr>` : ""}
    ${s.showAmountPaid ? `<tr class="payment-row">
      <td>Amount Paid</td>
      <td class="right">${formatUSD(amountPaid)}</td>
    </tr>` : ""}
    ${s.showChangeGiven && changeGiven != null && changeGiven > 0 ? `<tr class="payment-row change">
      <td>Change</td>
      <td class="right">${formatUSD(changeGiven)}</td>
    </tr>` : ""}
  ` : "";

  /* ── Notes block ── */
  const notesBlock = (s.showNotes && notes) ? `
    <hr class="dashed" />
    <div class="notes-section">
      <div class="notes-header">
        <span class="notes-icon">📝</span>
        <span class="notes-label">Special Instructions</span>
      </div>
      <div class="notes-box">${notes}</div>
    </div>
  ` : "";

  /* ── Header blocks ── */
  const logoHtml     = (s.showLogo && s.logoUrl)
    ? `<div style="text-align:center;margin-bottom:4px;">
        <img src="${s.logoUrl}" alt="${s.logoAlt}" crossorigin="anonymous"
             style="max-height:${s.logoMaxHeight};width:auto;display:inline-block;" />
       </div>`
    : "";
  const shopNameHtml = s.showShopName ? `<div class="shop-name">${s.shopName}</div>`         : "";
  const taglineHtml  = s.showTagline  ? `<div class="shop-tagline">${s.shopTagline}</div>`   : "";
  const orderNumHtml = s.showOrderNumber ? `
    <div class="order-num-label">Order Number</div>
    <div class="order-num">${orderNumber}</div>
  ` : "";
  const footerHtml   = s.showFooter ? `
    <hr class="dashed" />
    <div class="receipt-footer">
      <div class="footer-thankyou">${interpolate(s.footerThankYou, { shopName: s.shopName })}</div>
      ${s.footerContact ? `<div class="footer-contact">${s.footerContact}</div>` : ""}
    </div>
  ` : "";

  const fontImport = s.fontImportUrl ? `@import url('${s.fontImportUrl}');` : "";
  const bodyWidth  = opts?.widthPx ? `${opts.widthPx}px` : s.paperWidth;
  const pageSize   = opts?.widthPx ? "auto" : `${s.paperWidth} auto`;

  /* ── Full HTML ── */
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt - ${orderNumber}</title>
<style>
  ${fontImport}
  @page { size: ${pageSize}; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { width: ${bodyWidth}; margin: 0; padding: 0; background: #fff; }
  body {
    font-family: ${s.fontFamily}; font-size: ${base}px;
    color: #000; background: #fff; width: ${bodyWidth};
    padding: ${s.paperPadding};
    line-height: 1.3; overflow-wrap: anywhere;
    -webkit-print-color-adjust: economy; print-color-adjust: economy;
  }
  img { max-width: 100%; filter: grayscale(1) contrast(1.25); }
  tr, .notes-section, .receipt-footer { break-inside: avoid; page-break-inside: avoid; }
  .dashed { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .double { border: none; border-top: 3px double #000; margin: 5px 0; }
  .shop-name { text-align:center; font-size:${lg}px; font-weight:700; letter-spacing:0.08em; margin-bottom:1px; }
  .shop-tagline { text-align:center; font-size:${xs}px; color:#000; letter-spacing:0.06em; margin-bottom:4px; }
  .meta { width:100%; border-collapse:collapse; margin-bottom:3px; }
  .meta td { padding:1px 0; font-size:${sm}px; vertical-align:top; }
  .meta .label { color:#000; width:34%; }
  .meta .colon { width:5%; }
  .meta .value { font-weight:600; word-break:break-word; }
  .order-num-label { font-size:${xs}px; letter-spacing:0.18em; text-transform:uppercase; color:#000; text-align:center; margin-bottom:2px; }
  .order-num { text-align:center; font-size:${lg}px; font-weight:700; letter-spacing:0.12em; padding:4px 0; background:#fff; border:1px solid #000; border-radius:0; color:#000; margin-bottom:4px; }
  table.items { width:100%; border-collapse:collapse; }
  .item-name { font-weight:700; font-size:${base}px; padding:2px 0 1px; }
  .item-detail { font-size:${sm}px; color:#000; padding:0 0 1px 4px; }
  .item-detail.addon { color:#000; }
  .item-price { font-size:${sm}px; text-align:right; color:#000; vertical-align:top; padding:0 0 1px; white-space:nowrap; }
  .subtotal-label { font-size:${sm}px; font-weight:600; padding:1px 0 3px 4px; color:#000; }
  .subtotal-value { font-size:${sm}px; font-weight:700; text-align:right; color:#000; padding:1px 0 3px; white-space:nowrap; }
  .total-row { width:100%; border-collapse:collapse; }
  .total-row td { padding:2px 0; }
  .total-label { font-size:${lg}px; font-weight:700; }
  .total-value { font-size:${xl}px; font-weight:700; text-align:right; color:#000; white-space:nowrap; }
  .payment-row td { font-size:${sm}px; padding:1px 0; }
  .payment-row .right { text-align:right; font-weight:600; white-space:nowrap; }
  .change td { color:#000; font-weight:700; }
  .unpaid td { color:#000; font-weight:700; font-size:${base}px; }
  .notes-section { margin:2px 0; }
  .notes-header { display:flex; align-items:center; gap:4px; margin-bottom:3px; }
  .notes-icon { font-size:${base + 1}px; line-height:1; }
  .notes-label { font-size:${xs + 0.5}px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#000; }
  .notes-box { background:#fff; border:1px solid #000; border-left:3px solid #000; border-radius:0; padding:4px 6px; font-size:${sm}px; color:#000; line-height:1.5; word-break:break-word; white-space:pre-wrap; }
  .receipt-footer { text-align:center; margin-top:2px; }
  .footer-thankyou { font-size:${sm}px; font-weight:700; margin-bottom:2px; }
  .footer-contact { font-size:${xs}px; color:#000; }
  @media print {
    html, body { margin: 0 !important; }
    body { min-height: 0; }
  }
</style>
</head>
<body>
${logoHtml}${shopNameHtml}${taglineHtml}
<hr class="dashed" />
${orderNumHtml}
<table class="meta">
  <tr><td class="label">Date</td><td class="colon">:</td><td class="value">${formatDateTime(createdAt)}</td></tr>
  <tr><td class="label">Customer</td><td class="colon">:</td><td class="value">${formData.customer.name}</td></tr>
  <tr><td class="label">Phone</td><td class="colon">:</td><td class="value">${formData.customer.phone}</td></tr>
  ${(s.showCustomerAddress && formData.customer.address) ? `
  <tr><td class="label">Address</td><td class="colon">:</td><td class="value">${formData.customer.address}</td></tr>` : ""}
</table>
<hr class="dashed" />
<table class="items">${itemRows}</table>
<hr class="double" />
<table class="total-row">
  <tr>
    <td class="total-label">TOTAL</td>
    <td class="total-value">${formatUSD(breakdown.totalPrice)}</td>
  </tr>
</table>
<hr class="dashed" />
<table class="items">
  ${amountPaid != null ? paymentRows : `<tr class="unpaid"><td>&#9888; Unpaid</td><td></td></tr>`}
</table>
${notesBlock}
${footerHtml}
</body>
</html>`;
}

// ─── Bluetooth print ──────────────────────────────────────────────────────────
// Only runs when this device has explicitly opted in (see getBluetoothPrinterPreference)
// — otherwise every device would silently pick whichever path its browser happens to
// support, producing inconsistent output between e.g. a tablet and a laptop.
// Rasterizes the exact same HTML used for browser printing (buildReceiptHtml) so the
// thermal output matches the template pixel-for-pixel, instead of being reconstructed
// with plain ESC/POS text commands that can't replicate fonts, colors, or spacing.
// Falls through to the iframe/window.print() path on failure or when opted out.

async function printViaBluetooth(data: ReceiptData): Promise<boolean> {
  if (!isBluetoothSupported()) return false;      // Safari / Firefox — skip silently
  if (!getBluetoothPrinterPreference()) return false; // not opted in on this device

  try {
    if (!printer.isConnected) {
      toast.info("Printer not connected — pick your printer to continue.");
      await printer.connect();
    }
    const s       = mergeReceiptSettings(data.settings);
    const widthPx = dotWidthFor(s.paperWidth);
    const html    = buildReceiptHtml(data, { widthPx });
    const bytes   = await buildReceiptRaster(html, widthPx);
    await printer.write(bytes);
    return true;
  } catch (err) {
    console.warn("Bluetooth print failed, falling back to window.print():", err);
    toast.warning("Couldn't reach the thermal printer — opening the browser print dialog instead.");
    return false;
  }
}

// ─── iframe / window.print() fallback ────────────────────────────────────────

function printViaIframe(html: string, delayMs: number): void {
  // Use Blob URL instead of document.write() — avoids Safari crashes
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;";
  iframe.src = url;

  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url); // free memory
      }, 2000);
    }, delayMs);
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function printReceipt(data: ReceiptData): Promise<void> {
  // 1. Try Bluetooth first — if it works, we're done
  const printedViaBluetooth = await printViaBluetooth(data);
  if (printedViaBluetooth) return;

  // 2. Build HTML and fall back to iframe/window.print()
  const s    = mergeReceiptSettings(data.settings);
  const html = buildReceiptHtml(data);
  printViaIframe(html, s.printDelayMs);
}
