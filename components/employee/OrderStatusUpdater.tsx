// components/employee/OrderStatusUpdater.tsx
"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2, Loader2, RefreshCw,
  Clock, Waves, PackageCheck, ShoppingBag,
  Save, CreditCard, BadgeCheck, AlertTriangle,
} from "lucide-react";
import { updateOrderStatus } from "@/lib/actions/orders";
import { formatUSD } from "@/lib/utils/order-form";
import type { Order } from "@/lib/db/schema";
import { PaymentModal } from "./PaymentModal";
import { WhatsAppNotify } from "./WhatsAppNotify";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUSES: {
  value:        Order["status"];
  label:        string;
  Icon:         React.ElementType;
  activeBg:     string;
  activeBorder: string;
  activeText:   string;
  activeIcon:   string;
  activeBar:    string;
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
  orderId:        number;
  currentStatus:  Order["status"];
  paymentStatus:  "unpaid" | "paid";
  orderNumber:    string;
  customerName:   string;
  customerPhone:  string;
  totalPrice:     string | number;
  serviceName:    string;
}

export function OrderStatusUpdater({
  orderId,
  currentStatus,
  paymentStatus:  initialPaymentStatus,
  orderNumber,
  customerName,
  customerPhone,
  totalPrice,
  serviceName,
}: OrderStatusUpdaterProps) {
  const [status,         setStatus]         = useState(currentStatus);
  const [paymentStatus,  setPaymentStatus]  = useState(initialPaymentStatus);
  const [isPending,      startTransition]   = useTransition();
  const [error,          setError]          = useState<string | null>(null);
  const [saved,          setSaved]          = useState(false);
  const [showPayModal,   setShowPayModal]   = useState(false);
  const [changeGiven,    setChangeGiven]    = useState<number | null>(null);

  const totalPriceNum = typeof totalPrice === "string" ? parseFloat(totalPrice) : totalPrice;
  const isDirty       = status !== currentStatus;
  const isPaid        = paymentStatus === "paid";

  const handleSave = () => {
    setError(null);
    setSaved(false);

    if (status === "picked_up" && !isPaid) {
      setError("Order must be paid before it can be marked as picked up.");
      return;
    }

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (result.success) setSaved(true);
      else setError(result.error ?? "Failed to update.");
    });
  };

  const handlePaymentSuccess = (change: number) => {
    setPaymentStatus("paid");
    setChangeGiven(change);
    setShowPayModal(false);
    setError(null);
  };

  return (
    <>
      {showPayModal && (
        <PaymentModal
          orderId={orderId}
          orderNumber={orderNumber}
          customerName={customerName}
          totalPrice={totalPriceNum}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

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
        {/* ── Payment status badge ───────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderRadius: "8px",
            background: isPaid
              ? "linear-gradient(135deg,#f0fdf4,#dcfce7)"
              : "linear-gradient(135deg,#fff7ed,#ffedd5)",
            border: `1.5px solid ${isPaid ? "#86efac" : "#fed7aa"}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isPaid ? (
              <BadgeCheck size={15} style={{ color: "#16a34a" }} />
            ) : (
              <AlertTriangle size={15} style={{ color: "#d97706" }} />
            )}
            <span style={{ fontSize: "12px", fontWeight: 800, color: isPaid ? "#14532d" : "#92400e" }}>
              {isPaid ? "Pagamentu simu" : "Pagamentu pendente"}
            </span>
          </div>

          {!isPaid && (
            <button
              onClick={() => setShowPayModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 11px",
                borderRadius: "6px",
                border: "1.5px solid #86efac",
                background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                color: "#16a34a",
                fontSize: "11px", fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <CreditCard size={11} />
              Selu agora
            </button>
          )}
        </div>

        {/* Change given confirmation */}
        {changeGiven !== null && changeGiven > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 12px",
              borderRadius: "6px",
              background: "#f0fdf4",
              border: "1.5px solid #86efac",
            }}
          >
            <CheckCircle2 size={13} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#14532d" }}>
              Troku atu fila: <strong>{formatUSD(changeGiven)}</strong>
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 28, height: 28,
              borderRadius: "6px",
              background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
              border: "1.5px solid #b6def5",
            }}
          >
            <RefreshCw size={12} style={{ color: "#1a7fba" }} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>
            Atualiza Estadu
          </p>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => {
            const active   = status === s.value;
            const disabled = s.value === "picked_up" && !isPaid;

            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  if (disabled) {
                    setError("Tenki selu pedidu molok marka hanesan foti ona.");
                    return;
                  }
                  setStatus(s.value);
                  setSaved(false);
                  setError(null);
                }}
                title={disabled ? "Selu uluk atu desblokeiu estadu ne'e" : undefined}
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
                  opacity: disabled ? 0.45 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!active && !disabled) {
                    e.currentTarget.style.borderColor = s.activeBorder + "66";
                    e.currentTarget.style.background = s.activeBg + "88";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active && !disabled) {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.background = "white";
                  }
                }}
              >
                <div
                  style={{
                    width: "3px", flexShrink: 0,
                    background: active ? s.activeBar : "transparent",
                    transition: "background 0.15s",
                  }}
                />
                <div className="flex items-center gap-2.5 px-3 py-2.5 flex-1">
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 28, height: 28,
                      borderRadius: "6px",
                      background: active ? s.activeBorder + "18" : "#f8fafc",
                      border: `1.5px solid ${active ? s.activeBorder + "44" : "#e2e8f0"}`,
                    }}
                  >
                    <s.Icon size={13} style={{ color: active ? s.activeIcon : "#94a3b8" }} />
                  </div>
                  <div>
                    <span
                      className="text-sm font-bold"
                      style={{ color: active ? s.activeText : "#94a3b8" }}
                    >
                      {s.label}
                    </span>
                    {disabled && (
                      <p style={{ fontSize: "9px", color: "#d97706", fontWeight: 700, marginTop: "1px" }}>
                        Selu uluk
                      </p>
                    )}
                  </div>
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
          {/* WhatsApp button — uses shared component for consistent Tetum message */}
          <WhatsAppNotify
            customerPhone={customerPhone}
            customerName={customerName}
            orderNumber={orderNumber}
            servicesSummary={serviceName}
            status={status}
            paymentStatus={paymentStatus}
            totalPrice={totalPriceNum}
            compact
          />

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
              <><Loader2 size={14} className="animate-spin" /> Salva…</>
            ) : saved ? (
              <><CheckCircle2 size={14} /> Salva ona!</>
            ) : (
              <><Save size={14} /> Salva Estadu</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}