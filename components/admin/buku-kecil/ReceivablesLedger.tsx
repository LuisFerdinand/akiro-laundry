// components/admin/buku-kecil/ReceivablesLedger.tsx
"use client";
//
// Buku Kecil › Receivables (Piutang per pelanggan): the subsidiary ledger behind
// the Piutang Usaha account in Buku Besar. Who owes what, how long it has been
// owing, and one tap to remind them on WhatsApp. Its total equals the account.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ChevronDown, MessageCircle, Search, X } from "lucide-react";
import type { CustomerReceivable, ReceivablesLedger as Ledger } from "@/lib/actions/receivables";
import { BUCKET_TONE, bucketOf, type AgingBucket } from "@/lib/utils/receivables";
import { ORDER_STATUS_LABELS, formatUSD } from "@/lib/utils/order-form";
import { formatBiz } from "@/lib/utils/business-time";
import { waMeLink } from "@/lib/utils/wa-send";

type SortKey = "oldest" | "largest" | "name";
const SORTS: { value: SortKey; label: string }[] = [
  { value: "oldest",  label: "Oldest first" },
  { value: "largest", label: "Largest balance" },
  { value: "name",    label: "Name A–Z" },
];

const day = (iso: string) => formatBiz(new Date(iso), { month: "short", day: "numeric" });
const ageText = (d: number) => (d === 0 ? "today" : `${d}d`);

function reminder(c: CustomerReceivable): string {
  const orders = c.orders.map((o) => o.orderNumber).join(", ");
  return `Hello ${c.name.split(" ")[0]}, this is Akiro Laundry. A friendly reminder that you have an outstanding balance of ${formatUSD(c.balance)} for ${c.orders.length === 1 ? "order" : "orders"} ${orders}. Thank you!`;
}

