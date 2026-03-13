/* eslint-disable @typescript-eslint/no-explicit-any */
// components/admin/CashRegisterClient.tsx
"use client";

import { TrendingUp, TrendingDown, Wallet, Lock } from "lucide-react";
import { formatUSD } from "@/lib/utils/order-form";
import type { CashRegisterState } from "@/lib/actions/payments";

interface Props {
  initialState: CashRegisterState;
}

export function CashRegisterClient({ initialState }: Props) {
  const { balance, lastUpdatedAt, recentTransactions } = initialState;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Balance card ───────────────────────────────────── */}
      <div style={{
        borderRadius: "12px",
        background: "linear-gradient(135deg,#1a7fba 0%,#2496d6 55%,#0f5a85 100%)",
        boxShadow: "0 8px 30px rgba(26,127,186,0.35)",
        padding: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <Wallet size={16} style={{ color: "rgba(255,255,255,0.7)" }} />
          <p style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Cash Register Balance
          </p>
        </div>
        <p style={{ fontSize: "36px", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>
          {formatUSD(balance)}
        </p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginTop: "4px" }}>
          Last updated: {new Date(lastUpdatedAt).toLocaleString()}
        </p>
      </div>

      {/* ── Read-only notice ───────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 16px",
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1.5px solid #e2e8f0",
      }}>
        <Lock size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
        <p style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
          Cash register adjustments are restricted to admins only.
        </p>
      </div>

      {/* ── Recent transactions ────────────────────────────── */}
      <div style={{
        background: "white",
        borderRadius: "10px",
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "10px 16px",
          background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
          borderBottom: "1.5px solid #e2e8f0",
        }}>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Recent Transactions
          </p>
        </div>

        {recentTransactions.length === 0 ? (
          <p style={{ padding: "20px 16px", fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
            No transactions yet.
          </p>
        ) : (
          <div>
            {recentTransactions.map((tx) => {
              const isIncome    = (tx as any).direction
                ? (tx as any).direction === "income"
                : parseFloat(tx.amount) >= 0;
              const isChangeOut = tx.type === "change_out";
              const catName     = (tx as any).categoryName as string | null | undefined;

              // income = green, change_out = yellow, expense/other outcome = red
              const color = isIncome
                ? { icon: "#16a34a", iconBg: "#f0fdf4", iconBorder: "#86efac", amount: "#16a34a" }
                : isChangeOut
                ? { icon: "#b45309", iconBg: "#fffbeb", iconBorder: "#fcd34d", amount: "#d97706" }
                : { icon: "#e11d48", iconBg: "#fff1f2", iconBorder: "#fda4af", amount: "#e11d48" };

              return (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px",
                  borderBottom: "1px solid #f1f5f9",
                }}>
                  <div style={{
                    width: 30, height: 30, flexShrink: 0,
                    borderRadius: "6px",
                    background: color.iconBg,
                    border: `1.5px solid ${color.iconBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isIncome
                      ? <TrendingUp  size={13} style={{ color: color.icon }} />
                      : <TrendingDown size={13} style={{ color: color.icon }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>
                        {tx.description}
                      </p>
                      {catName && (
                        <span style={{
                          fontSize: "10px", fontWeight: 700,
                          padding: "1px 7px", borderRadius: "20px",
                          background: "#f1f5f9", color: "#64748b",
                          border: "1px solid #e2e8f0",
                        }}>
                          {catName}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                      {new Date(tx.createdAt).toLocaleString()} · bal: {formatUSD(parseFloat(tx.balanceAfter))}
                    </p>
                  </div>

                  <span style={{
                    fontSize: "13px", fontWeight: 800,
                    color: color.amount,
                    whiteSpace: "nowrap",
                  }}>
                    {isIncome ? "+" : "−"}{formatUSD(parseFloat(tx.amount))}
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