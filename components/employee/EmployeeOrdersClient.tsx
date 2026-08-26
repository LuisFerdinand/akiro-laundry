// components/employee/EmployeeOrdersClient.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, X, ChevronDown, Package, Plus, Loader2 } from "lucide-react";
import {
  formatUSD,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/utils/order-form";
import { updateOrderStatus, type OrderWithDetails, type EmployeeOrderFilters } from "@/lib/actions/orders";
import { DeleteOrderButton } from "@/components/shared/DeleteOrderButton";
import { EditedBadge } from "@/components/shared/EditedBadge";
import { WhatsAppNotify } from "@/components/employee/WhatsAppNotify";
import type { Order } from "@/lib/db/schema";
import type { WaTemplateData } from "@/lib/actions/wa-templates";

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_VALUES: Order["status"][] = ["pending", "processing", "done", "picked_up"];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  ...STATUS_VALUES.map((v) => ({ value: v, label: ORDER_STATUS_LABELS[v] })),
];

// ─── Inline status control — styled native <select> ─────────────────────────
// A custom (base-ui Menu) dropdown was tried here, but a native select is far
// more reliable across devices (and gives mobile staff the OS's own big-target
// picker for free) — worth more than the extra visual polish.
//
// The select is hidden with `opacity-0` (not `text-transparent`/`color`) —
// Chromium inherits an element's `color` into its native <option> popup, so
// making the select's text transparent also makes every option in the
// dropdown list invisible when opened. Opacity doesn't have that problem.

function StatusDropdown({
  status,
  isPending,
  onChange,
}: {
  status:    Order["status"];
  isPending: boolean;
  onChange:  (next: Order["status"]) => void;
}) {
  return (
    <div className={`relative w-[126px] sm:w-full h-8 rounded-full transition-opacity ${ORDER_STATUS_COLORS[status]} ${isPending ? "opacity-70" : ""}`}>
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value as Order["status"])}
        className="absolute inset-0 w-full h-full pl-2.5 pr-5 rounded-full opacity-0 text-xs font-bold outline-none appearance-none cursor-pointer disabled:cursor-wait"
      >
        {STATUS_VALUES.map((s) => (
          <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
        ))}
      </select>
      <div className="absolute inset-0 flex items-center justify-between gap-0.5 px-2 pointer-events-none">
        <span className="flex items-center gap-1 truncate">
          {isPending && <Loader2 size={11} className="animate-spin shrink-0" />}
          {ORDER_STATUS_LABELS[status]}
        </span>
        <ChevronDown size={10} className="shrink-0 opacity-60" />
      </div>
    </div>
  );
}

// ─── Single order row ────────────────────────────────────────────────────────

