// components/employee/WhatsAppNotify.tsx
"use client";

import { MessageCircle } from "lucide-react";
import { ORDER_STATUS_LABELS, formatUSD } from "@/lib/utils/order-form";
import { parseE164, digitsOnly } from "@/lib/utils/phone";
import type { Order } from "@/lib/db/schema";

export interface WhatsAppNotifyProps {
  /** Customer's WhatsApp number (local or E.164) */
  customerPhone: string;
  customerName: string;
  orderNumber: string;
  /** Comma-separated service names or a single name */
  servicesSummary: string;
  status: Order["status"];
  paymentStatus: "paid" | "unpaid";
  totalPrice: number;
  /** Optional: notes from the order */
  notes?: string | null;
  /** Render as icon-only button (for tight layouts) */
  compact?: boolean;
  className?: string;
}

export function WhatsAppNotify({
  customerPhone,
  customerName,
  orderNumber,
  servicesSummary,
  status,
  paymentStatus,
  totalPrice,
  notes,
  compact = false,
  className,
}: WhatsAppNotifyProps) {
  const handleSend = () => {
    const statusLabel    = ORDER_STATUS_LABELS[status] ?? status;
    const formattedPrice = formatUSD(isNaN(totalPrice) ? 0 : totalPrice);
    const isPaid         = paymentStatus === "paid";

    // ── Payment line (Tetum) ──────────────────────────────────────────────
    const paymentLine = isPaid
      ? `✅ *Pagamentu:* Kompletu ona`
      : `⚠️ *Pagamentu:* Seidauk selu — favor prepara ${formattedPrice} bainhira mai foti`;

    // ── Status-specific body (Tetum) ──────────────────────────────────────
    const statusBody: Record<Order["status"], string[]> = {
      pending: [
        `📋 Ita-nia pedidu hela *simu no rejista* ona.`,
        `Ami sei hahú prosesu roupa ita-nia lalais.`,
      ],
      processing: [
        `🫧 Ita-nia pedidu iha *prosesu fase* agora.`,
        `Ami sei hateten fali bainhira remata ona.`,
      ],
      done: [
        ``,
        `╔══════════════════════════╗`,
        `║  ✅  ROUPA PRONTU FOTI   ║`,
        `╚══════════════════════════╝`,
        ``,
        `Ita-nia pedidu *remata ona* no prontu atu foti.`,
        isPaid
          ? `Favor mai foti lalais. Obrigadu! 🙏`
          : `Favor prepara pagamentu *${formattedPrice}* bainhira mai foti. 🙏`,
      ],
      picked_up: [
        ``,
        `╔══════════════════════════╗`,
        `║  🎉  PEDIDU REMATA!      ║`,
        `╚══════════════════════════╝`,
        ``,
        `Ita-nia pedidu *foti ona*. Obrigadu tan uza ami-nia servisu!`,
      ],
    };

    const bodyLines = statusBody[status] ?? [`📦 *Estadu:* ${statusLabel}`];

    // ── Notes block (Tetum) ───────────────────────────────────────────────
    const trimmedNotes = notes?.trim();
    const notesLines = trimmedNotes
      ? [
          ``,
          `─────────────────────────`,
          `📝 *NOTA ESPESIAL*`,
          `─────────────────────────`,
          trimmedNotes,
        ]
      : [];

    // ── Full message ──────────────────────────────────────────────────────
    const lines = [
      `Respeitu *${customerName}*,`,
      ``,
      `Ami husi *Akiro Laundry* hakarak informa kona-ba ita-nia pedidu foun.`,
      ``,
      `─────────────────────────`,
      `🧾 *DETALLU PEDIDU*`,
      `─────────────────────────`,
      `📌 *N.º Pedidu:*  ${orderNumber}`,
      `👕 *Servisu:*     ${servicesSummary}`,
      `📦 *Estadu:*      *${statusLabel}*`,
      `💰 *Total:*       ${formattedPrice}`,
      ``,
      paymentLine,
      ``,
      `─────────────────────────`,
      ...bodyLines,
      ...notesLines,
      ``,
      `─────────────────────────`,
      `Akiro Laundry`,
      `📞 +670 7675 8 7380`,
      `🌐 akirolaundry.tl`,
    ];

    const message = lines.join("\n");

    // Use the stored E.164 country code if available; otherwise strip non-digits
    // and fall back to raw digits (handles legacy bare numbers without injecting a prefix).
    const parsed     = parseE164(customerPhone);
    const normalized = parsed
      ? `${parsed.country.code}${parsed.localNumber}`  // e.g. "67078234567"
      : customerPhone.replace(/\D/g, "").replace(/^0+/, "");  // bare fallback
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSend}
        title="Haruka notifikasaun WhatsApp"
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "7px",
          borderWidth: "1.5px",
          borderStyle: "solid",
          borderColor: "#86efac",
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          color: "#16a34a",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#4ade80";
          e.currentTarget.style.boxShadow   = "0 2px 10px rgba(22,163,74,0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#86efac";
          e.currentTarget.style.boxShadow   = "none";
        }}
      >
        <MessageCircle size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        height: 44,
        paddingLeft: 16,
        paddingRight: 16,
        borderRadius: "7px",
        borderWidth: "1.5px",
        borderStyle: "solid",
        borderColor: "#86efac",
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        color: "#16a34a",
        fontWeight: 800,
        fontSize: "13px",
        whiteSpace: "nowrap",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#4ade80";
        e.currentTarget.style.boxShadow   = "0 2px 10px rgba(22,163,74,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#86efac";
        e.currentTarget.style.boxShadow   = "none";
      }}
    >
      <MessageCircle size={14} />
      WA Notify
    </button>
  );
}