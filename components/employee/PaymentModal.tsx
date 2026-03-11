/* eslint-disable react-hooks/set-state-in-effect */
// components/employee/PaymentModal.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X, Banknote, ArrowLeftRight, QrCode,
  CheckCircle2, Loader2, Calculator,
} from "lucide-react";
import { processPayment } from "@/lib/actions/payments";
import { formatUSD } from "@/lib/utils/order-form";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentModalProps {
  orderId: number;
  orderNumber: string;
  customerName: string;
  totalPrice: number;
  onClose: () => void;
  onSuccess: (change: number) => void;
}

type PaymentMethod = "cash" | "transfer" | "qris";

const METHODS: { value: PaymentMethod; label: string; Icon: React.ElementType; color: string; border: string; bg: string }[] = [
  { value: "cash",     label: "Cash",     Icon: Banknote,        color: "#16a34a", border: "#86efac", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
  { value: "transfer", label: "Transfer", Icon: ArrowLeftRight,  color: "#1a7fba", border: "#b6def5", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)" },
  { value: "qris",     label: "QRIS",     Icon: QrCode,          color: "#7c3aed", border: "#c4b5fd", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function PaymentModal({
  orderId,
  orderNumber,
  customerName,
  totalPrice,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [method, setMethod]           = useState<PaymentMethod>("cash");
  const [tendered, setTendered]       = useState<string>("");
  const [isPending, startTransition]  = useTransition();
  const [error, setError]             = useState<string | null>(null);

  const tenderedNum = parseFloat(tendered) || 0;
  const change      = method === "cash" ? Math.max(0, tenderedNum - totalPrice) : 0;
  const isExact     = method !== "cash" || tenderedNum >= totalPrice;

  // Quick-fill buttons (common cash amounts)
  const quickAmounts = [totalPrice, 50000, 100000, 200000].filter(
    (v, i, a) => a.indexOf(v) === i && v >= totalPrice,
  );

  useEffect(() => {
    // Reset tendered when switching methods
    if (method !== "cash") setTendered(totalPrice.toString());
    else setTendered("");
  }, [method, totalPrice]);

  const handleSubmit = () => {
    setError(null);
    const amountTendered = method === "cash" ? tenderedNum : totalPrice;

    startTransition(async () => {
      const result = await processPayment({ orderId, paymentMethod: method, amountTendered });
      if (result.success) {
        onSuccess(result.change ?? 0);
      } else {
        setError(result.error ?? "Payment failed.");
      }
    });
  };

  return (
    /* Backdrop */
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          width: "100%",
          maxWidth: "400px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg,#1a7fba 0%,#2496d6 55%,#0f5a85 100%)",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {/* Total due */}
          <div
            style={{
              background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total Due
            </span>
            <span style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b" }}>
              {formatUSD(totalPrice)}
            </span>
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

          {/* Cash tendered input */}
          {method === "cash" && (
            <div style={{ marginBottom: "18px" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                Amount Tendered
              </p>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                  fontSize: "13px", fontWeight: 700, color: "#64748b",
                }}>
                  Rp
                </span>
                <input
                  type="number"
                  min={totalPrice}
                  step="1000"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder="0"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 12px 12px 36px",
                    border: `1.5px solid ${tenderedNum >= totalPrice && tenderedNum > 0 ? "#86efac" : "#e2e8f0"}`,
                    borderRadius: "8px", fontSize: "16px", fontWeight: 700, color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>
              {/* Quick amounts */}
              <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTendered(amt.toString())}
                    style={{
                      padding: "4px 10px", borderRadius: "999px",
                      border: "1.5px solid #e2e8f0",
                      background: tenderedNum === amt ? "#edf7fd" : "white",
                      fontSize: "11px", fontWeight: 700,
                      color: tenderedNum === amt ? "#1a7fba" : "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    {formatUSD(amt)}
                  </button>
                ))}
              </div>

              {/* Change display */}
              {tenderedNum >= totalPrice && tenderedNum > 0 && (
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
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a" }}>Change to return</span>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: 900, color: "#14532d" }}>
                    {formatUSD(change)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Transfer / QRIS info */}
          {method !== "cash" && (
            <div
              style={{
                marginBottom: "18px",
                background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                border: "1.5px solid #fcd34d",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12px", fontWeight: 600, color: "#92400e",
              }}
            >
              Confirm that <strong>{formatUSD(totalPrice)}</strong> has been received via {method.toUpperCase()} before proceeding.
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#fff1f2", border: "1.5px solid #fda4af",
                borderRadius: "6px", padding: "10px 12px", marginBottom: "14px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleSubmit}
            disabled={isPending || (method === "cash" && !isExact)}
            style={{
              width: "100%", height: "48px",
              borderRadius: "8px", border: "none",
              background: isPending || (method === "cash" && !isExact)
                ? "#94a3b8"
                : "linear-gradient(135deg,#16a34a 0%,#22c55e 55%,#15803d 100%)",
              boxShadow: isPending || (method === "cash" && !isExact)
                ? "none"
                : "0 4px 14px rgba(22,163,74,0.35)",
              color: "white", fontSize: "14px", fontWeight: 900,
              cursor: isPending || (method === "cash" && !isExact) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              opacity: isPending || (method === "cash" && !isExact) ? 0.6 : 1,
            }}
          >
            {isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Processing…</>
            ) : (
              <><CheckCircle2 size={16} /> Confirm Payment — {formatUSD(totalPrice)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}