function OrderRow({
  order,
  templateData,
  zebra,
}: {
  order:        OrderWithDetails;
  templateData: WaTemplateData | null;
  zebra:        boolean;
}) {
  const [status,    setStatus]       = useState<Order["status"]>(order.status);
  const [isPending, startTransition] = useTransition();

  const servicesSummary = order.items.length > 0
    ? order.items.map((it) => it.serviceName).join(" + ")
    : "—";

  const handleStatusChange = (next: Order["status"]) => {
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, next);
      if (!result.success) {
        setStatus(prev);
        toast.error(result.error ?? "Failed to update status.");
      } else {
        toast.success(`${order.customerName} → ${ORDER_STATUS_LABELS[next]}`);
      }
    });
  };

  const cell = "px-2.5 sm:px-3 py-2.5 border-t border-border align-middle overflow-hidden";

  return (
    <tr className={`${zebra ? "bg-muted/40" : "bg-white"} hover:bg-brand-soft/70 transition-colors`}>
      <td className={cell}>
        <Link href={`/employee/orders/${order.id}`} className="flex items-center gap-2 group min-w-0">
          <div className="akiro-avatar akiro-avatar--sm akiro-avatar--brand shrink-0">
            <span>{order.customerName[0].toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[13px] text-foreground group-hover:text-brand truncate max-w-[140px] sm:max-w-none transition-colors">
              {order.customerName}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground font-mono truncate">{order.orderNumber}</p>
              <EditedBadge editCount={order.editCount} compact />
            </div>
          </div>
        </Link>
      </td>

      <td className={cell}>
        <p className="text-xs text-foreground/70 truncate max-w-[220px] sm:max-w-none">
          {servicesSummary}
          {order.items.length > 1 ? ` (${order.items.length})` : ""}
        </p>
      </td>

      <td className={`${cell} whitespace-nowrap`}>
        <span className="font-black text-[13px] text-foreground">{formatUSD(parseFloat(order.totalPrice))}</span>
      </td>

      <td className={cell}>
        <StatusDropdown status={status} isPending={isPending} onChange={handleStatusChange} />
      </td>

      <td className={`${cell} whitespace-nowrap`}>
        <span className="text-[11px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
      </td>

      <td className={cell}>
        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
          <WhatsAppNotify
            customerPhone={order.customerPhone}
            customerName={order.customerName}
            orderNumber={order.orderNumber}
            servicesSummary={servicesSummary}
            status={status}
            paymentStatus={order.paymentStatus}
            totalPrice={parseFloat(order.totalPrice)}
            notes={order.notes}
            templateData={templateData}
            compact
          />
          <DeleteOrderButton orderId={order.id} orderNumber={order.orderNumber} compact />
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  orders:         OrderWithDetails[];
  initialFilters: EmployeeOrderFilters;
  templateData:   WaTemplateData | null;
}

export function EmployeeOrdersClient({ orders, initialFilters, templateData }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [status, setStatus] = useState(initialFilters.status ?? "all");
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearch(initialFilters.search ?? "");
    setStatus(initialFilters.status ?? "all");
  }, [initialFilters.search, initialFilters.status]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const pushUrl = (overrides: { search?: string; status?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());
    const next = {
      search: "search" in overrides ? overrides.search : search,
      status: "status" in overrides ? overrides.status : status,
    };
    if (next.search)            sp.set("search", next.search); else sp.delete("search");
    if (next.status !== "all")  sp.set("status", next.status!); else sp.delete("status");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl({ search: v }), 350);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    pushUrl({ search: "" });
  };

  const handleStatusFilter = (v: string) => {
    setStatus(v);
    pushUrl({ status: v });
  };

  const hasActiveFilters = !!search || status !== "all";

  return (
    <div className="space-y-4 pb-24 pt-2">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1
            className="font-extrabold text-2xl text-foreground tracking-tight"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Orders
          </h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
            {orders.length} {orders.length === 1 ? "order" : "orders"} found
          </p>
        </div>
        <Link
          href="/employee/orders/new"
          className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-full transition-transform active:scale-95 shrink-0"
          style={{
            background: "linear-gradient(145deg, #2496d6, #1a7fba)",
            boxShadow: "0 4px 14px rgba(26,127,186,0.38)",
          }}
        >
          <Plus size={13} strokeWidth={3} />
          New Order
        </Link>
      </div>

      {/* ── Search + filter toolbar ───────────────────────────── */}
      <div className="app-card p-3.5 space-y-3.5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, phone, or order number…"
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-border bg-muted/50 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:bg-white focus:border-brand/50 focus:ring-2 focus:ring-brand/15 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1">
          {STATUS_FILTERS.map((s) => {
            const active = status === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => handleStatusFilter(s.value)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  active
                    ? "text-white"
                    : "bg-brand-soft text-brand-dark/70 hover:bg-brand-muted"
                }`}
                style={active ? { background: "linear-gradient(135deg, #2496d6, #1a7fba)" } : undefined}
              >
                {s.label}
              </button>
            );
          })}
          {isPending && <Loader2 size={13} className="animate-spin text-muted-foreground/50 shrink-0" />}
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-brand-soft border-2 border-brand-muted flex items-center justify-center">
            <Package size={24} className="text-brand/70" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-foreground text-sm">
              {hasActiveFilters ? "No orders match your filters" : "No orders yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? "Try a different search or status" : "Orders you create will appear here"}
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => { setSearch(""); setStatus("all"); pushUrl({ search: "", status: "all" }); }}
              className="mt-1 bg-muted text-foreground/70 text-sm font-bold px-6 py-3 rounded-full hover:bg-brand-muted transition-colors active:scale-95"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/employee/orders/new"
              className="mt-1 text-white text-sm font-bold px-6 py-3 rounded-full transition-transform active:scale-95"
              style={{
                background: "linear-gradient(145deg, #2496d6, #1a7fba)",
                boxShadow: "0 4px 16px rgba(26,127,186,0.35)",
              }}
            >
              Create first order →
            </Link>
          )}
        </div>
      ) : (
        /* ── Table ────────────────────────────────────────── */
        <div className="app-card overflow-hidden">
          {/* This div is the actual scroll container (both axes), so `sticky
              top-0` on the header row below sticks correctly. It used to be
              `overflow-x-auto` only, but overflow-x:auto forces overflow-y to
              auto as well — silently making this div its own (non-scrolling)
              sticky containing block and breaking the header entirely. */}
          <div className="overflow-auto max-h-[65vh]">
            {/* table-fixed + explicit % widths (from sm up) so all six columns
                always sum to the container's width — no horizontal scroll on
                tablet/desktop. Below sm the table reverts to auto layout and
                the outer div's overflow-auto handles narrow phones instead. */}
            <table className="w-full border-collapse text-sm sm:table-fixed">
              <thead>
                <tr className="bg-muted/60 sticky top-0 z-10">
                  {[
                    { label: "Customer", width: "22%" },
                    { label: "Services", width: "21%" },
                    { label: "Total",    width: "8%"  },
                    { label: "Status",   width: "22%" },
                    { label: "Date",     width: "8%"  },
                    { label: "",         width: "19%" },
                  ].map((h) => (
                    <th
                      key={h.label || "actions"}
                      className="px-2.5 sm:px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap"
                      style={{ fontFamily: "Sora, sans-serif", width: h.width }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <OrderRow key={order.id} order={order} templateData={templateData} zebra={i % 2 === 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
