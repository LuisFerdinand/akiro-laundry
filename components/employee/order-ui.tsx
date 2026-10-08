// components/employee/order-ui.tsx
// Order visuals shared by the employee dashboard and the orders list, so a
// payment or status reads the same everywhere. Money owed is the loudest thing
// on screen (solid rose / amber badges); settled orders stay calm.
import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { formatUSD, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import { paymentBalance, type OrderPaymentState } from "@/lib/utils/order-payment";
import type { Order } from "@/lib/db/schema";

// ─── Status ──────────────────────────────────────────────────────────────────

export const STATUS_STYLES: Record<Order["status"], { pill: string; dot: string }> = {
  pending:    { pill: "bg-amber-50 text-amber-800 ring-amber-200",       dot: "bg-amber-400"   },
  processing: { pill: "bg-sky-50 text-sky-800 ring-sky-200",             dot: "bg-sky-500"     },
  done:       { pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  picked_up:  { pill: "bg-slate-100 text-slate-600 ring-slate-200",      dot: "bg-slate-400"   },
};

export function StatusBadge({ status }: { status: Order["status"] }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 whitespace-nowrap ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Payment ─────────────────────────────────────────────────────────────────

/** Left-edge accent for rows that still owe money — settled rows get none. */
export const PAYMENT_ACCENT: Record<Order["paymentStatus"], string> = {
  unpaid:  "bg-rose-500",
  partial: "bg-amber-400",
  paid:    "bg-transparent",
};

export const PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  unpaid:  "Unpaid",
  partial: "DP",
  paid:    "Paid",
};

/** `showDue` — include the DP balance; off where a Collect button already shows it. */
export function PaymentBadge({ order, showDue = true }: { order: OrderPaymentState; showDue?: boolean }) {
  if (order.paymentStatus === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap">
        <CheckCircle2 size={12} strokeWidth={2.5} />
        Paid
      </span>
    );
  }
  if (order.paymentStatus === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm shadow-amber-500/30 whitespace-nowrap">
        <Clock3 size={12} strokeWidth={2.5} />
        {showDue ? `DP · ${formatUSD(paymentBalance(order).balanceDue)} due` : "DP"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm shadow-rose-500/30 whitespace-nowrap">
      <CircleAlert size={12} strokeWidth={2.5} />
      Unpaid
    </span>
  );
}

// ─── Customer avatar ─────────────────────────────────────────────────────────

const AVATAR_TONES = [
  "from-sky-100 to-sky-200 text-sky-800",
  "from-violet-100 to-violet-200 text-violet-800",
  "from-emerald-100 to-emerald-200 text-emerald-800",
  "from-amber-100 to-amber-200 text-amber-800",
  "from-rose-100 to-rose-200 text-rose-800",
  "from-teal-100 to-teal-200 text-teal-800",
  "from-indigo-100 to-indigo-200 text-indigo-800",
  "from-orange-100 to-orange-200 text-orange-800",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** A soft colour per customer (stable for the same name) so rows are easy to tell apart. */
export function CustomerAvatar({ name, size = 40, className = "inline-flex" }: { name: string; size?: number; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <span
      aria-hidden
      className={`shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br font-display font-extrabold ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {initials(name)}
    </span>
  );
}

// ─── Services ────────────────────────────────────────────────────────────────

interface ServiceLine {
  serviceName: string;
  weightKg:    string | null;
  quantity:    number | null;
}

function lineQuantity(it: ServiceLine): string {
  if (it.quantity != null) return `${it.quantity} pcs`;
  if (it.weightKg != null) return `${parseFloat(it.weightKg)} kg`;
  return "";
}

/** First service line ("Cuci Setrika · 5.5 kg") plus how many more there are. */
export function serviceSummary(items: ServiceLine[]): { main: string; more: number } {
  if (items.length === 0) return { main: "—", more: 0 };
  const qty = lineQuantity(items[0]);
  return { main: qty ? `${items[0].serviceName} · ${qty}` : items[0].serviceName, more: items.length - 1 };
}

/** All service names joined — the WhatsApp message's {{servicesSummary}}. */
export function serviceNames(items: ServiceLine[]): string {
  return items.length > 0 ? items.map((it) => it.serviceName).join(" + ") : "—";
}