export function ReceivablesLedger({ ledger }: { ledger: Ledger }) {
  const [query,  setQuery]  = useState("");
  const [bucket, setBucket] = useState<AgingBucket | "all">("all");
  const [sort,   setSort]   = useState<SortKey>("oldest");
  const [open,   setOpen]   = useState<Set<number>>(new Set());

  // Picking an age band narrows each customer to the orders in that band, so the
  // list and its footer total always match the band's amount.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inBand: CustomerReceivable[] = ledger.customers.flatMap((c) => {
      if (bucket === "all") return [c];
      const orders = c.orders.filter((o) => bucketOf(o.ageDays) === bucket);
      if (orders.length === 0) return [];
      return [{
        ...c, orders,
        balance:   Math.round(orders.reduce((sum, o) => sum + o.balance, 0) * 100) / 100,
        oldestAge: Math.max(...orders.map((o) => o.ageDays)),
        bucket,
      }];
    });
    return inBand
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.orders.some((o) => o.orderNumber.toLowerCase().includes(q)))
      .sort((a, b) =>
        sort === "largest" ? b.balance - a.balance
        : sort === "name"  ? a.name.localeCompare(b.name)
        : b.oldestAge - a.oldestAge || b.balance - a.balance);
  }, [ledger.customers, query, bucket, sort]);

  const toggle = (id: number) =>
    setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const fullById = new Map(ledger.customers.map((c) => [c.customerId, c]));
  const oldest = ledger.customers.reduce((m, c) => Math.max(m, c.oldestAge), 0);
  const total  = ledger.total || 1;

  if (ledger.customers.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/80">
        <CheckCircle2 size={34} className="mx-auto text-emerald-500" />
        <p className="mt-3 font-display text-[16px] font-extrabold text-slate-800">Nobody owes you anything</p>
        <p className="mt-1 text-[13px] font-semibold text-slate-400">Every order placed up to {ledger.asOf} has been paid in full.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Headline figures */}
      <div className="flex flex-wrap gap-3">
        <div className="w-full rounded-2xl bg-gradient-to-br from-[#0c1e35] via-[#0f3460] to-[#1a5276] p-4 text-white shadow-lg shadow-slate-900/15 min-[1000px]:w-auto min-[1000px]:flex-[1.4]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Total owed · Piutang Usaha</p>
          <p className="mt-1.5 font-display text-[26px] font-extrabold leading-none tracking-tight tabular-nums">{formatUSD(ledger.total)}</p>
          <p className="mt-1.5 text-[11.5px] font-semibold text-white/50">as of {ledger.asOf}</p>
        </div>
        {[
          { label: "Customers", more: " owing",    value: String(ledger.customers.length) },
          { label: "Orders",    more: " open",     value: String(ledger.orders) },
          { label: "Oldest",    more: " unpaid",   value: oldest === 0 ? "today" : `${oldest} days`, tone: oldest > 30 ? "text-rose-600" : oldest > 14 ? "text-orange-600" : "text-slate-900" },
        ].map((c) => (
          <div key={c.label} className="min-w-[96px] flex-1 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 md:p-4">
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">{c.label}<span className="max-md:hidden">{c.more}</span></p>
            <p className={`mt-2 truncate font-display text-[20px] font-extrabold tracking-tight tabular-nums md:text-[22px] ${c.tone ?? "text-slate-900"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Aging */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80" aria-label="Aging">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[14px] font-extrabold text-slate-900">How long it has been owing</h3>
          {bucket !== "all" && (
            <button type="button" onClick={() => setBucket("all")} className="inline-flex items-center gap-1 text-[12px] font-bold text-sky-700 hover:underline">
              <X size={12} /> Show all
            </button>
          )}
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Receivables by age">
          {ledger.aging.map((a) => a.amount > 0 && (
            <span key={a.key} className={BUCKET_TONE[a.key].bar} style={{ width: `${(a.amount / total) * 100}%` }} title={`${a.label}: ${formatUSD(a.amount)}`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 min-[700px]:grid-cols-4">
          {ledger.aging.map((a) => {
            const active = bucket === a.key;
            return (
              <button
                key={a.key} type="button" disabled={a.amount === 0}
                onClick={() => setBucket(active ? "all" : a.key)}
                aria-pressed={active}
                className={`rounded-xl px-3 py-2.5 text-left ring-1 transition active:scale-[0.98] disabled:opacity-45 ${active ? "bg-sky-50 ring-sky-300" : "bg-slate-50 ring-slate-200/80 hover:ring-slate-300"}`}
              >
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500">
                  <i className={`h-2 w-2 rounded-full ${BUCKET_TONE[a.key].bar}`} /> {a.label}
                </p>
                <p className="mt-0.5 font-display text-[16px] font-extrabold tabular-nums text-slate-900">{formatUSD(a.amount)}</p>
                <p className="text-[11px] font-semibold text-slate-400">{a.customers} customer{a.customers === 1 ? "" : "s"}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* List */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80" aria-label="Customers owing">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, phone or order…" aria-label="Search receivables"
              className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-9 text-[13px] font-semibold text-slate-800 outline-none ring-1 ring-slate-200 placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-300"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort"
            className="h-10 rounded-xl bg-white px-3 text-[13px] font-bold text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-sky-300"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] font-semibold text-slate-400">No customer matches.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => (
              <CustomerRow
                key={c.customerId} c={c} full={fullById.get(c.customerId) ?? c}
                isOpen={open.has(c.customerId)} onToggle={() => toggle(c.customerId)}
              />
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px]">
          <span className="font-bold text-slate-500">
            {rows.length === ledger.customers.length ? `${rows.length} customers` : `${rows.length} of ${ledger.customers.length} customers`}
          </span>
          <span className="font-extrabold tabular-nums text-slate-900">
            {formatUSD(rows.reduce((s, c) => s + c.balance, 0))}
          </span>
        </div>
      </section>
    </div>
  );
}

function CustomerRow({ c, full, isOpen, onToggle }: {
  c: CustomerReceivable; full: CustomerReceivable; isOpen: boolean; onToggle: () => void;
}) {
  const tone = BUCKET_TONE[c.bucket];
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sky-50/50 active:bg-slate-50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white" style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6)" }}>
          {c.name[0]?.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-[14px] font-extrabold leading-snug text-slate-900">{c.name}</span>
          <span className="block truncate text-[11.5px] font-semibold text-slate-400">
            {c.orders.length} open order{c.orders.length === 1 ? "" : "s"}{c.phone && <span className="max-md:hidden"> · {c.phone}</span>}
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${tone.chip}`}>{ageText(c.oldestAge)}</span>
        <span className="w-20 shrink-0 text-right font-display text-[15px] font-extrabold tabular-nums text-slate-900 md:w-24">{formatUSD(c.balance)}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="space-y-3 bg-slate-50/70 px-4 pb-4 pt-1">
          <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80">
            {c.orders.map((o) => (
              <li key={o.id} className="border-b border-slate-100 last:border-0">
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-3.5 py-3 hover:bg-sky-50/50">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[12.5px] font-bold text-sky-700">{o.orderNumber}</span>
                      <span className={`text-[11px] font-extrabold ${BUCKET_TONE[bucketOf(o.ageDays)].text}`}>{day(o.createdAt)} · {ageText(o.ageDays)}</span>
                    </span>
                    <span className="mt-0.5 block text-[11.5px] font-semibold text-slate-400">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      {o.paid > 0 ? ` · ${formatUSD(o.paid)} paid of ${formatUSD(o.total)}` : ` · total ${formatUSD(o.total)}`}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-slate-900">{formatUSD(o.balance)}</span>
                  <ArrowUpRight size={14} className="shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {c.phone && (
              <a
                href={waMeLink(c.phone, reminder(full))} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[13px] font-extrabold text-white shadow-sm shadow-emerald-600/20 active:scale-95 min-[480px]:flex-none"
              >
                <MessageCircle size={15} /> WhatsApp<span className="max-md:hidden"> reminder</span>
              </a>
            )}
            <Link
              href={`/admin/customers/${c.customerId}`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 active:scale-95 min-[480px]:flex-none"
            >
              <span className="md:hidden">Profile</span><span className="max-md:hidden">Customer profile</span> <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}
