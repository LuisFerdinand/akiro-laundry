// components/employee/OrderStatusUpdater.tsx
"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2, Loader2, RefreshCw,
  Clock, Waves, PackageCheck, ShoppingBag,
  MessageCircle, Save,
} from "lucide-react";
import { updateOrderStatus } from "@/lib/actions/orders";
import { ORDER_STATUS_LABELS, formatUSD } from "@/lib/utils/order-form";
import type { Order } from "@/lib/db/schema";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUSES: {
  value:       Order["status"];
  label:       string;
  Icon:        React.ElementType;
  activeBg:    string;
  activeBorder:string;
  activeText:  string;
  activeIcon:  string;
  activeBar:   string;
}[] = [
  {
    value:        "pending",
    label:        "Pending",
    Icon:         Clock,
    activeBg:     "#f8fafc",
    activeBorder: "#64748b",
    activeText:   "#334155",
    activeIcon:   "#64748b",
    activeBar:    "linear-gradient(180deg, #64748b 0%, #94a3b8 100%)",
  },
  {
    value:        "processing",
    label:        "Processing",
    Icon:         Waves,
    activeBg:     "#edf7fd",
    activeBorder: "#1a7fba",
    activeText:   "#0f5a85",
    activeIcon:   "#1a7fba",
    activeBar:    "linear-gradient(180deg, #1a7fba 0%, #2496d6 100%)",
  },
  {
    value:        "done",
    label:        "Done",
    Icon:         PackageCheck,
    activeBg:     "#f0fdf4",
    activeBorder: "#16a34a",
    activeText:   "#14532d",
    activeIcon:   "#16a34a",
    activeBar:    "linear-gradient(180deg, #16a34a 0%, #22c55e 100%)",
  },
  {
    value:        "picked_up",
    label:        "Picked Up",
    Icon:         ShoppingBag,
    activeBg:     "#fffbeb",
    activeBorder: "#d97706",
    activeText:   "#78350f",
    activeIcon:   "#d97706",
    activeBar:    "linear-gradient(180deg, #d97706 0%, #f59e0b 100%)",
  },
];

// ── Props ──────────────────────────────────────────────────────────────────────
interface OrderStatusUpdaterProps {
  orderId:       number;
  currentStatus: Order["status"];
  // Pass order info for WA message
  orderNumber:   string;
  customerName:  string;
  customerPhone: string;
  totalPrice:    string | number;
  serviceName:   string;
}

export function OrderStatusUpdater({
  orderId,
  currentStatus,
  orderNumber,
  customerName,
  customerPhone,
  totalPrice,
  serviceName,
}: OrderStatusUpdaterProps) {
  const [status,    setStatus]       = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error,     setError]        = useState<string | null>(null);
  const [saved,     setSaved]        = useState(false);

  const isDirty = status !== currentStatus;

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (result.success) setSaved(true);
      else setError(result.error ?? "Failed to update.");
    });
  };

  const handleWhatsApp = () => {
    const statusLabel = ORDER_STATUS_LABELS[status];
    const price = typeof totalPrice === "string" ? parseFloat(totalPrice) : totalPrice;
    const formattedPrice = formatUSD(isNaN(price) ? 0 : price);

    const message = [
      `Halo *${customerName}*! 👋`,
      ``,
      `Berikut update pesanan laundry Anda:`,
      ``,
      `🧾 *No. Order:* ${orderNumber}`,
      `👕 *Layanan:* ${serviceName}`,
      `📦 *Status:* *${statusLabel}*`,
      `💰 *Total:* ${formattedPrice}`,
      ``,
      `Terima kasih telah menggunakan layanan kami! 🙏`,
    ].join("\n");

    // Normalize phone: strip non-digits, replace leading 0 with 62
    const normalized = customerPhone
      .replace(/\D/g, "")
      .replace(/^0/, "62");

    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: "6px",
            background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
            border: "1.5px solid #b6def5",
          }}
        >
          <RefreshCw size={12} style={{ color: "#1a7fba" }} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>
          Update Status
        </p>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-2">
        {STATUSES.map((s) => {
          const active = status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => { setStatus(s.value); setSaved(false); }}
              className="transition-all duration-150 active:scale-[0.97]"
              style={{
                display: "flex",
                alignItems: "stretch",
                borderRadius: "7px",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: active ? s.activeBorder : "#e2e8f0",
                background: active ? s.activeBg : "white",
                boxShadow: active ? `0 2px 10px ${s.activeBorder}22` : "0 1px 3px rgba(0,0,0,0.04)",
                overflow: "hidden",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = s.activeBorder + "66";
                  e.currentTarget.style.background = s.activeBg + "88";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "white";
                }
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  width: "3px",
                  flexShrink: 0,
                  background: active ? s.activeBar : "transparent",
                  transition: "background 0.15s",
                }}
              />
              <div className="flex items-center gap-2.5 px-3 py-2.5 flex-1">
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "6px",
                    background: active ? s.activeBorder + "18" : "#f8fafc",
                    border: `1.5px solid ${active ? s.activeBorder + "44" : "#e2e8f0"}`,
                  }}
                >
                  <s.Icon size={13} style={{ color: active ? s.activeIcon : "#94a3b8" }} />
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: active ? s.activeText : "#94a3b8" }}
                >
                  {s.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fff1f2",
            border: "1.5px solid #fda4af",
            borderRadius: "6px",
            padding: "8px 12px",
          }}
        >
          <p className="text-xs font-semibold" style={{ color: "#be123c" }}>{error}</p>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex gap-2">
        {/* WhatsApp button */}
        <button
          type="button"
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97]"
          style={{
            height: 44,
            paddingLeft: 14,
            paddingRight: 14,
            borderRadius: "7px",
            borderWidth: "1.5px",
            borderStyle: "solid",
            borderColor: "#86efac",
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            color: "#16a34a",
            fontWeight: 800,
            fontSize: "13px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#4ade80";
            e.currentTarget.style.boxShadow = "0 2px 10px rgba(22,163,74,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#86efac";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <MessageCircle size={14} />
          WA
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="flex flex-1 items-center justify-center gap-2 font-black text-sm text-white transition-all duration-150 active:scale-[0.97]"
          style={{
            height: 44,
            borderRadius: "7px",
            background: isPending || !isDirty
              ? "#94a3b8"
              : "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)",
            boxShadow: isPending || !isDirty
              ? "none"
              : "0 4px 14px rgba(26,127,186,0.35)",
            border: "none",
            cursor: isPending || !isDirty ? "not-allowed" : "pointer",
            opacity: isPending || !isDirty ? 0.6 : 1,
          }}
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={14} /> Saved!</>
          ) : (
            <><Save size={14} /> Save Status</>
          )}
        </button>
      </div>
    </div>
  );
}