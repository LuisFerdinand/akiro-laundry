// components/admin/finance/PeriodBar.tsx
"use client";
//
// Period picker shared by Buku Besar and Buku Kecil: presets, quick ranges and a
// custom range on desktop; one compact select + the range picker on phones. It
// only changes the URL — the server page re-renders with the new period.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { FINANCE_PERIODS } from "@/lib/utils/business-time";
import { quickRanges, rangeQuery, type FinanceRange } from "@/lib/utils/finance-period";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

const localISO = (d: Date) => format(d, "yyyy-MM-dd");
const fromISO  = (iso: string) => new Date(`${iso}T00:00:00`);

/** URL navigation for a finance page; `keep` params (e.g. the active tab) survive period changes. */
export function useFinanceNav(basePath: string, keep: Record<string, string | undefined> = {}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const suffix = Object.entries(keep)
    .filter(([, v]) => v)
    .map(([k, v]) => `&${k}=${encodeURIComponent(v!)}`)
    .join("");

  return {
    pending,
    go:      (qs: string) => start(() => router.push(`${basePath}?${qs}${suffix}`, { scroll: false })),
    refresh: () => start(() => router.refresh()),
  };
}

interface Props {
  range:   FinanceRange;
  go:      (qs: string) => void;
  pending: boolean;
}

export function PeriodBar({ range, go, pending }: Props) {
  const quick        = quickRanges();
  const quickActive  = (q: { from: string; to: string }) => range.period === "custom" && range.from === q.from && range.to === q.to;
  const customActive = range.period === "custom" && !quick.some(quickActive);

  const pickRange = (r: DateRange | undefined) => {
    if (r?.from && r?.to) go(`from=${localISO(r.from)}&to=${localISO(r.to)}`);
  };

  const pill = (active: boolean) =>
    `h-8 shrink-0 rounded-full px-3.5 text-[12px] font-bold ring-1 transition active:scale-95 ${active
      ? "bg-sky-50 text-sky-700 ring-sky-300"
      : "bg-white text-slate-500 ring-slate-200 hover:text-slate-800 hover:ring-slate-300"}`;

  // The phone select needs a value for every state, including "some custom range".
  const selectValue = customActive ? "current" : rangeQuery(range);

  const picker = (
    <div className={customActive ? "rounded-xl ring-2 ring-sky-300" : ""}>
      <DateRangePicker
        key={`${range.from}:${range.to}`}
        value={range.period === "custom" ? { from: fromISO(range.from), to: fromISO(range.to) } : undefined}
        onChange={pickRange}
        align="left" size="sm"
      />
    </div>
  );

  return (
    <div className={`transition-opacity ${pending ? "opacity-60" : ""}`}>
      {/* Desktop / tablet */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {FINANCE_PERIODS.map((p) => (
          <button key={p.value} type="button" onClick={() => go(`period=${p.value}`)} className={pill(range.period === p.value)}>{p.label}</button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
        {quick.map((q) => (
          <button key={q.label} type="button" onClick={() => go(`from=${q.from}&to=${q.to}`)} className={pill(quickActive(q))}>{q.label}</button>
        ))}
        {picker}
      </div>

      {/* Phones */}
      <div className="flex items-center gap-2 md:hidden">
        <select
          aria-label="Period"
          value={selectValue}
          onChange={(e) => { if (e.target.value !== "current") go(e.target.value); }}
          className="h-10 min-w-0 flex-1 rounded-xl bg-white px-3 text-[13px] font-bold text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-sky-300"
        >
          {customActive && <option value="current">{range.label}</option>}
          <optgroup label="Periods">
            {FINANCE_PERIODS.map((p) => <option key={p.value} value={`period=${p.value}`}>{p.label}</option>)}
          </optgroup>
          <optgroup label="Quick ranges">
            {quick.map((q) => <option key={q.label} value={`from=${q.from}&to=${q.to}`}>{q.label}</option>)}
          </optgroup>
        </select>
        {picker}
      </div>
    </div>
  );
}
