"use client";
//
// Buku Besar — the GENERAL ledger. One line per account (Kas, Piutang Usaha,
// Pendapatan, Beban) with opening → debit → credit → closing, the Laba Rugi
// (profit & loss) those accounts produce, and reconciliation checks proving the
// subsidiary ledgers in Buku Kecil add up to the totals shown here.
//
// Revenue is money received on orders — the same number the dashboard, daily
// email and marketing page show (lib/utils/revenue.ts).

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, BookOpen, CheckCircle2, ChevronDown, Download, Info, Loader2,
  Pencil, Check, X, Scale, TrendingDown, TrendingUp, Users, Wallet,
} from "lucide-react";
import {
  updateFinancePieConfig, getFinanceExportBundle,
  type FinanceCategoryOption, type GeneralLedger, type LedgerAccount, type PieChartData,
} from "@/lib/actions/finance";
import { formatUSD } from "@/lib/utils/order-form";
import type { FinanceRange } from "@/lib/utils/finance-period";
import { FinancePie } from "@/components/admin/finance/charts";
import { PeriodBar, useFinanceNav } from "@/components/admin/finance/PeriodBar";
import { ExportModal, type ExportDateRange } from "@/components/admin/ExportModal";
import { exportFinanceWorkbook } from "@/lib/utils/export-xlsx";

interface Props {
  ledger:  GeneralLedger;
  pies:    PieChartData[];
  options: FinanceCategoryOption[];
  range:   FinanceRange;
}

const GROUP_LABEL: Record<LedgerAccount["group"], string> = {
  asset:   "Assets · Harta",
  revenue: "Revenue · Pendapatan",
  expense: "Expenses · Beban",
};

const fill = (path: string, range: FinanceRange) => path.replace("{from}", range.from).replace("{to}", range.to);

