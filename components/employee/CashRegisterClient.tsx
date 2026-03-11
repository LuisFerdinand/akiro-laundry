// components/admin/CashRegisterClient.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Wallet, TrendingUp, TrendingDown, RefreshCw,
  ArrowDownCircle, ArrowUpCircle, Save, Loader2,
} from "lucide-react";
import { setCashRegisterBalance } from "@/lib/actions/payments";
import { formatUSD } from "@/lib/utils/order-form";
import type { CashRegisterState } from "@/lib/actions/payments";

interface Props {
  initialState: CashRegisterState;
}

export function CashRegisterClient({ initialState }: Props) {
  const [state,       setState]       = useState(initialState);
  const [inputAmt,    setInputAmt]    = useState("");
  const [reason,      setReason]      = useState("");
  const [mode,        setMode]        = useState<"set" | "add" | "subtract">("set");
  const [isPending,   startTransition] = useTransition();
  const [feedback,    setFeedback]    = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = () => {
    const amount = parseFloat(inputAmt);
    if (isNaN(amount) || amount < 0) {
      setFeedback({ ok: false, msg: "Please enter a valid amount." });
      return;
    }

    let newBalance: number;
    if (mode === "set")      newBalance = amount;
    else if (mode === "add") newBalance = state.balance + amount;
    else                     newBalance = Math.max(0, state.balance - amount);

    startTransition(async () => {
      const result = await setCashRegisterBalance(newBalance, reason.trim() || `${mode} ${formatUSD(amount)}`);
      if (result.success) {
        setState((prev) => ({ ...prev, balance: newBalance }));
        setFeedback({ ok: true, msg: `Balance updated to ${formatUSD(newBalance)}` });
        setInputAmt("");
        setReason("");
      } else {
        setFeedback({ ok: false, msg: result.error ?? "Failed." });
      }
    });
  };

  const MODES = [
    { key: "set",      label: "Set",      Icon: Wallet,      color: "#1a7fba" },
    { key: "add",      label: "+ Add",    Icon: ArrowUpCircle,   color: "#16a34a" },
    { key: "subtract", label: "− Remove", Icon: ArrowDownCircle, color: "#e11d48" },
  ] as const;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Balance card ─────────────────────────────────── */}
      <div
        style={{
          borderRadius: "12px",
          background: "linear-gradient(135deg,#1a7fba 0%,#2496d6 55%,#0f5a85 100%)",
          boxShadow: "0 8px 30px rgba(26,127,186,0.35)",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <Wallet size={16} style={{ color: "rgba(255,255,255,0.7)" }} />
          <p style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Cash Register Balance
          </p>
        </div>
        <p style={{ fontSize: "36px", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>
          {formatUSD(state.balance)}
        </p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginTop: "4px" }}>
          Last updated: {new Date(state.lastUpdatedAt).toLocaleString()}
        </p>
      </div>

      {/* ── Adjustment form ───────────────────────────────── */}
      <div
        style={{
          background: "white",
          borderRadius: "10px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 16px",
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            borderBottom: "1.5px solid #e2e8f0",
            display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <RefreshCw size={12} style={{ color: "#64748b" }} />
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Adjust Balance
          </p>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Mode selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
            {MODES.map((m) => {
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                    padding: "10px 6px",
                    borderRadius: "8px",
                    border: `2px solid ${active ? m.color : "#e2e8f0"}`,
                    background: active ? m.color + "12" : "white",
                    cursor: "pointer",
                  }}
                >
                  <m.Icon size={15} style={{ color: active ? m.color : "#94a3b8" }} />
                  <span style={{ fontSize: "11px", fontWeight: 800, color: active ? m.color : "#94a3b8" }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Amount input */}
          <div>
            <label style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              {mode === "set" ? "New Balance" : "Amount"}
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={inputAmt}
              onChange={(e) => setInputAmt(e.target.value)}
              placeholder="0"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "16px", fontWeight: 700, color: "#1e293b",
                outline: "none",
              }}
            />
          </div>

          {/* Reason */}
          <div>
            <label style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Opening cash, shift handover…"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "13px", color: "#1e293b",
                outline: "none",
              }}
            />
          </div>

          {/* Preview */}
          {inputAmt && !isNaN(parseFloat(inputAmt)) && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                border: "1.5px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>New balance will be</span>
              <span style={{ fontSize: "16px", fontWeight: 900, color: "#1e293b" }}>
                {formatUSD(
                  mode === "set"
                    ? parseFloat(inputAmt)
                    : mode === "add"
                    ? state.balance + parseFloat(inputAmt)
                    : Math.max(0, state.balance - parseFloat(inputAmt))
                )}
              </span>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "6px",
                background: feedback.ok ? "#f0fdf4" : "#fff1f2",
                border: `1.5px solid ${feedback.ok ? "#86efac" : "#fda4af"}`,
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: 700, color: feedback.ok ? "#14532d" : "#be123c" }}>
                {feedback.msg}
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              height: 44, borderRadius: "8px", border: "none",
              background: isPending
                ? "#94a3b8"
                : "linear-gradient(135deg,#1a7fba 0%,#2496d6 55%,#0f5a85 100%)",
              boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.30)",
              color: "white", fontSize: "14px", fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Update Balance</>}
          </button>
        </div>
      </div>

      {/* ── Recent transactions ───────────────────────────── */}
      <div
        style={{
          background: "white",
          borderRadius: "10px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            borderBottom: "1.5px solid #e2e8f0",
          }}
        >
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Recent Transactions
          </p>
        </div>

        {state.recentTransactions.length === 0 ? (
          <p style={{ padding: "20px 16px", fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
            No transactions yet.
          </p>
        ) : (
          <div>
            {state.recentTransactions.map((tx) => {
              const positive = parseFloat(tx.amount) >= 0;
              return (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      width: 30, height: 30, flexShrink: 0,
                      borderRadius: "6px",
                      background: positive ? "#f0fdf4" : "#fff1f2",
                      border: `1.5px solid ${positive ? "#86efac" : "#fda4af"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {positive
                      ? <TrendingUp size={13} style={{ color: "#16a34a" }} />
                      : <TrendingDown size={13} style={{ color: "#e11d48" }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.description}
                    </p>
                    <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                      {new Date(tx.createdAt).toLocaleString()} · bal: {formatUSD(parseFloat(tx.balanceAfter))}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "13px", fontWeight: 800,
                      color: positive ? "#16a34a" : "#e11d48",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {positive ? "+" : ""}{formatUSD(parseFloat(tx.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}