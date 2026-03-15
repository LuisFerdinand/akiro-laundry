// components/employee/PrintReceipt.tsx
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";
import type { OrderFormData, OrderPriceBreakdown } from "@/lib/utils/order-form";

export interface ReceiptData {
  orderNumber:   string;
  createdAt:     Date;
  formData:      OrderFormData;
  services:      ServicePricing[];
  soaps:         Soap[];
  pewangis:      Pewangi[];
  breakdown:     OrderPriceBreakdown;
  paymentMethod?: string;
  amountPaid?:   number;
  changeGiven?:  number;
}

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

/** Fetch an image from the same origin and return a base64 data URL */
async function toDataURL(src: string): Promise<string> {
  const res  = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror  = reject;
    reader.readAsDataURL(blob);
  });
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const {
    orderNumber, createdAt, formData,
    services, soaps, pewangis, breakdown,
    paymentMethod, amountPaid, changeGiven,
  } = data;

  /* ── Convert logo to embeddable base64 ────────────────────────────── */
  let logoSrc = "";
  try {
    logoSrc = await toDataURL("/logo/2.png");
  } catch {
    // Logo failed to load — receipt still prints without it
  }

  /* ── Per-item rows ─────────────────────────────────────────────────── */
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

  /* ── Payment rows ──────────────────────────────────────────────────── */
  const methodLabel: Record<string, string> = {
    cash:     "Cash",
    transfer: "Transfer",
    qris:     "QRIS",
  };

  const paymentRows = amountPaid != null ? `
    <tr class="payment-row">
      <td>Payment Method</td>
      <td class="right">${methodLabel[paymentMethod ?? ""] ?? paymentMethod ?? "—"}</td>
    </tr>
    <tr class="payment-row">
      <td>Amount Paid</td>
      <td class="right">${formatUSD(amountPaid)}</td>
    </tr>
    ${changeGiven != null && changeGiven > 0 ? `
    <tr class="payment-row change">
      <td>Change</td>
      <td class="right">${formatUSD(changeGiven)}</td>
    </tr>` : ""}
  ` : "";

  /* ── Full receipt HTML ─────────────────────────────────────────────── */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt - ${orderNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    font-size: 11px;
    color: #111;
    background: white;
    width: 80mm;
    padding: 4mm 5mm 10mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Header ── */
  .header { text-align: center; padding-bottom: 6px; }
  .logo-img {
    width: 56px;
    height: 56px;
    object-fit: contain;
    margin-bottom: 5px;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  .shop-name {
    font-size: 15px; font-weight: 700;
    letter-spacing: 0.06em; color: #0f2744;
    text-transform: uppercase;
  }
  .shop-sub {
    font-size: 8.5px; letter-spacing: 0.20em;
    color: #607080; text-transform: uppercase; margin-top: 1px;
  }
  .shop-addr {
    font-size: 9px; color: #607080;
    margin-top: 4px; line-height: 1.55;
  }

  /* ── Dividers ── */
  .dashed { border: none; border-top: 1px dashed #aaa; margin: 6px 0; }
  .solid  { border: none; border-top: 1px solid  #333; margin: 6px 0; }
  .double { border: none; border-top: 3px double #333; margin: 6px 0; }

  /* ── Meta rows ── */
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .meta td { padding: 1.5px 0; font-size: 10px; vertical-align: top; }
  .meta .label { color: #607080; width: 36%; }
  .meta .colon { width: 5%; }
  .meta .value { font-weight: 600; word-break: break-word; }

  /* ── Order number ── */
  .order-num-label {
    font-size: 8px; letter-spacing: 0.2em;
    text-transform: uppercase; color: #607080;
    text-align: center; margin-bottom: 3px;
  }
  .order-num {
    text-align: center; font-size: 14px; font-weight: 700;
    letter-spacing: 0.14em; padding: 5px 0;
    background: #f0f7fd; border: 1px solid #b6def5;
    border-radius: 5px; color: #0f5a85; margin-bottom: 5px;
  }

  /* ── Items ── */
  table.items { width: 100%; border-collapse: collapse; }
  .item-name   { font-weight: 700; font-size: 11px; padding: 3px 0 1px; }
  .item-detail { font-size: 10px; color: #334155; padding: 0 0 2px 6px; }
  .item-detail.addon { color: #607080; }
  .item-price  {
    font-size: 10px; text-align: right;
    color: #334155; vertical-align: top; padding: 0 0 2px; white-space: nowrap;
  }
  .subtotal-label {
    font-size: 10px; font-weight: 600;
    padding: 2px 0 4px 6px; color: #0f5a85;
  }
  .subtotal-value {
    font-size: 10px; font-weight: 700;
    text-align: right; color: #0f5a85; padding: 2px 0 4px;
    white-space: nowrap;
  }

  /* ── Total ── */
  .total-row { width: 100%; border-collapse: collapse; }
  .total-row td { padding: 3px 0; }
  .total-label { font-size: 13px; font-weight: 700; }
  .total-value {
    font-size: 15px; font-weight: 700;
    text-align: right; color: #0f5a85; white-space: nowrap;
  }

  /* ── Payment ── */
  .payment-row td { font-size: 10px; padding: 1.5px 0; }
  .payment-row .right {
    text-align: right; font-weight: 600; white-space: nowrap;
  }
  .change td { color: #15803d; font-weight: 700; }
  .unpaid td { color: #d97706; font-weight: 700; font-size: 10.5px; }

  /* ── Notes ── */
  .notes-label {
    font-size: 8.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em;
    color: #607080; margin-bottom: 3px;
  }
  .notes-box {
    background: #f8fafc; border: 1px dashed #94a3b8;
    border-radius: 4px; padding: 5px 8px;
    font-size: 9.5px; color: #475569; line-height: 1.55;
  }

  /* ── Footer ── */
  .footer {
    text-align: center; margin-top: 10px;
    font-size: 9px; color: #94a3b8; line-height: 1.7;
  }
  .footer strong { color: #607080; font-weight: 700; }
  .footer .domain {
    display: inline-block; margin-top: 4px;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.06em; color: #1a7fba;
  }

  @media print {
    html, body { width: 80mm; }
    @page { size: 80mm auto; margin: 0; }
  }
</style>
</head>
<body>

<!-- ── Header ─────────────────────────────────────────────────────────── -->
<div class="header">
  ${logoSrc
    ? `<img src="${logoSrc}" alt="Akiro Laundry" class="logo-img" />`
    : ""
  }
  <div class="shop-name">Akiro Laundry</div>
  <div class="shop-sub">Kampu Alor &mdash; Timor-Leste</div>
  <div class="shop-addr">
    WA: +670 7675 8 7380<br/>
    akirolaundry.tl
  </div>
</div>

<hr class="solid" />

<!-- ── Order number ────────────────────────────────────────────────────── -->
<div class="order-num-label">Order Number</div>
<div class="order-num">${orderNumber}</div>

<!-- ── Customer meta ───────────────────────────────────────────────────── -->
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
  ${formData.customer.address ? `
  <tr>
    <td class="label">Address</td>
    <td class="colon">:</td>
    <td class="value">${formData.customer.address}</td>
  </tr>` : ""}
</table>

<hr class="dashed" />

<!-- ── Line items ──────────────────────────────────────────────────────── -->
<table class="items">
  ${itemRows}
</table>

<hr class="double" />

<!-- ── Grand total ────────────────────────────────────────────────────── -->
<table class="total-row">
  <tr>
    <td class="total-label">TOTAL</td>
    <td class="total-value">${formatUSD(breakdown.totalPrice)}</td>
  </tr>
</table>

<hr class="dashed" />

<!-- ── Payment status ─────────────────────────────────────────────────── -->
<table class="items">
  ${amountPaid != null ? paymentRows : `
  <tr class="unpaid">
    <td>&#9888; Unpaid</td>
    <td></td>
  </tr>`}
</table>

${formData.notes ? `
<hr class="dashed" />
<div class="notes-label">Notes</div>
<div class="notes-box">${formData.notes}</div>
` : ""}

<hr class="dashed" />

<!-- ── Footer ─────────────────────────────────────────────────────────── -->
<div class="footer">
  <strong>Thank you for your trust!</strong><br/>
  This receipt is your proof of transaction.<br/>
  Please keep it for laundry pickup.<br/>
  <span class="domain">akirolaundry.tl</span>
</div>

<script>
  window.onload = function () {
    window.focus();
    window.print();
    setTimeout(function () { window.close(); }, 800);
  };
</script>
</body>
</html>`;

  /* ── Hidden iframe print ───────────────────────────────────────────── */
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
  }, 600);
}