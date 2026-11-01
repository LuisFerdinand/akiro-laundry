// components/admin/BukuKecilClient.tsx
"use client";
//
// Buku Kecil — the SUBSIDIARY ledgers: the detail behind the accounts in Buku
// Besar. Two of them:
//   • Receivables (Piutang)  what each customer owes        → backs "Piutang Usaha"
//   • Cash (Kas)             every movement of the drawer   → backs "Kas"
// This shell owns the tab, the period and the headline figures; the cash
// transaction table lives in buku-kecil/LedgerTable, receivables in
// buku-kecil/ReceivablesLedger.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Download, Notebook, Plus, RefreshCw, Receipt, Scale, TrendingDown, TrendingUp, Users, Wallet,
} from "lucide-react";
import { getFinanceExportBundle } from "@/lib/actions/finance";
import type { LedgerEntry } from "@/lib/actions/finance";
import type { ReceivablesLedger as ReceivablesData } from "@/lib/actions/receivables";
import { formatUSD } from "@/lib/utils/order-form";
import { rangeQuery, type FinanceRange } from "@/lib/utils/finance-period";
import { ExportModal, type ExportDateRange } from "@/components/admin/ExportModal";
import { PeriodBar, useFinanceNav } from "@/components/admin/finance/PeriodBar";
import { exportFinanceWorkbook } from "@/lib/utils/export-xlsx";
import { LedgerTable } from "@/components/admin/buku-kecil/LedgerTable";
import { ReceivablesLedger } from "@/components/admin/buku-kecil/ReceivablesLedger";
import { RecordTransactionModal } from "@/components/admin/buku-kecil/RecordTransactionModal";
import type { ExpenseCategory } from "@/lib/db/schema";

export type BukuKecilTab = "piutang" | "kas";

interface Props {
  tab:   BukuKecilTab;
  range: FinanceRange;
  /** Receivables tab. */
  receivables: ReceivablesData | null;
  /** Cash tab. */
  cash: {
    balance:       number;
    lastUpdatedAt: Date | string;
    categories:    ExpenseCategory[];
    ledger:        LedgerEntry[];
  } | null;
}

const TABS: { value: BukuKecilTab; label: string; caption: string; Icon: React.ElementType }[] = [
  { value: "piutang", label: "Receivables", caption: "Piutang per customer", Icon: Users  },
  { value: "kas",     label: "Cash",        caption: "Kas · drawer entries",  Icon: Wallet },
];

