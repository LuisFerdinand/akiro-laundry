// lib/utils/escpos-receipt.ts
import { ESC_POS } from "./bluetooth-printer";
import type { ReceiptData } from "@/components/employee/PrintReceipt";

function toBytes(commands: (number[] | string)[]): Uint8Array {
  const encoder = new TextEncoder();
  const arrays: Uint8Array[] = commands.map((cmd) =>
    typeof cmd === "string" ? encoder.encode(cmd) : new Uint8Array(cmd)
  );
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function padLine(left: string, right: string, width = 32): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right + "\n";
}

export function buildEscPosReceipt(data: ReceiptData): Uint8Array {
  const { orderNumber, createdAt, formData, services,
          soaps, pewangis, breakdown, paymentMethod,
          amountPaid, changeGiven } = data;

  const s = data.settings;
  const shopName = s?.shopName ?? "Akiro Laundry";

  const commands: (number[] | string)[] = [
    ESC_POS.INIT,
    ESC_POS.ALIGN_CENTER,
    ESC_POS.BOLD_ON,
    ESC_POS.DOUBLE_HEIGHT,
    `${shopName}\n`,
    ESC_POS.NORMAL_SIZE,
    ESC_POS.BOLD_OFF,
    `${s?.shopTagline ?? "Premium Laundry & Perfume Service"}\n`,
    ESC_POS.DASHED_LINE,

    // Order number
    ESC_POS.BOLD_ON,
    `Order: ${orderNumber}\n`,
    ESC_POS.BOLD_OFF,

    ESC_POS.ALIGN_LEFT,
    `Date    : ${new Intl.DateTimeFormat("en-US", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Dili",
    }).format(createdAt)}\n`,
    `Customer: ${formData.customer.name}\n`,
    `Phone   : ${formData.customer.phone}\n`,
    ESC_POS.DASHED_LINE,

    // Line items
    ...formData.items.flatMap((item, i) => {
      const svc     = services.find((sv) => sv.id === item.servicePricingId);
      const soap    = soaps.find((so)    => so.id === item.soapId);
      const pewangi = pewangis.find((p)  => p.id === item.pewangiId);
      const b       = breakdown.items[i];
      const isPerPcs = svc?.pricingUnit === "per_pcs";

      const qtyLine = isPerPcs
        ? `  ${item.quantity}pcs x ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/pcs`
        : `  ${item.weightKg}kg x ${formatUSD(parseFloat(svc?.basePricePerKg ?? "0"))}/kg`;

      return [
        ESC_POS.BOLD_ON,
        `${svc?.name ?? "Service"}\n`,
        ESC_POS.BOLD_OFF,
        `${padLine(qtyLine, formatUSD(b?.baseServiceCost ?? 0))}`,
        ...(soap    ? [`${padLine(`  +Soap: ${soap.name}`,      formatUSD(b?.soapCost    ?? 0))}`] : []),
        ...(pewangi ? [`${padLine(`  +Frag: ${pewangi.name}`,   formatUSD(b?.pewangiCost ?? 0))}`] : []),
        padLine("  Subtotal", formatUSD(b?.subtotal ?? 0)),
      ];
    }),

    ESC_POS.DASHED_LINE,

    // Total
    ESC_POS.BOLD_ON,
    ESC_POS.DOUBLE_HEIGHT,
    ESC_POS.ALIGN_CENTER,
    `TOTAL: ${formatUSD(breakdown.totalPrice)}\n`,
    ESC_POS.NORMAL_SIZE,
    ESC_POS.BOLD_OFF,
    ESC_POS.ALIGN_LEFT,
    ESC_POS.DASHED_LINE,

    // Payment
    ...(amountPaid != null ? [
      padLine("Payment", paymentMethod ?? "—"),
      padLine("Amount Paid", formatUSD(amountPaid)),
      ...(changeGiven && changeGiven > 0
        ? [padLine("Change", formatUSD(changeGiven))]
        : []),
    ] : ["  ⚠ UNPAID\n"]),

    // Notes
    ...(formData.notes?.trim() ? [
      ESC_POS.DASHED_LINE,
      "Note:\n",
      `${formData.notes.trim()}\n`,
    ] : []),

    // Footer
    ESC_POS.DASHED_LINE,
    ESC_POS.ALIGN_CENTER,
    `Thank you for choosing ${shopName}!\n`,
    `${s?.footerContact ?? ""}\n`,

    // Feed & cut
    "\n\n\n",
    ESC_POS.CUT_PAPER,
  ];

  return toBytes(commands);
}