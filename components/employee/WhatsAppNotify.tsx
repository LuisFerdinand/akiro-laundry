// components/employee/WhatsAppNotify.tsx
"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { ORDER_STATUS_LABELS, formatUSD } from "@/lib/utils/order-form";
import { parseE164 } from "@/lib/utils/phone";
import type { Order } from "@/lib/db/schema";
import type { WaTemplateData } from "@/lib/actions/wa-templates";

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
  /** Pre-fetched template data from the server (avoids client-side fetch) */
  templateData?:   WaTemplateData | null;
  /** Render as icon-only button (for tight layouts) */
  compact?:        boolean;
  className?:      string;
}

// ── Review page path ──────────────────────────────────────────────────────────
const REVIEW_PATH = "/review";

// ── Hardcoded fallbacks (used when DB templates aren't available) ──────────────
const FALLBACK_STATUS_BODY: Record<Order["status"], string> = {
  pending:
    "📋 Ita-nia pedidu ami *simu no rejista* ona.\nAmi sei hahú prosesu ropa ita-nia ho lalais.",
  processing:
    "🫧 Ita-nia pedidu iha *prosesu fase* agora.\nAmi sei hateten fali bainhira remata ona.",
  done:
    "✅ Ita-nia pedidu *remata ona* no prontu atu foti.\nFavor mai foti lalais. Obrigadu! 🙏",
  picked_up:
    "🎉 Ita-nia pedidu *foti ona*. Obrigadu tan uza ami-nia servisu!",
};

// ── Variable interpolation ────────────────────────────────────────────────────
function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
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
  templateData,
}: {
  customerName:    string;
  orderNumber:     string;
  servicesSummary: string;
  status:          Order["status"];
  paymentStatus:   "paid" | "unpaid";
  totalPrice:      number;
  notes?:          string | null;
  reviewUrl:       string;
  templateData?:   WaTemplateData | null;
}): string {
  const statusLabel    = ORDER_STATUS_LABELS[status] ?? status;
  const formattedPrice = formatUSD(isNaN(totalPrice) ? 0 : totalPrice);
  const isPaid         = paymentStatus === "paid";
  const trimmedNotes   = notes?.trim();

  // If we have DB templates, use them; otherwise fall back to hardcoded
  const settings = templateData?.settings;

  const vars: Record<string, string> = {
    customerName,
    orderNumber,
    servicesSummary,
    statusLabel,
    totalPrice:    formattedPrice,
    reviewUrl,
    businessName:  settings?.businessName  ?? "Akiro Laundry",
    businessPhone: settings?.businessPhone ?? "+670 7675 8 7380",
    businessUrl:   settings?.businessUrl   ?? "akirolaundry.com",
  };

  const sep = settings?.separator ?? "─────────────────────────";

  // ── Greeting ────────────────────────────────────────────────────────────────
  const greeting = settings?.greetingTemplate
    ? interpolate(settings.greetingTemplate, vars)
    : `Ola Sr/a *${customerName}*,\nAmi husi *Akiro Laundry* hakarak informa kona-ba ita-nia pedidu foun.`;

  // ── Order detail header ─────────────────────────────────────────────────────
  const detailHeader = settings?.orderDetailHeader ?? "🧾 *DETALLU PEDIDU*";

  // ── Payment line ────────────────────────────────────────────────────────────
  const paymentLine = isPaid
    ? interpolate(settings?.paymentPaidTemplate ?? "✅ *Pagamentu:* Kompletu ona", vars)
    : interpolate(
        settings?.paymentUnpaidTemplate ??
          "⚠️ *Pagamentu:* Seidauk selu — favor prepara {{totalPrice}} bainhira mai foti",
        vars,
      );

  // ── Status body ─────────────────────────────────────────────────────────────
  const bodyRaw =
    templateData?.statusTemplates[status] ??
    FALLBACK_STATUS_BODY[status] ??
    `📦 *Status:* ${statusLabel}`;
  const bodyText = interpolate(bodyRaw, vars);

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footer = settings?.footerTemplate
    ? interpolate(settings.footerTemplate, vars)
    : `Akiro Laundry\n📞 +670 7675 8 7380\n🌐 akirolaundry.com`;

  // ── Review CTA ──────────────────────────────────────────────────────────────
  const reviewCta = settings?.reviewCtaTemplate
    ? interpolate(settings.reviewCtaTemplate, vars)
    : `⭐ *Kontenti ho ami-nia servisu?*\nHusik review ida iha: ${reviewUrl}\nObrigadu barak! 🙏`;

  // ── Notes header ────────────────────────────────────────────────────────────
  const notesHeader = settings?.notesSectionHeader ?? "📝 *NOTA ESPESIAL*";

  // ── Assemble message ────────────────────────────────────────────────────────
  const lines: string[] = [
    greeting,
    sep,
    "",
    detailHeader,
    sep,
    `📌 *N.º Pedidu:*  ${orderNumber}`,
    `👕 *Servisu:*     ${servicesSummary}`,
    `📦 *Status:*      *${statusLabel}*`,
    `💰 *Total:*       ${formattedPrice}`,
    paymentLine,
    sep,
    "",
    bodyText,
  ];

  if (trimmedNotes) {
    lines.push("", sep, notesHeader, sep, trimmedNotes);
  }

  lines.push("", sep, footer, "", sep, reviewCta);

  return lines.join("\n");
}

// ── Shared button styles ──────────────────────────────────────────────────────
const baseStyle: React.CSSProperties = {
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  borderRadius:   "7px",
  borderWidth:    "1.5px",
  borderStyle:    "solid",
  borderColor:    "#86efac",
  background:     "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  color:          "#16a34a",
  cursor:         "pointer",
  transition:     "all 0.15s",
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
  templateData,
  compact = false,
  className,
}: WhatsAppNotifyProps) {
  const handleSend = () => {
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
      templateData,
    });

    const parsed     = parseE164(customerPhone);
    const normalized = parsed
      ? `${parsed.country.code}${parsed.localNumber}`
      : customerPhone.replace(/\D/g, "").replace(/^0+/, "");

    window.open(
      `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

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

  return (
    <button
      type="button"
      onClick={handleSend}
      className={className}
      style={{
        ...baseStyle,
        gap:          "8px",
        height:       44,
        paddingLeft:  16,
        paddingRight: 16,
        fontWeight:   800,
        fontSize:     "13px",
        whiteSpace:   "nowrap",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <MessageCircle size={14} />
      WA Notify
    </button>
  );
}