export function BukuKecilClient({ tab, range, receivables, cash }: Props) {
  const { go, pending, refresh } = useFinanceNav("/admin/buku-kecil", { tab });
  const [showExport, setShowExport] = useState(false);
  const [recording,  setRecording]  = useState(false);

  const handleExport = async ({ from, to }: ExportDateRange) => {
    const bundle = await getFinanceExportBundle(from, to);
    if (bundle.ledger.length === 0) throw new Error("No transactions in the selected range.");
    exportFinanceWorkbook(
      { from, to, ledger: bundle.ledger, recap: bundle.recap, pies: bundle.pies },
      `buku_kecil_${from.replace(/-/g, "")}_${to.replace(/-/g, "")}`,
    );
  };

  const btn = "inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold active:scale-95";

  return (
    <>
      {showExport && <ExportModal title="Export Buku Kecil" onClose={() => setShowExport(false)} onExport={handleExport} />}
      {recording && cash && (
        <RecordTransactionModal
          categories={cash.categories} balance={cash.balance}
          onClose={() => setRecording(false)} onRecorded={() => refresh()}
        />
      )}

      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 md:gap-5">
        {/* Header */}
        <div>
         <div className="flex items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 font-display text-[24px] font-extrabold tracking-tight text-slate-900 md:text-[26px]">
              <Notebook size={22} className="text-sky-600" /> Buku Kecil
            </h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refresh} className={`${btn} bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50`} aria-label="Refresh">
              <RefreshCw size={14} className={pending ? "animate-spin" : ""} /> <span className="max-md:hidden">Refresh</span>
            </button>
            {tab === "kas" && (
              <>
                <button type="button" onClick={() => setShowExport(true)} className={`${btn} bg-emerald-50 font-extrabold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100`}>
                  <Download size={14} /> <span className="max-md:hidden">Finance</span> Excel
                </button>
                <button type="button" onClick={() => setRecording(true)} className={`${btn} bg-sky-600 px-4 font-extrabold text-white shadow-md shadow-sky-600/25 hover:bg-sky-700`}>
                  <Plus size={15} strokeWidth={3} /> Record <span className="max-md:hidden">transaction</span>
                </button>
              </>
            )}
          </div>
         </div>
         <p className="mt-1 text-[13px] font-semibold text-slate-400">
            Subsidiary ledgers · the detail behind Buku Besar
         </p>
        </div>

        {/* Ledger tabs */}
        <div role="tablist" aria-label="Subsidiary ledgers" className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1 md:inline-grid md:w-fit md:min-w-[420px]">
          {TABS.map((t) => {
            const active = t.value === tab;
            return (
              <Link
                key={t.value} role="tab" aria-selected={active} scroll={false}
                href={`/admin/buku-kecil?${rangeQuery(range)}&tab=${t.value}`}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 transition ${active ? "bg-white shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:text-slate-800"}`}
              >
                <t.Icon size={16} className={active ? "text-sky-600" : "text-slate-400"} />
                <span className="min-w-0">
                  <span className={`block text-[13px] font-extrabold leading-tight ${active ? "text-slate-900" : ""}`}>{t.label}</span>
                  <span className="block truncate text-[11px] font-semibold leading-tight text-slate-400">{t.caption}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <PeriodBar range={range} go={go} pending={pending} />

        {/* Tie-out to the control account */}
        <TieOut tab={tab} range={range} receivables={receivables} cash={cash} />

        <div className={`transition-opacity ${pending ? "opacity-60" : ""}`}>
          {tab === "piutang" && receivables && <ReceivablesLedger ledger={receivables} />}
          {tab === "kas" && cash && <CashLedger cash={cash} />}
        </div>
      </div>
    </>
  );
}

// ─── Control-account strip ────────────────────────────────────────────────────

function TieOut({ tab, range, receivables, cash }: Pick<Props, "tab" | "range" | "receivables" | "cash">) {
  const text = tab === "piutang"
    ? receivables && <>Balances as of <b className="text-slate-700">{receivables.asOf}</b> — these customers add up to <b className="text-slate-700">Piutang Usaha {formatUSD(receivables.total)}</b> in Buku Besar.</>
    : cash && <>Every drawer entry for <b className="text-slate-700">{range.label}</b> — they roll up into the <b className="text-slate-700">Kas</b> account in Buku Besar.</>;
  if (!text) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-sky-50/70 px-3.5 py-2.5 text-[12.5px] font-semibold leading-relaxed text-slate-500 ring-1 ring-sky-100">
      <span>{text}</span>
      <Link href={`/admin/buku-besar?${rangeQuery(range)}`} className="inline-flex items-center gap-1 font-extrabold text-sky-700 hover:underline">
        Open Buku Besar <ArrowRight size={12} />
      </Link>
    </p>
  );
}

// ─── Cash tab ─────────────────────────────────────────────────────────────────

function CashLedger({ cash }: { cash: NonNullable<Props["cash"]> }) {
  const { balance, lastUpdatedAt, ledger } = cash;

  const totals = useMemo(() => {
    const cashIn  = ledger.reduce((s, e) => s + e.credit, 0);
    const cashOut = ledger.reduce((s, e) => s + e.debit, 0);
    const orders  = new Set(ledger.map((e) => e.orderNumber).filter(Boolean)).size;
    return { cashIn, cashOut, net: cashIn - cashOut, orders };
  }, [ledger]);

  const cards = [
    { label: "Cash in",  value: formatUSD(totals.cashIn),  Icon: TrendingUp,   tone: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
    { label: "Cash out", value: formatUSD(totals.cashOut), Icon: TrendingDown, tone: "text-rose-600",    chip: "bg-rose-50 text-rose-600 ring-rose-100" },
    { label: "Net flow", value: formatUSD(totals.net),     Icon: Scale,        tone: totals.net < 0 ? "text-rose-600" : "text-slate-900", chip: "bg-sky-50 text-sky-600 ring-sky-100" },
    { label: "Entries",  value: ledger.length.toLocaleString(), sub: `${totals.orders} order${totals.orders === 1 ? "" : "s"}`, Icon: Receipt, tone: "text-slate-900", chip: "bg-slate-100 text-slate-500 ring-slate-200" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#0c1e35] via-[#0f3460] to-[#1a5276] p-5 text-white shadow-lg shadow-slate-900/15">
          <Wallet size={22} className="shrink-0 text-white/50" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Drawer balance</p>
            <p className="mt-1 truncate font-display text-[26px] font-extrabold leading-none tracking-tight tabular-nums">{formatUSD(balance)}</p>
            <p className="mt-1 text-[11px] font-semibold text-white/40">
              updated {new Date(lastUpdatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <p className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg ring-1 ${c.chip}`}><c.Icon size={13} strokeWidth={2.5} /></span>
              {c.label}
            </p>
            <p className={`mt-2.5 truncate font-display text-[20px] font-extrabold tracking-tight tabular-nums ${c.tone}`}>
              {c.value}
              {"sub" in c && c.sub && <span className="ml-2 text-[12px] font-semibold text-slate-400">{c.sub}</span>}
            </p>
          </div>
        ))}
      </div>

      <LedgerTable entries={ledger} />
    </div>
  );
}
