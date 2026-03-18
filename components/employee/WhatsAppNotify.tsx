// components/employee/WhatsAppNotify.tsx
"use client";

import { MessageCircle } from "lucide-react";
import { ORDER_STATUS_LABELS, formatUSD } from "@/lib/utils/order-form";
import { parseE164 } from "@/lib/utils/phone";
import type { Order } from "@/lib/db/schema";

export interface WhatsAppNotifyProps {
  /** Customer's WhatsApp number (local or E.164) */
  customerPhone:   string;
  customerName:    string;
  orderNumber:     string;
  /** Comma-separated service names or a single name */
  servicesSummary: string;
  status:          Order["status"];
  paymentStatus:   "paid" | "unpaid";
  totalPrice:      number;
  /** Optional: notes from the order */
  notes?:          string | null;
  /** Base URL of the site — used to build the review link */
  siteUrl?:        string;
  /** Render as icon-only button (for tight layouts) */
  compact?:        boolean;
  className?:      string;
}

// ── Review page path ──────────────────────────────────────────────────────────
const REVIEW_PATH = "/review";

// ── Status body lines (Tetum) ─────────────────────────────────────────────────
const STATUS_BODY: Record<Order["status"], string[]> = {
  pending: [
    `📋 Ita-nia pedidu ami *simu no rejista* ona.`,
    `Ami sei hahú prosesu ropa ita-nia ho lalais.`,
  ],
  processing: [
    `🫧 Ita-nia pedidu iha *prosesu fase* agora.`,
    `Ami sei hateten fali bainhira remata ona.`,
  ],
  done: [
    `✅ Ita-nia pedidu *remata ona* no prontu atu foti.`,
    `Favor mai foti lalais. Obrigadu! 🙏`,
  ],
  picked_up: [
    `🎉 Ita-nia pedidu *foti ona*. Obrigadu tan uza ami-nia servisu!`,
  ],
};

// ── Payment line (Tetum) ──────────────────────────────────────────────────────
function paymentLine(isPaid: boolean, formattedPrice: string): string {
  return isPaid
    ? `✅ *Pagamentu:* Kompletu ona`
    : `⚠️ *Pagamentu:* Seidauk selu — favor prepara ${formattedPrice} bainhira mai foti`;
}

// ── Build the full WA message ─────────────────────────────────────────────────
function buildMessage({
  customerName,
  orderNumber,
  servicesSummary,
  status,
  paymentStatus,
  totalPrice,
  notes,
  reviewUrl,
}: {
  customerName:    string;
  orderNumber:     string;
  servicesSummary: string;
  status:          Order["status"];
  paymentStatus:   "paid" | "unpaid";
  totalPrice:      number;
  notes?:          string | null;
  reviewUrl:       string;
}): string {
  const statusLabel    = ORDER_STATUS_LABELS[status] ?? status;
  const formattedPrice = formatUSD(isNaN(totalPrice) ? 0 : totalPrice);
  const isPaid         = paymentStatus === "paid";
  const bodyLines      = STATUS_BODY[status] ?? [`📦 *Status:* ${statusLabel}`];
  const trimmedNotes   = notes?.trim();

  const lines: string[] = [
    // Greeting
    `Ola Sr/a *${customerName}*,`,
    `Ami husi *Akiro Laundry* hakarak informa kona-ba ita-nia pedidu foun.`,
    `─────────────────────────`,

    // Order detail block
    `🧾 *DETALLU PEDIDU*`,
    `─────────────────────────`,
    `📌 *N.º Pedidu:*  ${orderNumber}`,
    `👕 *Servisu:*     ${servicesSummary}`,
    `📦 *Status:*      *${statusLabel}*`,
    `💰 *Total:*       ${formattedPrice}`,
    paymentLine(isPaid, formattedPrice),
    `─────────────────────────`,

    // Status-specific body
    ...bodyLines,
  ];

  // Optional notes block
  if (trimmedNotes) {
    lines.push(
      `─────────────────────────`,
      `📝 *NOTA ESPESIAL*`,
      `─────────────────────────`,
      trimmedNotes,
    );
  }

  // Footer + review link
  lines.push(
    `─────────────────────────`,
    `Akiro Laundry`,
    `📞 +670 7675 8 7380`,
    `🌐 akirolaundry.com`,
    ``,
    `─────────────────────────`,
    `⭐ *Kontenti ho ami-nia servisu?*`,
    `Husik review ida iha: ${reviewUrl}`,
    `Obrigadu barak! 🙏`,
  );

  return lines.join("\n");
}

// ── Shared button styles ──────────────────────────────────────────────────────
const baseStyle: React.CSSProperties = {
  display:         "flex",
  alignItems:      "center",
  justifyContent:  "center",
  borderRadius:    "7px",
  borderWidth:     "1.5px",
  borderStyle:     "solid",
  borderColor:     "#86efac",
  background:      "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  color:           "#16a34a",
  cursor:          "pointer",
  transition:      "all 0.15s",
};

function onEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "#4ade80";
  e.currentTarget.style.boxShadow   = "0 2px 10px rgba(22,163,74,0.18)";
}
function onLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "#86efac";
  e.currentTarget.style.boxShadow   = "none";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WhatsAppNotify({
  customerPhone,
  customerName,
  orderNumber,
  servicesSummary,
  status,
  paymentStatus,
  totalPrice,
  notes,
  siteUrl,
  compact = false,
  className,
}: WhatsAppNotifyProps) {
  const handleSend = () => {
    // Build review URL — use siteUrl prop if provided, otherwise window.location.origin
    const origin    = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "https://akirolaundry.com");
    const reviewUrl = `${origin}${REVIEW_PATH}`;

    const message = buildMessage({
      customerName,
      orderNumber,
      servicesSummary,
      status,
      paymentStatus,
      totalPrice,
      notes,
      reviewUrl,
    });

    // Normalise phone number
    const parsed     = parseE164(customerPhone);
    const normalized = parsed
      ? `${parsed.country.code}${parsed.localNumber}`
      : customerPhone.replace(/\D/g, "").replace(/^0+/, "");

    window.open(
      `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  // ── Compact (icon only) ───────────────────────────────────────────────────
  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSend}
        title="Haruka notifikasaun WhatsApp"
        className={className}
        style={{ ...baseStyle, width: 44, height: 44, flexShrink: 0 }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <MessageCircle size={16} />
      </button>
    );
  }

  // ── Full button ───────────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleSend}
      className={className}
      style={{
        ...baseStyle,
        gap:         "8px",
        height:      44,
        paddingLeft: 16,
        paddingRight: 16,
        fontWeight:  800,
        fontSize:    "13px",
        whiteSpace:  "nowrap",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <MessageCircle size={14} />
      WA Notify
    </button>
  );
}