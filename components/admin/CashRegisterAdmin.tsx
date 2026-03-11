// components/admin/CashRegisterAdmin.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Wallet, TrendingUp, TrendingDown, Save, Loader2,
  ArrowUpCircle, ArrowDownCircle, RefreshCw,
  CreditCard, Calendar, BarChart3, Clock,
} from "lucide-react";
import { setCashRegisterBalance } from "@/lib/actions/payments";
import { formatUSD } from "@/lib/utils/order-form";
import type { CashRegisterState } from "@/lib/actions/payments";
import type { RevenueStats } from "@/lib/actions/admin-orders";

interface Props {
  initialState: CashRegisterState;
  revenue:      RevenueStats;
}

type AdjustMode = "set" | "add" | "subtract";

const MODES: { key: AdjustMode; label: string; Icon: React.ElementType; color: string; bg: string; border: string }[] = [
  { key: "set",      label: "Set Balance",  Icon: Wallet,         color: "#1a7fba", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "#b6def5" },
  { key: "add",      label: "+ Add Cash",   Icon: ArrowUpCircle,  color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#86efac" },
  { key: "subtract", label: "− Remove",     Icon: ArrowDownCircle,color: "#e11d48", bg: "linear-gradient(135deg,#fff1f2,#ffe4e6)", border: "#fda4af" },
];

export function CashRegisterAdmin({ initialState, revenue }: Props) {
  const [state,    setState]    = useState(initialState);
  const [mode,     setMode]     = useState<AdjustMode>("set");
  const [amount,   setAmount]   = useState("");
  const [reason,   setReason]   = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, start]      = useTransition();

  const amountNum = parseFloat(amount) || 0;
  const newBalance =
    mode === "set"      ? amountNum :
    mode === "add"      ? state.balance + amountNum :
    Math.max(0, state.balance - amountNum);

  const handleSubmit = () => {
    if (!amountNum || amountNum <= 0) {
      setFeedback({ ok: false, msg: "Please enter a valid amount." }); return;
    }
    setFeedback(null);
    start(async () => {
      const label = MODES.find((m) => m.key === mode)!.label;
      const desc  = reason.trim() || `${label}: ${formatUSD(amountNum)}`;
      const result = await setCashRegisterBalance(newBalance, desc);
      if (result.success) {
        setState((prev) => ({ ...prev, balance: newBalance, lastUpdatedAt: new Date() }));
        setFeedback({ ok: true, msg: `Balance updated to ${formatUSD(newBalance)}` });
        setAmount("");
        setReason("");
      } else {
        setFeedback({ ok: false, msg: result.error ?? "Failed." });
      }
    });
  };

  const revenueCards = [
    { label: "Today",      value: revenue.todayRevenue,   icon: Clock,     color: "#1a7fba", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "#b6def5" },
    { label: "This Week",  value: revenue.weekRevenue,    icon: BarChart3, color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "#c4b5fd" },
    { label: "This Month", value: revenue.monthRevenue,   icon: TrendingUp,color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#86efac" },
    { label: "Unpaid Orders", value: revenue.totalUnpaid, icon: CreditCard,color: "#d97706", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "#fcd34d", isCount: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ── Header ───────────────────────────────────────── */}
      <div>
        <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Cash Register
        </h1>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          Last updated {new Date(state.lastUpdatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      {/* ── Balance hero + revenue cards ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "stretch" }}>

        {/* Balance card */}
        <div style={{
          borderRadius: "16px",
          background: "linear-gradient(135deg,#0c1e35 0%,#0f3460 60%,#1a5276 100%)",
          boxShadow: "0 12px 40px rgba(12,30,53,0.3)",
          padding: "28px 32px",
          position: "relative", overflow: "hidden",
          minWidth: "280px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          {/* Orbs */}
          {[["-30px", "-30px", 160], ["auto", "-20px", 100, "30px"]].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              top: i === 0 ? "-30px" : "auto", bottom: i === 1 ? "-20px" : "auto",
              left: i === 0 ? "-30px" : "auto", right: i === 1 ? "30px" : "auto",
              width: i === 0 ? 160 : 100, height: i === 0 ? 160 : 100,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(26,127,186,${i === 0 ? 0.35 : 0.2}) 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
          ))}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Wallet size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
              <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Drawer Balance
              </p>
            </div>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 900, fontSize: "40px", color: "white", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {formatUSD(state.balance)}
            </p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>Physical cash in register</p>
          </div>
          <div style={{
            marginTop: "24px", padding: "10px 14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
              {revenue.totalPaidOrders} paid orders total
            </p>
          </div>
        </div>

        {/* Revenue grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "14px" }}>
          {revenueCards.map((card) => (
            <div key={card.label} style={{
              background: "white", borderRadius: "12px",
              border: "1.5px solid #e2e8f0",
              padding: "18px 20px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "9px", background: card.bg, border: `1.5px solid ${card.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <card.icon size={16} style={{ color: card.color }} />
                </div>
              </div>
              <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "22px", color: "#0f172a", letterSpacing: "-0.02em" }}>
                {card.isCount ? card.value : formatUSD(card.value as number)}
              </p>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginTop: "2px" }}>
                Revenue — {card.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lower grid: adjustment + ledger ──────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", alignItems: "start" }}>

        {/* Adjustment panel */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 20px",
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            borderBottom: "1.5px solid #e2e8f0",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <RefreshCw size={12} style={{ color: "#64748b" }} />
            <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Adjust Balance
            </p>
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Mode selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
              {MODES.map((m) => {
                const active = mode === m.key;
                return (
                  <button key={m.key} onClick={() => setMode(m.key)} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                    padding: "11px 6px", borderRadius: "9px",
                    border: `2px solid ${active ? m.color : "#e2e8f0"}`,
                    background: active ? m.bg : "white",
                    cursor: "pointer", transition: "all 0.12s",
                  }}>
                    <m.Icon size={16} style={{ color: active ? m.color : "#94a3b8" }} />
                    <span style={{ fontSize: "10px", fontWeight: 800, color: active ? m.color : "#94a3b8", textAlign: "center", lineHeight: 1.2 }}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Amount */}
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                {mode === "set" ? "New Balance" : "Amount"}
              </label>
              <input
                type="number" min="0" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                  fontSize: "18px", fontWeight: 700, color: "#1e293b", outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
              />
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                Reason (optional)
              </label>
              <input
                type="text" value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Opening float, shift handover…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                  fontSize: "13px", color: "#1e293b", outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
              />
            </div>

            {/* Preview */}
            {amountNum > 0 && (
              <div style={{
                padding: "12px 14px", borderRadius: "8px",
                background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                border: "1.5px solid #e2e8f0",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>New balance will be</span>
                <span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "18px", color: "#0f172a" }}>
                  {formatUSD(newBalance)}
                </span>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div style={{
                padding: "10px 14px", borderRadius: "7px",
                background: feedback.ok ? "#f0fdf4" : "#fff1f2",
                border: `1.5px solid ${feedback.ok ? "#86efac" : "#fda4af"}`,
              }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: feedback.ok ? "#14532d" : "#be123c" }}>
                  {feedback.msg}
                </p>
              </div>
            )}

            <button onClick={handleSubmit} disabled={isPending} style={{
              height: 46, borderRadius: "9px", border: "none",
              background: isPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
              boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.3)",
              color: "white", fontSize: "14px", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}>
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Update Balance</>}
            </button>
          </div>
        </div>

        {/* Transaction ledger */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
              Transaction Ledger
            </p>
            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
              Last {state.recentTransactions.length} transactions
            </p>
          </div>

          {state.recentTransactions.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <Wallet size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>No transactions yet</p>
            </div>
          ) : (
            <div>
              {state.recentTransactions.map((tx, i) => {
                const positive = parseFloat(tx.amount) >= 0;
                return (
                  <div key={tx.id} style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 20px",
                    borderBottom: "1px solid #f8fafc",
                    background: i % 2 === 0 ? "white" : "#fafafa",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                  >
                    <div style={{
                      width: 34, height: 34, flexShrink: 0, borderRadius: "8px",
                      background: positive ? "#f0fdf4" : "#fff1f2",
                      border: `1.5px solid ${positive ? "#86efac" : "#fda4af"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {positive
                        ? <TrendingUp   size={14} style={{ color: "#16a34a" }} />
                        : <TrendingDown size={14} style={{ color: "#e11d48" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description}
                      </p>
                      <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {new Date(tx.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span style={{ fontSize: "10px", color: "#cbd5e1" }}>
                          Balance after: {formatUSD(parseFloat(tx.balanceAfter))}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: "14px", fontWeight: 800, whiteSpace: "nowrap",
                      color: positive ? "#16a34a" : "#e11d48",
                    }}>
                      {positive ? "+" : ""}{formatUSD(parseFloat(tx.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}