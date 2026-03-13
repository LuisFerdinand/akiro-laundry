/* eslint-disable @typescript-eslint/no-explicit-any */
// components/admin/CashRegisterAdmin.tsx  (full replacement)
"use client";

import { useState, useTransition, useRef } from "react";
import {
  Wallet, TrendingUp, TrendingDown, Save, Loader2,
  ArrowUpCircle, ArrowDownCircle, Plus, Trash2,
  CreditCard, BarChart3, Clock, Tag, ChevronDown, X,
  Pencil, Check,
} from "lucide-react";
import {
  setCashRegisterBalance,
  recordManualTransaction,
  createExpenseCategory,
  deleteExpenseCategory,
  updateExpenseCategory,
} from "@/lib/actions/payments";
import { formatUSD } from "@/lib/utils/order-form";
import type { CashRegisterState } from "@/lib/actions/payments";
import type { RevenueStats } from "@/lib/actions/admin-orders";
import type { ExpenseCategory } from "@/lib/db/schema";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialState:      CashRegisterState;
  revenue:           RevenueStats;
  initialCategories: ExpenseCategory[];
}

// ─── Colour palette for category badges ──────────────────────────────────────

const PALETTE = [
  "#1a7fba", "#16a34a", "#d97706", "#e11d48",
  "#7c3aed", "#0891b2", "#be185d", "#b45309",
  "#4f46e5", "#059669",
];

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "20px",
      background: color + "18", border: `1px solid ${color}40`,
      fontSize: "10px", fontWeight: 700, color, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: "10px 20px",
      background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
      borderBottom: "1.5px solid #e2e8f0",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CashRegisterAdmin({ initialState, revenue, initialCategories }: Props) {
  const [state,      setState]      = useState(initialState);
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);

  // ── Transaction form state ────────────────────────────────────────────────
  const [txDirection, setTxDirection] = useState<"income" | "outcome">("income");
  const [txAmount,    setTxAmount]    = useState("");
  const [txDesc,      setTxDesc]      = useState("");
  const [txCategory,  setTxCategory]  = useState<number | null>(null);
  const [txFeedback,  setTxFeedback]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [txPending,   startTx]        = useTransition();

  // ── Category manager state ────────────────────────────────────────────────
  const [catName,    setCatName]    = useState("");
  const [catDesc,    setCatDesc]    = useState("");
  const [catColor,   setCatColor]   = useState(PALETTE[0]);
  const [catFeedback,setCatFeedback]= useState<{ ok: boolean; msg: string } | null>(null);
  const [catPending, startCat]      = useTransition();
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editName,   setEditName]   = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ─── Submit a manual transaction ────────────────────────────────────────

  const handleTxSubmit = () => {
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) {
      setTxFeedback({ ok: false, msg: "Enter a valid amount greater than zero." });
      return;
    }
    if (!txDesc.trim()) {
      setTxFeedback({ ok: false, msg: "Please add a description." });
      return;
    }
    if (txDirection === "outcome" && !txCategory) {
      setTxFeedback({ ok: false, msg: "Select an expense category." });
      return;
    }
    setTxFeedback(null);
    startTx(async () => {
      const result = await recordManualTransaction({
        direction:  txDirection,
        amount,
        description: txDesc.trim(),
        categoryId:  txDirection === "outcome" ? txCategory : null,
      });
      if (result.success && result.newBalance !== undefined) {
        setState((prev) => ({
          ...prev,
          balance:       result.newBalance!,
          lastUpdatedAt: new Date(),
        }));
        setTxFeedback({ ok: true, msg: `Recorded! New balance: ${formatUSD(result.newBalance!)}` });
        setTxAmount("");
        setTxDesc("");
        setTxCategory(null);
      } else {
        setTxFeedback({ ok: false, msg: result.error ?? "Failed." });
      }
    });
  };

  // ─── Create category ─────────────────────────────────────────────────────

  const handleCreateCategory = () => {
    if (!catName.trim()) {
      setCatFeedback({ ok: false, msg: "Category name is required." });
      return;
    }
    setCatFeedback(null);
    startCat(async () => {
      const result = await createExpenseCategory({
        name:        catName.trim(),
        description: catDesc.trim() || undefined,
        color:       catColor,
      });
      if (result.success && result.category) {
        setCategories((prev) => [...prev, result.category!].sort((a, b) => a.name.localeCompare(b.name)));
        setCatFeedback({ ok: true, msg: `"${result.category.name}" created.` });
        setCatName(""); setCatDesc(""); setCatColor(PALETTE[0]);
      } else {
        setCatFeedback({ ok: false, msg: result.error ?? "Failed." });
      }
    });
  };

  // ─── Delete (soft) category ───────────────────────────────────────────────

  const handleDeleteCategory = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone. Past transactions that used this category will show it as removed.`)) return;
    setDeletingId(id);
    startCat(async () => {
      const result = await deleteExpenseCategory(id);
      if (result.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        if (txCategory === id) setTxCategory(null);
      }
      setDeletingId(null);
    });
  };

  // ─── Inline rename category ───────────────────────────────────────────────

  const handleRename = (id: number) => {
    if (!editName.trim()) { setEditingId(null); return; }
    startCat(async () => {
      const result = await updateExpenseCategory(id, { name: editName.trim() });
      if (result.success) {
        setCategories((prev) =>
          prev.map((c) => c.id === id ? { ...c, name: editName.trim() } : c)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      setEditingId(null);
    });
  };

  // ─── Revenue cards ────────────────────────────────────────────────────────

  const revenueCards = [
    { label: "Today",        value: revenue.todayRevenue,  icon: Clock,     color: "#1a7fba", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "#b6def5" },
    { label: "This Week",    value: revenue.weekRevenue,   icon: BarChart3, color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "#c4b5fd" },
    { label: "This Month",   value: revenue.monthRevenue,  icon: TrendingUp,color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#86efac" },
    { label: "Unpaid Orders",value: revenue.totalUnpaid,   icon: CreditCard,color: "#d97706", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "#fcd34d", isCount: true },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  const activeCategories = categories;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Cash Register
        </h1>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          Last updated {new Date(state.lastUpdatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      {/* ── Balance hero + revenue cards ─────────────────────────────────── */}
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
          {[0, 1].map((i) => (
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
              border: "1.5px solid #e2e8f0", padding: "18px 20px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "9px", background: card.bg, border: `1.5px solid ${card.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <card.icon size={16} style={{ color: card.color }} />
                </div>
              </div>
              <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "22px", color: "#0f172a", letterSpacing: "-0.02em" }}>
                {card.isCount ? card.value : formatUSD(card.value as number)}
              </p>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginTop: "2px" }}>
                {card.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lower section ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "20px", alignItems: "start" }}>

        {/* Left column: transaction form + category manager */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ─ Record Transaction ─────────────────────────────────────────── */}
          <div style={{
            background: "white", borderRadius: "12px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
          }}>
            <SectionHeader label="Record Transaction" />

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Direction toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {([
                  { dir: "income",  label: "Income",  Icon: ArrowUpCircle,  color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#86efac" },
                  { dir: "outcome", label: "Expense",  Icon: ArrowDownCircle,color: "#e11d48", bg: "linear-gradient(135deg,#fff1f2,#ffe4e6)", border: "#fda4af" },
                ] as const).map((opt) => {
                  const active = txDirection === opt.dir;
                  return (
                    <button
                      key={opt.dir}
                      onClick={() => { setTxDirection(opt.dir); setTxCategory(null); }}
                      style={{
                        padding: "14px 10px",
                        borderRadius: "10px",
                        border: `2px solid ${active ? opt.color : "#e2e8f0"}`,
                        background: active ? opt.bg : "white",
                        cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                        transition: "all 0.12s",
                      }}
                    >
                      <opt.Icon size={20} style={{ color: active ? opt.color : "#94a3b8" }} />
                      <span style={{ fontSize: "12px", fontWeight: 800, color: active ? opt.color : "#94a3b8" }}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Category dropdown (outcome only) */}
              {txDirection === "outcome" && (
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                    Category <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  {activeCategories.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#f59e0b", padding: "8px 12px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fcd34d" }}>
                      No categories yet — create one below first.
                    </p>
                  ) : (
                    <select
                      value={txCategory ?? ""}
                      onChange={(e) => setTxCategory(e.target.value ? parseInt(e.target.value) : null)}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                        fontSize: "13px", color: "#1e293b", background: "white", outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Select a category…</option>
                      {activeCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                  Amount
                </label>
                <input
                  type="number" min="0" step="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                    fontSize: "18px", fontWeight: 700, color: "#1e293b", outline: "none",
                  }}
                  onFocus={(e)  => { e.currentTarget.style.borderColor = "#b6def5"; }}
                  onBlur={(e)   => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                  Description
                </label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder={txDirection === "income" ? "e.g. Opening float, sales bonus…" : "e.g. Bought cleaning supplies…"}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                    fontSize: "13px", color: "#1e293b", outline: "none",
                  }}
                  onFocus={(e)  => { e.currentTarget.style.borderColor = "#b6def5"; }}
                  onBlur={(e)   => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
              </div>

              {/* Preview */}
              {txAmount && !isNaN(parseFloat(txAmount)) && parseFloat(txAmount) > 0 && (
                <div style={{
                  padding: "10px 14px", borderRadius: "8px",
                  background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                  border: "1.5px solid #e2e8f0",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Balance after</span>
                  <span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>
                    {formatUSD(
                      txDirection === "income"
                        ? state.balance + parseFloat(txAmount)
                        : Math.max(0, state.balance - parseFloat(txAmount)),
                    )}
                  </span>
                </div>
              )}

              {/* Feedback */}
              {txFeedback && (
                <div style={{
                  padding: "10px 14px", borderRadius: "7px",
                  background: txFeedback.ok ? "#f0fdf4" : "#fff1f2",
                  border: `1.5px solid ${txFeedback.ok ? "#86efac" : "#fda4af"}`,
                }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: txFeedback.ok ? "#14532d" : "#be123c" }}>
                    {txFeedback.msg}
                  </p>
                </div>
              )}

              <button
                onClick={handleTxSubmit}
                disabled={txPending}
                style={{
                  height: 46, borderRadius: "9px", border: "none",
                  background: txPending ? "#94a3b8" :
                    txDirection === "income"
                      ? "linear-gradient(135deg,#15803d,#22c55e 55%,#166534)"
                      : "linear-gradient(135deg,#be123c,#f43f5e 55%,#9f1239)",
                  boxShadow: txPending ? "none" :
                    txDirection === "income"
                      ? "0 4px 14px rgba(22,163,74,0.3)"
                      : "0 4px 14px rgba(225,29,72,0.3)",
                  color: "white", fontSize: "14px", fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  cursor: txPending ? "not-allowed" : "pointer",
                  opacity: txPending ? 0.6 : 1,
                }}
              >
                {txPending
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : txDirection === "income"
                    ? <><ArrowUpCircle size={15} /> Record Income</>
                    : <><ArrowDownCircle size={15} /> Record Expense</>
                }
              </button>
            </div>
          </div>

          {/* ─ Expense Categories ─────────────────────────────────────────── */}
          <div style={{
            background: "white", borderRadius: "12px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
          }}>
            <SectionHeader label="Expense Categories" />

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>

              {/* Existing categories */}
              {activeCategories.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                  No categories yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {activeCategories.map((cat) => (
                    <div key={cat.id} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 10px", borderRadius: "8px",
                      border: "1.5px solid #f1f5f9", background: "#fafafa",
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: cat.color ?? "#64748b", flexShrink: 0,
                      }} />

                      {editingId === cat.id ? (
                        <>
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleRename(cat.id); if (e.key === "Escape") setEditingId(null); }}
                            style={{
                              flex: 1, padding: "3px 8px", border: "1.5px solid #b6def5",
                              borderRadius: "5px", fontSize: "12px", outline: "none",
                            }}
                          />
                          <button onClick={() => handleRename(cat.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a", padding: 2 }}>
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                            {cat.name}
                          </span>
                          <button
                            onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                            title="Rename"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            disabled={deletingId === cat.id}
                            title="Remove"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#fda4af", padding: 2 }}
                          >
                            {deletingId === cat.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new category */}
              <div style={{
                marginTop: "4px", padding: "14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                border: "1.5px dashed #cbd5e1",
                display: "flex", flexDirection: "column", gap: "10px",
              }}>
                <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  New Category
                </p>

                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Store Improvement, Supplies…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "8px 12px", border: "1.5px solid #e2e8f0",
                    borderRadius: "7px", fontSize: "13px", color: "#1e293b", outline: "none", background: "white",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />

                {/* Colour picker */}
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>Colour</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {PALETTE.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setCatColor(hex)}
                        style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: hex, border: `2.5px solid ${catColor === hex ? "#1e293b" : "transparent"}`,
                          cursor: "pointer", boxShadow: catColor === hex ? "0 0 0 1.5px white inset" : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {catFeedback && (
                  <p style={{
                    fontSize: "11px", fontWeight: 600, padding: "6px 10px", borderRadius: "6px",
                    background: catFeedback.ok ? "#f0fdf4" : "#fff1f2",
                    color: catFeedback.ok ? "#14532d" : "#be123c",
                    border: `1px solid ${catFeedback.ok ? "#86efac" : "#fda4af"}`,
                  }}>
                    {catFeedback.msg}
                  </p>
                )}

                <button
                  onClick={handleCreateCategory}
                  disabled={catPending}
                  style={{
                    height: 36, borderRadius: "7px", border: "none",
                    background: catPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
                    color: "white", fontSize: "12px", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    cursor: catPending ? "not-allowed" : "pointer",
                    opacity: catPending ? 0.6 : 1,
                  }}
                >
                  {catPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Transaction ledger ─────────────────────────────────────────── */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
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
                const isIncome   = (tx as any).direction === "income";
                const catName    = (tx as any).categoryName as string | null;
                const catColor   = catName
                  ? (activeCategories.find((c) => c.name === catName)?.color ?? "#64748b")
                  : "#64748b";

                return (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "14px 20px",
                      borderBottom: "1px solid #f8fafc",
                      background: i % 2 === 0 ? "white" : "#fafafa",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                  >
                    <div style={{
                      width: 34, height: 34, flexShrink: 0, borderRadius: "8px",
                      background: isIncome ? "#f0fdf4" : "#fff1f2",
                      border: `1.5px solid ${isIncome ? "#86efac" : "#fda4af"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isIncome
                        ? <TrendingUp   size={14} style={{ color: "#16a34a" }} />
                        : <TrendingDown size={14} style={{ color: "#e11d48" }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
                          {tx.description}
                        </p>
                        {catName && <Badge color={catColor} label={catName} />}
                      </div>
                      <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {new Date(tx.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span style={{ fontSize: "10px", color: "#cbd5e1" }}>
                          Bal after: {formatUSD(parseFloat(tx.balanceAfter))}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: "14px", fontWeight: 800, whiteSpace: "nowrap",
                      color: isIncome ? "#16a34a" : "#e11d48",
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
    </div>
  );
}