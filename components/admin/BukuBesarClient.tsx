"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Download, TrendingUp, TrendingDown, Scale, Wallet,
  Pencil, Check, X, Loader2,
} from "lucide-react";
import {
  updateFinancePieConfig, getFinanceExportBundle,
  type FinanceRecap, type PieChartData, type FinanceCategoryOption,
} from "@/lib/actions/finance";
import { formatUSD } from "@/lib/utils/order-form";
import { FINANCE_PERIODS, type FinancePeriod } from "@/lib/utils/business-time";
import { RankBars } from "@/components/admin/marketing/charts";
import { FinancePie } from "@/components/admin/finance/charts";
import { ExportModal, type ExportDateRange } from "@/components/admin/ExportModal";
import { exportFinanceWorkbook } from "@/lib/utils/export-xlsx";

interface Props {
  recap:   FinanceRecap;
  pies:    PieChartData[];
  options: FinanceCategoryOption[];
  period:  FinancePeriod;
  range:   { from: string; to: string; label: string };
}

const num: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFamily: "'Sora',ui-monospace,monospace",
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a", marginBottom: "14px" }}>
      {children}
    </p>
  );
}

// ─── Pie card with inline editor ─────────────────────────────────────────────

function PieCard({ pie, options }: { pie: PieChartData; options: FinanceCategoryOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle]     = useState(pie.title);
  const [keys, setKeys]       = useState<string[]>(pie.segments.map((s) => s.key));
  const [pending, start]      = useTransition();

  const toggle = (k: string) =>
    setKeys((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);

  const save = () => {
    start(async () => {
      await updateFinancePieConfig(pie.slot, { title: title.trim() || pie.title, categoryKeys: keys });
      setEditing(false);
      router.refresh();
    });
  };

  const income  = options.filter((o) => o.side === "income");
  const expense = options.filter((o) => o.side === "expense");

  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        {editing ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            style={{ flex: 1, padding: "4px 8px", border: "1.5px solid #b6def5", borderRadius: "6px", fontSize: "13px", fontWeight: 700, outline: "none" }} />
        ) : (
          <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "13px", color: "#0f172a" }}>{pie.title}</p>
        )}
        {editing ? (
          <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
            <button onClick={save} disabled={pending} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a", padding: 2 }}>
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            </button>
            <button onClick={() => { setEditing(false); setTitle(pie.title); setKeys(pie.segments.map((s) => s.key)); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} title="Customize" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "260px", overflowY: "auto" }}>
          {[{ label: "Income", list: income }, { label: "Expense", list: expense }].map((grp) => (
            <div key={grp.label}>
              <p style={{ fontSize: "9px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px" }}>{grp.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {grp.list.map((o) => (
                  <label key={o.key} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "#475569", cursor: "pointer", padding: "3px 4px" }}>
                    <input type="checkbox" checked={keys.includes(o.key)} onChange={() => toggle(o.key)} />
                    <span style={{ width: 8, height: 8, borderRadius: "2px", background: o.color, flexShrink: 0 }} />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <FinancePie segments={pie.segments} />
      )}
    </Card>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function BukuBesarClient({ recap, pies, options, period, range }: Props) {
  const router = useRouter();
  const [navPending, startNav]   = useTransition();
  const [showExport, setShowExport] = useState(false);

  const setPeriod = (p: FinancePeriod) => startNav(() => router.push(`/admin/buku-besar?period=${p}`));

  const handleExport = async ({ from, to }: ExportDateRange) => {
    const bundle = await getFinanceExportBundle(from, to);
    if (bundle.ledger.length === 0) throw new Error("No transactions in the selected range.");
    exportFinanceWorkbook(
      { from, to, ledger: bundle.ledger, recap: bundle.recap, pies: bundle.pies },
      `buku_besar_${from.replace(/-/g, "")}_${to.replace(/-/g, "")}`,
    );
  };

  const cards = [
    { label: "Total Income",  value: recap.totalIncome,  Icon: TrendingUp,   color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#86efac" },
    { label: "Total Cash Out", value: recap.totalExpense, Icon: TrendingDown, color: "#e11d48", bg: "linear-gradient(135deg,#fff1f2,#ffe4e6)", border: "#fda4af" },
    { label: "Net Profit",    value: recap.netProfit,    Icon: Scale,        color: recap.netProfit >= 0 ? "#16a34a" : "#e11d48", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "#b6def5", sub: "excl. change given" },
    { label: "Net Cash Flow", value: recap.netCashFlow,  Icon: Wallet,       color: recap.netCashFlow >= 0 ? "#16a34a" : "#e11d48", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "#c4b5fd" },
  ];

  const incomeTotal  = recap.totalIncome || 1;
  const expenseTotal  = recap.totalExpense || 1;

  return (
    <>
      {showExport && (
        <ExportModal title="Export Buku Besar" onClose={() => setShowExport(false)} onExport={handleExport} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}>
              <BookOpen size={22} style={{ color: "#1a7fba" }} /> Buku Besar
            </h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>General ledger recap · {range.label}</p>
          </div>
          <button
            onClick={() => setShowExport(true)}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px", borderRadius: "9px", border: "1.5px solid #86efac", background: "#f0fdf4", color: "#16a34a", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}
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
              }}>{p.label}</button>
            );
          })}
        </div>

        {/* Recap cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", opacity: navPending ? 0.55 : 1, transition: "opacity 0.2s" }}>
          {cards.map((c) => (
            <Card key={c.label} style={{ padding: "18px 20px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "9px", background: c.bg, border: `1.5px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <c.Icon size={16} style={{ color: c.color }} />
              </div>
              <p style={{ ...num, fontWeight: 800, fontSize: "21px", color: c.color, letterSpacing: "-0.02em" }}>{formatUSD(c.value)}</p>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginTop: "2px" }}>
                {c.label}{c.sub && <span style={{ color: "#cbd5e1" }}> · {c.sub}</span>}
              </p>
            </Card>
          ))}
        </div>

        {/* Income / Expense by category */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Card style={{ padding: "18px 20px" }}>
            <SectionTitle>Income by Category</SectionTitle>
            {recap.income.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#94a3b8", padding: "16px 0", textAlign: "center" }}>No income in this period.</p>
            ) : (
              <RankBars rows={recap.income.map((r) => ({
                label: r.label, value: r.total, color: r.color,
                display: formatUSD(r.total),
                sub: `${((r.total / incomeTotal) * 100).toFixed(0)}% · ${r.count} txn`,
              }))} />
            )}
          </Card>
          <Card style={{ padding: "18px 20px" }}>
            <SectionTitle>Expense by Category</SectionTitle>
            {recap.expense.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#94a3b8", padding: "16px 0", textAlign: "center" }}>No expenses in this period.</p>
            ) : (
              <RankBars rows={recap.expense.map((r) => ({
                label: r.label, value: r.total, color: r.color,
                display: formatUSD(r.total),
                sub: `${((r.total / expenseTotal) * 100).toFixed(0)}% · ${r.count} txn`,
              }))} />
            )}
          </Card>
        </div>

        {/* Customizable pies */}
        <div>
          <SectionTitle>Custom Analysis</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
            {pies.map((pie) => <PieCard key={pie.slot} pie={pie} options={options} />)}
          </div>
        </div>
      </div>
    </>
  );
}
