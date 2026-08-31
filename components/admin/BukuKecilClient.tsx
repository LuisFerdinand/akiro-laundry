"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, Loader2, Download,
  TrendingUp, TrendingDown, Scale, NotebookPen,
} from "lucide-react";
import { recordManualTransaction } from "@/lib/actions/payments";
import { getFinanceExportBundle } from "@/lib/actions/finance";
import type { LedgerEntry } from "@/lib/actions/finance";
import { formatUSD } from "@/lib/utils/order-form";
import { FINANCE_PERIODS, type FinancePeriod } from "@/lib/utils/business-time";
import { ExportModal, type ExportDateRange } from "@/components/admin/ExportModal";
import { exportFinanceWorkbook } from "@/lib/utils/export-xlsx";
import type { ExpenseCategory } from "@/lib/db/schema";

interface Props {
  balance:       number;
  lastUpdatedAt: Date | string;
  categories:    ExpenseCategory[];
  ledger:        LedgerEntry[];
  period:        FinancePeriod;
  range:         { from: string; to: string; label: string };
}

const num: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFamily: "'Sora',ui-monospace,monospace",
};

export function BukuKecilClient({ balance, lastUpdatedAt, categories, ledger, period, range }: Props) {
  const router = useRouter();
  const [navPending, startNav]   = useTransition();
  const [showExport, setShowExport] = useState(false);

  // ── Transaction form ──
  const [dir,       setDir]       = useState<"income" | "outcome">("outcome");
  const [amount,    setAmount]    = useState("");
  const [desc,      setDesc]      = useState("");
  const [catId,     setCatId]     = useState<number | null>(null);
  const [feedback,  setFeedback]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [txPending, startTx]      = useTransition();

  const formCats = useMemo(
    () => categories.filter((c) =>
      dir === "income" ? c.kind === "income" || c.kind === "both"
                       : c.kind === "expense" || c.kind === "both"),
    [categories, dir],
  );

  const totals = useMemo(() => {
    const cashIn  = ledger.reduce((s, e) => s + e.credit, 0);
    const cashOut = ledger.reduce((s, e) => s + e.debit, 0);
    return { cashIn, cashOut, net: cashIn - cashOut };
  }, [ledger]);

  const setPeriod = (p: FinancePeriod) => {
    startNav(() => router.push(`/admin/buku-kecil?period=${p}`));
  };

  const submitTx = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setFeedback({ ok: false, msg: "Enter an amount greater than zero." }); return; }
    if (!desc.trim())           { setFeedback({ ok: false, msg: "Add a description." }); return; }
    if (!catId)                 { setFeedback({ ok: false, msg: "Select a category." }); return; }
    setFeedback(null);
    startTx(async () => {
      const res = await recordManualTransaction({
        direction: dir, amount: amt, description: desc.trim(), categoryId: catId,
      });
      if (res.success) {
        setFeedback({ ok: true, msg: `Recorded. New balance ${formatUSD(res.newBalance ?? balance)}.` });
        setAmount(""); setDesc(""); setCatId(null);
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Failed to record." });
      }
    });
  };

  const handleExport = async ({ from, to }: ExportDateRange) => {
    const bundle = await getFinanceExportBundle(from, to);
    if (bundle.ledger.length === 0) throw new Error("No transactions in the selected range.");
    exportFinanceWorkbook(
      {
        from, to,
        ledger: bundle.ledger,
        recap:  bundle.recap,
        pies:   bundle.pies,
      },
      `buku_kecil_${from.replace(/-/g, "")}_${to.replace(/-/g, "")}`,
    );
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    border: "1.5px solid #e2e8f0", borderRadius: "8px",
    fontSize: "13px", color: "#1e293b", outline: "none", background: "white",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px",
  };

  return (
    <>
      {showExport && (
        <ExportModal title="Export Buku Kecil" onClose={() => setShowExport(false)} onExport={handleExport} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}>
              <NotebookPen size={22} style={{ color: "#1a7fba" }} /> Buku Kecil
            </h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              Daily cash book · {range.label} · updated {new Date(lastUpdatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <button
            onClick={() => setShowExport(true)}
            style={{
              display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px",
              borderRadius: "9px", border: "1.5px solid #86efac", background: "#f0fdf4",
              color: "#16a34a", fontSize: "13px", fontWeight: 800, cursor: "pointer",
            }}
          >
            <Download size={14} /> Export Finance Excel
          </button>
        </div>

        {/* Period selector */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", opacity: navPending ? 0.5 : 1 }}>
          {FINANCE_PERIODS.map((p) => {
            const active = p.value === period;
            return (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding: "6px 12px", borderRadius: "999px", border: "1.5px solid",
                borderColor: active ? "#1a7fba" : "#e2e8f0",
                background:  active ? "#edf7fd" : "white",
                color:       active ? "#1a7fba" : "#64748b",
                fontSize: "11px", fontWeight: 700, cursor: "pointer",
              }}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Balance + summary */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "stretch" }}>
          <div style={{
            borderRadius: "16px",
            background: "linear-gradient(135deg,#0c1e35 0%,#0f3460 60%,#1a5276 100%)",
            boxShadow: "0 12px 40px rgba(12,30,53,0.3)",
            padding: "28px 32px", minWidth: "260px",
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Wallet size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
              <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Drawer Balance
              </p>
            </div>
            <p style={{ ...num, fontWeight: 900, fontSize: "38px", color: "white", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {formatUSD(balance)}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
            {[
              { label: "Cash In",  value: totals.cashIn,  Icon: TrendingUp,   color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#86efac" },
              { label: "Cash Out", value: totals.cashOut, Icon: TrendingDown, color: "#e11d48", bg: "linear-gradient(135deg,#fff1f2,#ffe4e6)", border: "#fda4af" },
              { label: "Net Flow", value: totals.net,     Icon: Scale,        color: "#1a7fba", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "#b6def5" },
            ].map((c) => (
              <div key={c.label} style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 34, height: 34, borderRadius: "9px", background: c.bg, border: `1.5px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <c.Icon size={16} style={{ color: c.color }} />
                </div>
                <p style={{ ...num, fontWeight: 800, fontSize: "20px", color: c.label === "Net Flow" ? (c.value >= 0 ? "#16a34a" : "#e11d48") : "#0f172a", letterSpacing: "-0.02em" }}>
                  {formatUSD(c.value)}
                </p>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginTop: "2px" }}>{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lower: form + ledger */}
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", alignItems: "start" }}>

          {/* Record transaction */}
          <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "10px 20px", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", borderBottom: "1.5px solid #e2e8f0" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Record Transaction</p>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {([
                  { d: "income" as const,  label: "Income",  Icon: ArrowUpCircle,   color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
                  { d: "outcome" as const, label: "Expense", Icon: ArrowDownCircle, color: "#e11d48", bg: "linear-gradient(135deg,#fff1f2,#ffe4e6)" },
                ]).map((o) => {
                  const active = dir === o.d;
                  return (
                    <button key={o.d} onClick={() => { setDir(o.d); setCatId(null); }} style={{
                      padding: "12px 8px", borderRadius: "10px",
                      border: `2px solid ${active ? o.color : "#e2e8f0"}`,
                      background: active ? o.bg : "white", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                    }}>
                      <o.Icon size={18} style={{ color: active ? o.color : "#94a3b8" }} />
                      <span style={{ fontSize: "12px", fontWeight: 800, color: active ? o.color : "#94a3b8" }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label style={labelStyle}>Category <span style={{ color: "#e11d48" }}>*</span></label>
                {formCats.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#f59e0b", padding: "8px 12px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fcd34d" }}>
                    No {dir === "income" ? "income" : "expense"} categories yet — add one on the Cash Register page.
                  </p>
                ) : (
                  <select value={catId ?? ""} onChange={(e) => setCatId(e.target.value ? parseInt(e.target.value) : null)} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Select a category…</option>
                    {formCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label style={labelStyle}>Amount</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...inputStyle, fontSize: "18px", fontWeight: 700 }} />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={dir === "income" ? "e.g. Vending machine income" : "e.g. Detergent restock"} style={inputStyle} />
              </div>

              {feedback && (
                <div style={{ padding: "10px 14px", borderRadius: "7px", background: feedback.ok ? "#f0fdf4" : "#fff1f2", border: `1.5px solid ${feedback.ok ? "#86efac" : "#fda4af"}` }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: feedback.ok ? "#14532d" : "#be123c" }}>{feedback.msg}</p>
                </div>
              )}

              <button onClick={submitTx} disabled={txPending} style={{
                height: 44, borderRadius: "9px", border: "none",
                background: txPending ? "#94a3b8" : dir === "income" ? "linear-gradient(135deg,#15803d,#22c55e 55%,#166534)" : "linear-gradient(135deg,#be123c,#f43f5e 55%,#9f1239)",
                color: "white", fontSize: "13px", fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                cursor: txPending ? "not-allowed" : "pointer",
              }}>
                {txPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : dir === "income" ? <><ArrowUpCircle size={15} /> Record Income</> : <><ArrowDownCircle size={15} /> Record Expense</>}
              </button>
            </div>
          </div>

          {/* Ledger table */}
          <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden", opacity: navPending ? 0.55 : 1, transition: "opacity 0.2s" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>Ledger</p>
              <p style={{ fontSize: "11px", color: "#94a3b8" }}>{ledger.length} entr{ledger.length === 1 ? "y" : "ies"}</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date", "Description", "Category", "Debit", "Credit", "Balance"].map((h, i) => (
                      <th key={h} style={{
                        padding: "10px 14px", textAlign: i >= 3 ? "right" : "left",
                        fontSize: "10px", fontWeight: 800, color: "#94a3b8",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}>No transactions in this period.</td></tr>
                  ) : ledger.map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "12px", color: "#1e293b", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.description}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10px", fontWeight: 700, color: e.categoryColor, background: e.categoryColor + "18", border: `1px solid ${e.categoryColor}40`, padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: e.categoryColor }} />
                          {e.categoryLabel}
                        </span>
                      </td>
                      <td style={{ ...num, padding: "11px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontSize: "12px", fontWeight: 700, color: e.debit ? "#e11d48" : "#e2e8f0" }}>
                        {e.debit ? formatUSD(e.debit) : "—"}
                      </td>
                      <td style={{ ...num, padding: "11px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontSize: "12px", fontWeight: 700, color: e.credit ? "#16a34a" : "#e2e8f0" }}>
                        {e.credit ? formatUSD(e.credit) : "—"}
                      </td>
                      <td style={{ ...num, padding: "11px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                        {formatUSD(e.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {ledger.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f8fafc" }}>
                      <td colSpan={3} style={{ padding: "11px 14px", fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</td>
                      <td style={{ ...num, padding: "11px 14px", textAlign: "right", fontSize: "12px", fontWeight: 800, color: "#e11d48" }}>{formatUSD(totals.cashOut)}</td>
                      <td style={{ ...num, padding: "11px 14px", textAlign: "right", fontSize: "12px", fontWeight: 800, color: "#16a34a" }}>{formatUSD(totals.cashIn)}</td>
                      <td style={{ padding: "11px 14px" }} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
