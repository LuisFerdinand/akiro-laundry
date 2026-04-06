// components/employee/PrintReceipt.tsx
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";
import type { OrderFormData, OrderPriceBreakdown } from "@/lib/utils/order-form";
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
  /** Pass the result of `getReceiptSettings()` — falls back to defaults if null */
  settings?:      ReceiptSettings | null;
}

// ─── Default settings (mirrors DB column defaults) ────────────────────────────
// Used as a fallback when no DB row exists yet.
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

/** Replace {{placeholder}} tokens in a template string */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function printReceipt(data: ReceiptData): Promise<void> {
  const {
    orderNumber, createdAt, formData,
    services, soaps, pewangis, breakdown,
    paymentMethod, amountPaid, changeGiven,
  } = data;

  // Merge DB settings over defaults so every key is always defined
  const s = { ...DEFAULTS, ...(data.settings ?? {}) };

  const notes = formData.notes?.trim() ?? "";

  // ── Derived font sizes ──────────────────────────────────────────────────────
  const base  = s.baseFontSizePx;
  const sm    = base - 1;   // 8px @ default
  const xs    = base - 2;   // 7px @ default
  const lg    = base + 2;   // 11px @ default
  const xl    = base + 3;   // 12px @ default

  /* ── Per-item rows ─────────────────────────────────────────────────────── */
  const itemRows = formData.items.map((item, i) => {
    const svc     = services.find((s) => s.id === item.servicePricingId);
    const soap    = soaps.find((s)    => s.id === item.soapId);
    const pewangi = pewangis.find((p) => p.id === item.pewangiId);
    const b       = breakdown.items[i];
    const isPerPcs = svc?.pricingUnit === "per_pcs";

    const qtyLine = isPerPcs
      ? `${item.quantity ?? 0} pcs × ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/pcs`
      : `${item.weightKg ?? 0} kg × ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/kg`;

    return `
      <tr>
        <td colspan="2" class="item-name">${svc?.name ?? "Service"}</td>
      </tr>
      <tr>
        <td class="item-detail">${qtyLine}</td>
        <td class="item-price">${formatUSD(b?.baseServiceCost ?? 0)}</td>
      </tr>
      ${soap ? `
      <tr>
        <td class="item-detail addon">+ Soap: ${soap.name}</td>
        <td class="item-price">${formatUSD(b?.soapCost ?? 0)}</td>
      </tr>` : ""}
      ${pewangi ? `
      <tr>
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

  /* ── Payment rows ──────────────────────────────────────────────────────── */
  const methodLabel: Record<string, string> = {
    cash:     "Cash",
    transfer: "Transfer",
    qris:     "QRIS",
  };

  const paymentRows = amountPaid != null ? `
    ${s.showPaymentMethod ? `
    <tr class="payment-row">
      <td>Payment Method</td>
      <td class="right">${methodLabel[paymentMethod ?? ""] ?? paymentMethod ?? "—"}</td>
    </tr>` : ""}
    ${s.showAmountPaid ? `
    <tr class="payment-row">
      <td>Amount Paid</td>
      <td class="right">${formatUSD(amountPaid)}</td>
    </tr>` : ""}
    ${s.showChangeGiven && changeGiven != null && changeGiven > 0 ? `
    <tr class="payment-row change">
      <td>Change</td>
      <td class="right">${formatUSD(changeGiven)}</td>
    </tr>` : ""}
  ` : "";

  /* ── Notes block ───────────────────────────────────────────────────────── */
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

  /* ── Header block ──────────────────────────────────────────────────────── */
  const logoHtml = (s.showLogo && s.logoUrl) ? `
    <div style="text-align:center;margin-bottom:4px;">
      <img src="${s.logoUrl}" alt="${s.logoAlt}"
           style="max-height:${s.logoMaxHeight};width:auto;display:inline-block;" />
    </div>
  ` : "";

  const shopNameHtml = s.showShopName ? `
    <div class="shop-name">${s.shopName}</div>
  ` : "";

  const taglineHtml = s.showTagline ? `
    <div class="shop-tagline">${s.shopTagline}</div>
  ` : "";

  /* ── Order number block ────────────────────────────────────────────────── */
  const orderNumHtml = s.showOrderNumber ? `
    <div class="order-num-label">Order Number</div>
    <div class="order-num">${orderNumber}</div>
  ` : "";

  /* ── Footer block ──────────────────────────────────────────────────────── */
  const footerHtml = s.showFooter ? `
    <hr class="dashed" />
    <div class="receipt-footer">
      <div class="footer-thankyou">
        ${interpolate(s.footerThankYou, { shopName: s.shopName })}
      </div>
      ${s.footerContact ? `<div class="footer-contact">${s.footerContact}</div>` : ""}
    </div>
  ` : "";

  /* ── Full receipt HTML ─────────────────────────────────────────────────── */
  const fontImport = s.fontImportUrl
    ? `@import url('${s.fontImportUrl}');`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt - ${orderNumber}</title>
<style>
  ${fontImport}

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: ${s.fontFamily};
    font-size: ${base}px;
    color: #111;
    background: white;
    width: ${s.paperWidth};
    padding: ${s.paperPadding};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Dividers ── */
  .dashed { border: none; border-top: 1px dashed #aaa; margin: 5px 0; }
  .double { border: none; border-top: 3px double #333; margin: 5px 0; }

  /* ── Shop header ── */
  .shop-name {
    text-align: center; font-size: ${lg}px; font-weight: 700;
    letter-spacing: 0.08em; margin-bottom: 1px;
  }
  .shop-tagline {
    text-align: center; font-size: ${xs}px; color: ${s.metaLabelColor};
    letter-spacing: 0.06em; margin-bottom: 4px;
  }

  /* ── Meta rows ── */
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
  .meta td { padding: 1px 0; font-size: ${sm}px; vertical-align: top; }
  .meta .label { color: ${s.metaLabelColor}; width: 34%; }
  .meta .colon { width: 5%; }
  .meta .value { font-weight: 600; word-break: break-word; }

  /* ── Order number ── */
  .order-num-label {
    font-size: ${xs}px; letter-spacing: 0.18em;
    text-transform: uppercase; color: ${s.metaLabelColor};
    text-align: center; margin-bottom: 2px;
  }
  .order-num {
    text-align: center; font-size: ${lg}px; font-weight: 700;
    letter-spacing: 0.12em; padding: 4px 0;
    background: ${s.accentBgColor}; border: 1px solid ${s.accentBorderColor};
    border-radius: 4px; color: ${s.accentColor}; margin-bottom: 4px;
  }

  /* ── Items ── */
  table.items { width: 100%; border-collapse: collapse; }
  .item-name   { font-weight: 700; font-size: ${base}px; padding: 2px 0 1px; }
  .item-detail { font-size: ${sm}px; color: #334155; padding: 0 0 1px 4px; }
  .item-detail.addon { color: ${s.metaLabelColor}; }
  .item-price  {
    font-size: ${sm}px; text-align: right;
    color: #334155; vertical-align: top; padding: 0 0 1px; white-space: nowrap;
  }
  .subtotal-label {
    font-size: ${sm}px; font-weight: 600;
    padding: 1px 0 3px 4px; color: ${s.accentColor};
  }
  .subtotal-value {
    font-size: ${sm}px; font-weight: 700;
    text-align: right; color: ${s.accentColor}; padding: 1px 0 3px;
    white-space: nowrap;
  }

  /* ── Total ── */
  .total-row { width: 100%; border-collapse: collapse; }
  .total-row td { padding: 2px 0; }
  .total-label { font-size: ${lg}px; font-weight: 700; }
  .total-value {
    font-size: ${xl}px; font-weight: 700;
    text-align: right; color: ${s.accentColor}; white-space: nowrap;
  }

  /* ── Payment ── */
  .payment-row td { font-size: ${sm}px; padding: 1px 0; }
  .payment-row .right { text-align: right; font-weight: 600; white-space: nowrap; }
  .change td  { color: ${s.changeColor}; font-weight: 700; }
  .unpaid td  { color: ${s.unpaidColor}; font-weight: 700; font-size: ${base}px; }

  /* ── Notes ── */
  .notes-section { margin: 2px 0; }
  .notes-header  { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
  .notes-icon    { font-size: ${base + 1}px; line-height: 1; }
  .notes-label   {
    font-size: ${xs + 0.5}px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em; color: #475569;
  }
  .notes-box {
    background: ${s.notesBgColor};
    border: 1px solid ${s.notesBorderColor};
    border-left: 3px solid ${s.notesAccentColor};
    border-radius: 3px;
    padding: 4px 6px; font-size: ${sm}px; color: ${s.notesTextColor};
    line-height: 1.5; word-break: break-word; white-space: pre-wrap;
  }

  /* ── Footer ── */
  .receipt-footer { text-align: center; margin-top: 2px; }
  .footer-thankyou {
    font-size: ${sm}px; font-weight: 700; margin-bottom: 2px;
  }
  .footer-contact { font-size: ${xs}px; color: ${s.metaLabelColor}; }
</style>
</head>
<body>

<!-- ── Shop header ── -->
${logoHtml}
${shopNameHtml}
${taglineHtml}

<hr class="dashed" />

<!-- ── Order number ── -->
${orderNumHtml}

<!-- ── Customer meta ── -->
<table class="meta">
  <tr>
    <td class="label">Date</td>
    <td class="colon">:</td>
    <td class="value">${formatDateTime(createdAt)}</td>
  </tr>
  <tr>
    <td class="label">Customer</td>
    <td class="colon">:</td>
    <td class="value">${formData.customer.name}</td>
  </tr>
  <tr>
    <td class="label">Phone</td>
    <td class="colon">:</td>
    <td class="value">${formData.customer.phone}</td>
  </tr>
  ${(s.showCustomerAddress && formData.customer.address) ? `
  <tr>
    <td class="label">Address</td>
    <td class="colon">:</td>
    <td class="value">${formData.customer.address}</td>
  </tr>` : ""}
</table>

<hr class="dashed" />

<!-- ── Line items ── -->
<table class="items">
  ${itemRows}
</table>

<hr class="double" />

<!-- ── Grand total ── -->
<table class="total-row">
  <tr>
    <td class="total-label">TOTAL</td>
    <td class="total-value">${formatUSD(breakdown.totalPrice)}</td>
  </tr>
</table>

<hr class="dashed" />

<!-- ── Payment status ── -->
<table class="items">
  ${amountPaid != null ? paymentRows : `
  <tr class="unpaid">
    <td>&#9888; Unpaid</td>
    <td></td>
  </tr>`}
</table>

${notesBlock}

${footerHtml}

</body>
</html>`;

  /* ── Hidden iframe print ───────────────────────────────────────────────── */
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => { document.body.removeChild(iframe); }, 2000);
  }, s.printDelayMs);
}