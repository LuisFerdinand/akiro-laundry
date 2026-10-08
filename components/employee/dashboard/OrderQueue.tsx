// components/employee/dashboard/OrderQueue.tsx
// Dashboard list with two tabs: orders ready for pickup (longest-waiting first,
// with one-tap WhatsApp "it's ready") and the latest orders taken.
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, PartyPopper } from "lucide-react";
import { formatUSD } from "@/lib/utils/order-form";
import { formatDayTimeBiz, timeAgoShort } from "@/lib/utils/business-time";
import { paymentBalance } from "@/lib/utils/order-payment";
import { WhatsAppNotify } from "@/components/employee/WhatsAppNotify";
import {
  CustomerAvatar, PaymentBadge, StatusBadge, PAYMENT_ACCENT, serviceNames,
} from "@/components/employee/order-ui";
import type { OrderListRow } from "@/lib/actions/orders";
import type { WaTemplateData } from "@/lib/actions/wa-templates";

type Tab = "ready" | "latest";

interface Props {
  ready:        OrderListRow[];
  readyTotal:   number;
  latest:       OrderListRow[];
  /** Server render time (ISO) — keeps relative labels identical on server and client. */
  now:          string;
  templateData: WaTemplateData | null;
}

export function OrderQueue({ ready, readyTotal, latest, now, templateData }: Props) {
  const [tab, setTab] = useState<Tab>(ready.length > 0 ? "ready" : "latest");
  const rows    = tab === "ready" ? ready : latest;
  const nowDate = new Date(now);

  return (
    <section className="overflow-hidden rounded-[28px] bg-white ring-1 ring-slate-200/80 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-5 pt-4">
        <div role="tablist" aria-label="Order lists" className="inline-flex rounded-2xl bg-slate-100 p-1">
          {([
            { key: "ready",  label: "Ready for pickup", count: readyTotal },
            { key: "latest", label: "Latest orders",    count: null },
          ] as const).map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-extrabold transition-colors ${
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  tab === t.key ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link
          href={tab === "ready" ? "/employee/orders?status=done&sort=date&dir=asc" : "/employee/orders"}
          className="flex items-center gap-0.5 rounded-full px-3 py-2 text-xs font-bold text-brand hover:bg-brand-soft"
        >
          See all <ChevronRight size={14} />
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex w-12 h-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
            <PartyPopper size={22} />
          </span>
          <p className="font-display text-sm font-extrabold text-slate-800">
            {tab === "ready" ? "Nothing waiting for pickup" : "No orders yet"}
          </p>
          <p className="text-xs font-semibold text-slate-400">
            {tab === "ready" ? "All clear — every finished order has gone home ✨" : "New orders will show up here."}
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 pb-1">
          {rows.map((o) => {
            const total   = parseFloat(o.totalPrice);
            const balance = paymentBalance(o);
            const ago     = timeAgoShort(o.updatedAt, nowDate);
            return (
              <li key={o.id} className="relative">
                <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${PAYMENT_ACCENT[o.paymentStatus]}`} />
                <div className="flex items-center gap-3 px-4 md:px-5 py-3">
                  <Link href={`/employee/orders/${o.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                    <CustomerAvatar name={o.customerName} size={42} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-slate-900 group-hover:text-brand">
                        {o.customerName}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-400">
                        <span className="font-mono">{o.orderNumber}</span>
                        {" · "}
                        {tab === "ready"
                          ? (ago === "just now" ? "ready just now" : `ready ${ago} ago`)
                          : formatDayTimeBiz(o.createdAt, nowDate)}
                      </p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-display text-[15px] font-extrabold text-slate-900 tabular-nums">
                      {formatUSD(total)}
                    </span>
                    {tab === "ready" ? <PaymentBadge order={o} /> : <StatusBadge status={o.status} />}
                  </div>
                  <WhatsAppNotify
                    customerPhone={o.customerPhone}
                    customerName={o.customerName}
                    orderNumber={o.orderNumber}
                    servicesSummary={serviceNames(o.items)}
                    status={o.status}
                    paymentStatus={o.paymentStatus}
                    totalPrice={total}
                    balanceDue={balance.balanceDue}
                    notes={o.notes}
                    templateData={templateData}
                    compact
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