/** "—" for a zero, so a ledger row reads at a glance. */
const amt = (n: number | null) => (n === null ? "—" : n === 0 ? "—" : formatUSD(n));

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BukuBesarClient({ ledger, pies, options, range }: Props) {
  const { go, pending } = useFinanceNav("/admin/buku-besar");
  const [showExport, setShowExport] = useState(false);

  const handleExport = async ({ from, to }: ExportDateRange) => {
    const bundle = await getFinanceExportBundle(from, to);
    if (bundle.ledger.length === 0) throw new Error("No transactions in the selected range.");
    exportFinanceWorkbook(
      { from, to, ledger: bundle.ledger, recap: bundle.recap, pies: bundle.pies },
      `buku_besar_${from.replace(/-/g, "")}_${to.replace(/-/g, "")}`,
    );
  };

  const { statement: st, receivables: ar, drawer } = ledger;
  const problems = ledger.checks.filter((c) => c.status === "warn").length;
  const notes    = ledger.checks.filter((c) => c.status === "note").length;

  const cards = [
    { label: "Revenue",     value: formatUSD(st.revenue),  sub: "money received",                          Icon: TrendingUp,   tone: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
    { label: "Expenses",    value: formatUSD(st.expenses), sub: "paid out of the drawer",                  Icon: TrendingDown, tone: "text-rose-600",    chip: "bg-rose-50 text-rose-600 ring-rose-100" },
    { label: "Net profit",  value: formatUSD(st.netProfit), sub: st.margin === null ? "no income yet" : `${(st.margin * 100).toFixed(0)}% margin`, Icon: Scale, tone: st.netProfit < 0 ? "text-rose-600" : "text-slate-900", chip: "bg-sky-50 text-sky-600 ring-sky-100" },
    { label: "Cash in drawer", value: formatUSD(drawer.closing), sub: `closing ${range.to}`,              Icon: Wallet,       tone: "text-slate-900",   chip: "bg-slate-100 text-slate-500 ring-slate-200" },
    { label: "Owed to you", value: formatUSD(ar.closing),  sub: `${ar.customers} customer${ar.customers === 1 ? "" : "s"} · Piutang`, Icon: Users, tone: ar.closing > 0 ? "text-amber-600" : "text-slate-900", chip: "bg-amber-50 text-amber-600 ring-amber-100" },
  ];

  return (
    <>
      {showExport && <ExportModal title="Export Buku Besar" onClose={() => setShowExport(false)} onExport={handleExport} />}

      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 font-display text-[24px] font-extrabold tracking-tight text-slate-900 md:text-[26px]">
              <BookOpen size={22} className="text-sky-600" /> Buku Besar
            </h1>
            <button
              type="button" onClick={() => setShowExport(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 text-[13px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 active:scale-95"
            >
              <Download size={14} /> <span className="max-md:hidden">Finance</span> Excel
            </button>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-slate-400">General ledger · totals per account · {range.label}</p>
        </div>

        <PeriodBar range={range} go={go} pending={pending} />

        <div className={`flex flex-col gap-5 transition-opacity ${pending ? "opacity-60" : ""}`}>
          <Explainer />

          {/* Headline figures */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 max-sm:last:col-span-2">
                <p className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg ring-1 ${c.chip}`}><c.Icon size={13} strokeWidth={2.5} /></span>
                  {c.label}
                </p>
                <p className={`mt-2.5 truncate font-display text-[20px] font-extrabold tracking-tight tabular-nums ${c.tone}`}>{c.value}</p>
                <p className="mt-0.5 truncate text-[11.5px] font-semibold text-slate-400">{c.sub}</p>
              </div>
            ))}
          </div>

          <AccountsLedger ledger={ledger} range={range} />

          <div className="grid items-start gap-5 min-[1100px]:grid-cols-[1.15fr_1fr]">
            <IncomeStatement ledger={ledger} />
            <Checks checks={ledger.checks} problems={problems} notes={notes} />
          </div>

          {/* Customizable pies */}
          <section aria-label="Custom analysis">
            <h2 className="mb-3 font-display text-[14px] font-extrabold text-slate-900">Custom analysis</h2>
            <div className="ad-cols-3 grid gap-4" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {pies.map((pie) => <PieCard key={pie.slot} pie={pie} options={options} />)}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// ─── Explainer ───────────────────────────────────────────────────────────────

function Explainer() {
  return (
    <details className="group rounded-2xl bg-sky-50/60 ring-1 ring-sky-100 open:bg-white open:shadow-sm open:ring-slate-200/80">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-[13px] font-extrabold text-sky-800 marker:hidden [&::-webkit-details-marker]:hidden">
        <Info size={15} className="shrink-0 text-sky-500" />
        Buku Besar vs Buku Kecil — how the two fit together
        <ChevronDown size={15} className="ml-auto shrink-0 text-sky-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-slate-100 px-4 pb-4 pt-3 text-[12.5px] leading-relaxed text-slate-600 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
          <p className="font-display text-[13px] font-extrabold text-slate-900">Buku Besar · General ledger</p>
          <p className="mt-1">A <b>summary per account</b>: Kas, Piutang Usaha, Pendapatan, Beban — each with its opening balance, what went in (debit), what went out (credit) and the closing balance. It is the control account, and the Laba Rugi below is built from it.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
          <p className="font-display text-[13px] font-extrabold text-slate-900">Buku Kecil · Subsidiary ledger</p>
          <p className="mt-1">The <b>detail behind one account</b>: Piutang → what each customer owes (aging, orders, WhatsApp reminder); Kas → every drawer movement. Use it to trace an error, chase a customer or check the day&apos;s cash.</p>
        </div>
        <p className="md:col-span-2">
          They must agree: the customer balances in Buku Kecil add up to Piutang Usaha here, and the drawer entries add up to Kas. The <b>checks</b> below prove it.
          <b> Revenue</b> is money <i>received</i> on orders (cash, transfer or QRIS, DPs included) — the same figure as the dashboard and the daily email.
        </p>
      </div>
    </details>
  );
}

// ─── Accounts ────────────────────────────────────────────────────────────────

function AccountsLedger({ ledger, range }: { ledger: GeneralLedger; range: FinanceRange }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (code: string) =>
    setOpen((prev) => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  const groups = (["asset", "revenue", "expense"] as const).map((g) => ({
    key: g, label: GROUP_LABEL[g], accounts: ledger.accounts.filter((a) => a.group === g),
  }));

  return (
    <section className="@container overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80" aria-label="Ledger accounts">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-3.5 md:px-5">
        <h2 className="font-display text-[15px] font-extrabold text-slate-900">Ledger accounts</h2>
        <p className="text-[12px] font-semibold text-slate-400">Tap an account for its breakdown</p>
      </div>

      {/* Wide enough: the classic ledger layout. Sized by the card itself (container
          query), not the screen — the sidebar takes a quarter of a tablet. */}
      <div className="hidden overflow-x-auto @[680px]:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              <th className="px-5 py-2.5 text-left">Account</th>
              <th className="px-3 py-2.5 text-right">Opening</th>
              <th className="px-3 py-2.5 text-right">Debit</th>
              <th className="px-3 py-2.5 text-right">Credit</th>
              <th className="px-3 py-2.5 text-right">Closing</th>
              <th className="w-10" />
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.key}>
              <tr>
                <td colSpan={6} className="border-y border-slate-100 bg-slate-50/60 px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{g.label}</td>
              </tr>
              {g.accounts.map((a) => {
                const isOpen = open.has(a.code);
                return (
                  <AccountRows key={a.code} account={a} isOpen={isOpen} onToggle={() => toggle(a.code)} range={range} />
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {/* Narrow: one card per account */}
      <div className="@[680px]:hidden">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="border-y border-slate-100 bg-slate-50/60 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{g.label}</p>
            {g.accounts.map((a) => (
              <AccountCard key={a.code} account={a} isOpen={open.has(a.code)} onToggle={() => toggle(a.code)} range={range} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function headline(a: LedgerAccount): { label: string; value: number } {
  if (a.group === "asset") return { label: "Closing", value: a.closing ?? 0 };
  return { label: "Total", value: a.group === "revenue" ? a.credit : a.debit };
}

function AccountRows({ account: a, isOpen, onToggle, range }: {
  account: LedgerAccount; isOpen: boolean; onToggle: () => void; range: FinanceRange;
}) {
  return (
    <>
      <tr
        onClick={onToggle} tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        aria-expanded={isOpen}
        className="cursor-pointer border-b border-slate-100 outline-none transition-colors hover:bg-sky-50/50 focus-visible:bg-sky-50"
      >
        <td className="px-5 py-3">
          <p className="font-bold text-slate-900">{a.name} <span className="ml-1 font-mono text-[11px] font-semibold text-slate-300">{a.code}</span></p>
          <p className="text-[11.5px] font-semibold text-slate-400">{a.caption}</p>
        </td>
        <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-500">{amt(a.opening)}</td>
        <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-800">{amt(a.debit)}</td>
        <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-800">{amt(a.credit)}</td>
        <td className="px-3 py-3 text-right font-extrabold tabular-nums text-slate-900">{a.closing === null ? <span className="font-semibold text-slate-300">—</span> : formatUSD(a.closing)}</td>
        <td className="pr-4 text-right"><ChevronDown size={15} className={`ml-auto text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} /></td>
      </tr>
      {isOpen && (
        <tr className="border-b border-slate-100 bg-slate-50/50">
          <td colSpan={6} className="px-5 py-3">
            <AccountDetail account={a} range={range} />
          </td>
        </tr>
      )}
    </>
  );
}

function AccountCard({ account: a, isOpen, onToggle, range }: {
  account: LedgerAccount; isOpen: boolean; onToggle: () => void; range: FinanceRange;
}) {
  const h = headline(a);
  return (
    <div className="border-b border-slate-100">
      <button type="button" onClick={onToggle} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold text-slate-900">{a.name}</p>
          <p className="truncate text-[11.5px] font-semibold text-slate-400">{a.caption}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[17px] font-extrabold tabular-nums text-slate-900">{formatUSD(h.value)}</p>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{h.label}</p>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {a.group === "asset" && (
        <dl className="grid grid-cols-3 gap-2 px-4 pb-3.5 text-center">
          {[["Opening", a.opening], ["Debit", a.debit], ["Credit", a.credit]].map(([k, v]) => (
            <div key={k as string} className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
              <dt className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">{k as string}</dt>
              <dd className="text-[12.5px] font-bold tabular-nums text-slate-700">{amt(v as number | null)}</dd>
            </div>
          ))}
        </dl>
      )}

      {isOpen && (
        <div className="bg-slate-50/60 px-4 py-3">
          <AccountDetail account={a} range={range} />
        </div>
      )}
    </div>
  );
}

function AccountDetail({ account: a, range }: { account: LedgerAccount; range: FinanceRange }) {
  return (
    <div className="space-y-2">
      {a.lines.length === 0 ? (
        <p className="py-1 text-[12.5px] font-semibold text-slate-400">Nothing recorded in this period.</p>
      ) : (
        <ul className="space-y-1.5">
          {a.lines.map((l) => (
            <li key={l.key} className="flex items-center gap-2.5 text-[12.5px]">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-600">{l.label}</span>
              <span className="shrink-0 text-[11px] font-semibold text-slate-400">{l.count}×</span>
              <span className="w-12 shrink-0 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">{l.side === "debit" ? "Debit" : "Credit"}</span>
              <span className="w-24 shrink-0 text-right font-bold tabular-nums text-slate-800">{formatUSD(l.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {a.sub && (
        <Link
          href={fill(a.sub.path, range)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-sky-700 hover:underline"
        >
          {a.sub.label} in detail <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

// ─── Laba Rugi ───────────────────────────────────────────────────────────────

function Row({ label, value, strong, indent, tone }: { label: string; value: number; strong?: boolean; indent?: boolean; tone?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${indent ? "pl-4" : ""}`}>
      <span className={`min-w-0 truncate ${strong ? "text-[13px] font-extrabold text-slate-900" : "text-[12.5px] font-semibold text-slate-500"}`}>{label}</span>
      <span className={`shrink-0 tabular-nums ${strong ? "text-[14px] font-extrabold" : "text-[12.5px] font-bold text-slate-700"} ${tone ?? (strong ? "text-slate-900" : "")}`}>{formatUSD(value)}</span>
    </div>
  );
}

function IncomeStatement({ ledger }: { ledger: GeneralLedger }) {
  const { statement: st, placed } = ledger;
  const pendapatanLain = ledger.accounts.find((a) => a.code === "4-2000");
  const beban          = ledger.accounts.find((a) => a.code === "5-1000");

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 md:p-5" aria-label="Laba Rugi">
      <h2 className="font-display text-[15px] font-extrabold text-slate-900">Laba Rugi <span className="text-[12px] font-semibold text-slate-400">· profit &amp; loss</span></h2>

      <div className="mt-3">
        <Row label="Laundry revenue (money received)" value={st.revenue} strong tone="text-emerald-700" />
        {st.byMethod.map((m) => (
          <Row key={m.method} indent label={`${{ cash: "Cash", transfer: "Bank transfer", qris: "QRIS", other: "Other / unknown" }[m.method]} · ${m.count}`} value={m.amount} />
        ))}
        {st.otherIncome > 0 && <Row label="Other income" value={st.otherIncome} strong />}
        {pendapatanLain?.lines.map((l) => <Row key={l.key} indent label={l.label} value={l.amount} />)}
        <div className="my-1.5 border-t border-dashed border-slate-200" />
        <Row label="Total income" value={st.totalIncome} strong />

        <div className="mt-3">
          <Row label="Expenses" value={st.expenses} strong tone="text-rose-600" />
          {beban?.lines.map((l) => <Row key={l.key} indent label={l.label} value={l.amount} />)}
          {(beban?.lines.length ?? 0) === 0 && <p className="pl-4 text-[12px] font-semibold text-slate-400">No expenses in this period.</p>}
        </div>

        <div className={`mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1 ${st.netProfit < 0 ? "bg-rose-50 ring-rose-200" : "bg-emerald-50 ring-emerald-200"}`}>
          <span className="text-[13px] font-extrabold text-slate-800">Net profit</span>
          <span className="text-right">
            <span className={`block font-display text-[20px] font-extrabold tabular-nums ${st.netProfit < 0 ? "text-rose-600" : "text-emerald-700"}`}>{formatUSD(st.netProfit)}</span>
            {st.margin !== null && <span className="text-[11px] font-bold text-slate-500">{(st.margin * 100).toFixed(1)}% of income</span>}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
        <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Same orders, counted by order date</p>
        <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-slate-600">
          <b className="text-slate-900">{placed.orders}</b> order{placed.orders === 1 ? "" : "s"} placed worth <b className="text-slate-900">{formatUSD(placed.value)}</b> —{" "}
          <b className="text-emerald-700">{formatUSD(placed.collected)}</b> received so far,{" "}
          <b className={placed.outstanding > 0 ? "text-amber-600" : "text-slate-900"}>{formatUSD(placed.outstanding)}</b> still owed.
          Revenue above counts the money on the day it arrived, so it can include payments on orders placed earlier.
        </p>
      </div>
    </section>
  );
}

// ─── Checks ──────────────────────────────────────────────────────────────────

function Checks({ checks, problems, notes }: { checks: GeneralLedger["checks"]; problems: number; notes: number }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 md:p-5" aria-label="Reconciliation">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[15px] font-extrabold text-slate-900">Reconciliation</h2>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${problems > 0 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
          {problems > 0 ? `${problems} to review` : notes > 0 ? "Balanced · 1 note" : "All balanced"}
        </span>
      </div>
      <p className="mt-1 text-[12px] font-semibold text-slate-400">Proof that the detail in Buku Kecil adds up to the totals above.</p>

      <ul className="mt-3 space-y-2.5">
        {checks.map((c) => (
          <li key={c.id} className={`flex gap-3 rounded-xl p-3 ring-1 ${c.status === "warn" ? "bg-amber-50/60 ring-amber-200" : "bg-white ring-slate-200/80"}`}>
            {c.status === "ok" && <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />}
            {c.status === "note" && <Info size={17} className="mt-0.5 shrink-0 text-sky-500" />}
            {c.status === "warn" && <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-500" />}
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-slate-800">{c.title}</p>
              <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-slate-500">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Pie card with inline editor ─────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 1px 2px rgba(15,23,42,0.05), 0 0 0 1px rgba(226,232,240,0.8)", ...style }}>
      {children}
    </div>
  );
}

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
            <button onClick={save} disabled={pending} aria-label="Save chart" style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a", padding: 2 }}>
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            </button>
            <button onClick={() => { setEditing(false); setTitle(pie.title); setKeys(pie.segments.map((s) => s.key)); }} aria-label="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} title="Customize" aria-label="Customize chart" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
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
