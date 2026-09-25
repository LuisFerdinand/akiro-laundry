/* eslint-disable react-hooks/set-state-in-effect */
// components/employee/PaymentModal.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Banknote, ArrowLeftRight, QrCode,
  CheckCircle2, Loader2, Calculator,
} from "lucide-react";
import { processPayment } from "@/lib/actions/payments";
import { formatUSD } from "@/lib/utils/order-form";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentModalProps {
  orderId:      number;
  orderNumber:  string;
  customerName: string;
  totalPrice:   number;
  /** Sum of any prior partial (DP) payments already applied to this order. */
  amountPaid?:  number;
  onClose:      () => void;
  onSuccess:    (result: { change: number; paymentStatus: "partial" | "paid"; balanceDue: number }) => void;
}

type PaymentMethod = "cash" | "transfer" | "qris";

const METHODS: {
  value:  PaymentMethod;
  label:  string;
  Icon:   React.ElementType;
  color:  string;
  border: string;
  bg:     string;
}[] = [
  { value: "cash",     label: "Cash",     Icon: Banknote,       color: "#16a34a", border: "#86efac", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
  { value: "transfer", label: "Transfer", Icon: ArrowLeftRight, color: "#1a7fba", border: "#b6def5", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)" },
  { value: "qris",     label: "QRIS",     Icon: QrCode,         color: "#7c3aed", border: "#c4b5fd", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
];

/**
 * Generate sensible quick-fill amounts in USD.
 * Always includes the exact balance due; adds round-dollar steps above it.
 */
function getQuickAmounts(total: number): number[] {
  const rounds = [1, 2, 5, 10, 20, 50, 100].map((d) => Math.ceil(total / d) * d);
  const unique = Array.from(new Set([total, ...rounds])).filter((v) => v >= total).sort((a, b) => a - b);
  return unique.slice(0, 5);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PaymentModal({
  orderId,
  orderNumber,
  customerName,
  totalPrice,
  amountPaid = 0,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const balanceDue   = Math.max(0, parseFloat((totalPrice - amountPaid).toFixed(2)));
  const [method,   setMethod]          = useState<PaymentMethod>("cash");
  const [tendered, setTendered]        = useState<string>("");
  const [isPending, startTransition]   = useTransition();
  const [error,    setError]           = useState<string | null>(null);

  const tenderedNum  = parseFloat(tendered) || 0;
  const change       = method === "cash" ? Math.max(0, tenderedNum - balanceDue) : 0;
  const isPartialDp  = tenderedNum > 0 && tenderedNum < balanceDue;
  // Cash accepts any positive amount (a DP, or an overpayment returned as change).
  // Transfer/QRIS have no change mechanism, so they can't exceed what's owed.
  const isValid      = method === "cash"
    ? tenderedNum > 0
    : tenderedNum > 0 && tenderedNum <= balanceDue;
  const quickAmounts = getQuickAmounts(balanceDue);
  const halfDp       = parseFloat((balanceDue / 2).toFixed(2));

  // Reset tendered when switching methods
  useEffect(() => {
    if (method !== "cash") setTendered(balanceDue.toString());
    else setTendered("");
  }, [method, balanceDue]);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await processPayment({ orderId, paymentMethod: method, amountTendered: tenderedNum });
      if (result.success) {
        onSuccess({
          change:        result.change ?? 0,
          paymentStatus: result.paymentStatus ?? "paid",
          balanceDue:    result.balanceDue ?? 0,
        });
      } else {
        setError(result.error ?? "Payment failed.");
      }
    });
  };

  // Portalled to <body> — rendering in place would confine "fixed" to the
  // nearest transformed ancestor (the page-enter transition on <main> leaves a
  // lingering `transform: translateY(0)`, which creates a containing block),
  // so the overlay would end up clipped to the page column instead of the
  // full viewport. Escaping to <body> guarantees true full-screen coverage.
  return createPortal(
    /* Full-screen overlay — covers the entire viewport so the cashier's whole
       attention (and touch input) stays on completing the payment; the layout
       below is sized to always fit within one screen, no scrolling needed. */
    <div
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "white", height: "100dvh" }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg,#1a7fba 0%,#2496d6 55%,#0f5a85 100%)",
          padding: "16px 20px",
        }}
      >
        <div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Process Payment
          </p>
          <p style={{ color: "white", fontWeight: 800, fontSize: "15px", marginTop: "2px" }}>
            {orderNumber}
          </p>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>{customerName}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            borderRadius: "6px",
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={16} style={{ color: "white" }} />
        </button>
      </div>

      {/* Body — single column + scroll on phone; fixed two-column no-scroll layout on tablet+ */}
      <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden sm:grid sm:grid-cols-2 sm:gap-8 p-5 sm:p-8">

        {/* ── Left column: total + method ─────────────────────────────────── */}
        <div className="flex flex-col">

          {/* Total / already paid / balance due */}
          <div
            style={{
              background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Order Total
              </span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#475569" }}>
                {formatUSD(totalPrice)}
              </span>
            </div>
            {amountPaid > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Already Paid (DP)
                </span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#16a34a" }}>
                  − {formatUSD(amountPaid)}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: "10px", paddingTop: "10px",
                borderTop: "1.5px dashed #cbd5e1",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Balance Due
              </span>
              <span style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b" }}>
                {formatUSD(balanceDue)}
              </span>
            </div>
          </div>

          {/* Payment method selector */}
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            Payment Method
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginBottom: "18px" }}>
            {METHODS.map((m) => {
              const active = method === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: "6px", padding: "12px 8px",
                    borderRadius: "8px",
                    border: `2px solid ${active ? m.color : "#e2e8f0"}`,
                    background: active ? m.bg : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <m.Icon size={18} style={{ color: active ? m.color : "#94a3b8" }} />
                  <span style={{ fontSize: "11px", fontWeight: 800, color: active ? m.color : "#94a3b8" }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Transfer / QRIS confirmation notice */}
          {method !== "cash" && (
            <div
              style={{
                background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                border: "1.5px solid #fcd34d",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12px", fontWeight: 600, color: "#92400e",
              }}
            >
              Confirm that the amount below has been received via {method.toUpperCase()} before proceeding.
              A DP (partial) amount is fine — enter less than the full balance if only a deposit was received.
            </div>
          )}
        </div>

        {/* ── Right column: amount / error, confirm pinned to bottom ─────── */}
        <div className="flex flex-col sm:h-full">
          <div className="flex-1">
            {/* Amount input — shared by all methods so a DP (partial) amount can
                be entered for cash, transfer, or QRIS alike. */}
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                {method === "cash" ? "Amount Tendered" : "Amount Received"}
              </p>
              <div style={{ position: "relative" }}>
                {/* Dollar sign prefix */}
                <span style={{
                  position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                  fontSize: "14px", fontWeight: 800, color: "#64748b",
                  pointerEvents: "none",
                }}>
                  $
                </span>
                <input
                  type="number"
                  min={0.01}
                  max={method === "cash" ? undefined : balanceDue}
                  step="0.01"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 12px 12px 28px",
                    border: `1.5px solid ${isValid ? "#86efac" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    fontSize: "16px", fontWeight: 700, color: "#1e293b",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    if (!isValid) e.currentTarget.style.borderColor = "#1a7fba";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,127,186,0.10)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isValid ? "#86efac" : "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Quick-fill amounts */}
              <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                {halfDp > 0 && halfDp < balanceDue && (
                  <button
                    onClick={() => setTendered(halfDp.toString())}
                    style={{
                      padding: "4px 10px", borderRadius: "999px",
                      border: "1.5px solid #fcd34d",
                      background: tenderedNum === halfDp ? "#fffbeb" : "white",
                      fontSize: "11px", fontWeight: 700,
                      color: "#92400e",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    50% DP · {formatUSD(halfDp)}
                  </button>
                )}
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTendered(amt.toString())}
                    disabled={method !== "cash" && amt > balanceDue}
                    style={{
                      padding: "4px 10px", borderRadius: "999px",
                      border: "1.5px solid #e2e8f0",
                      background: tenderedNum === amt ? "#edf7fd" : "white",
                      fontSize: "11px", fontWeight: 700,
                      color: tenderedNum === amt ? "#1a7fba" : "#64748b",
                      cursor: method !== "cash" && amt > balanceDue ? "not-allowed" : "pointer",
                      opacity: method !== "cash" && amt > balanceDue ? 0.4 : 1,
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (tenderedNum !== amt) {
                        e.currentTarget.style.borderColor = "#b6def5";
                        e.currentTarget.style.color = "#1a7fba";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (tenderedNum !== amt) {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.color = "#64748b";
                      }
                    }}
                  >
                    {formatUSD(amt)}
                  </button>
                ))}
              </div>

              {/* DP notice */}
              {isPartialDp && (
                <div
                  style={{
                    marginTop: "12px",
                    background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                    border: "1.5px solid #fcd34d",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                    Remaining after this DP
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: 900, color: "#78350f" }}>
                    {formatUSD(parseFloat((balanceDue - tenderedNum).toFixed(2)))}
                  </span>
                </div>
              )}

              {/* Change display — cash only */}
              {method === "cash" && change > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                    border: "1.5px solid #86efac",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calculator size={13} style={{ color: "#16a34a" }} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a" }}>
                      Change to return
                    </span>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: 900, color: "#14532d" }}>
                    {formatUSD(change)}
                  </span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "#fff1f2", border: "1.5px solid #fda4af",
                  borderRadius: "6px", padding: "10px 12px", marginTop: "14px",
                }}
              >
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
              </div>
            )}
          </div>

          {/* Confirm button — pinned to the bottom of the right column on tablet+ */}
          <button
            onClick={handleSubmit}
            disabled={isPending || !isValid}
            className="mt-4 sm:mt-0"
            style={{
              width: "100%", height: "52px",
              borderRadius: "8px", border: "none",
              background: isPending || !isValid
                ? "#94a3b8"
                : isPartialDp
                  ? "linear-gradient(135deg,#d97706 0%,#f59e0b 55%,#b45309 100%)"
                  : "linear-gradient(135deg,#16a34a 0%,#22c55e 55%,#15803d 100%)",
              boxShadow: isPending || !isValid
                ? "none"
                : isPartialDp
                  ? "0 4px 14px rgba(217,119,6,0.35)"
                  : "0 4px 14px rgba(22,163,74,0.35)",
              color: "white", fontSize: "14px", fontWeight: 900,
              cursor: isPending || !isValid ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              opacity: isPending || !isValid ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            {isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Processing…</>
            ) : isPartialDp ? (
              <><CheckCircle2 size={16} /> Confirm DP — {formatUSD(tenderedNum)}</>
            ) : (
              <><CheckCircle2 size={16} /> Confirm Payment — {formatUSD(tenderedNum)}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}