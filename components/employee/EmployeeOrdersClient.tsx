// components/employee/EmployeeOrdersClient.tsx
// Employee orders list. Search, filters, sort and page all live in the URL and
// are applied on the server (lib/actions/orders.ts → getOrderList), so sorting
// and counts always cover every order, not just one page. Chips update
// instantly (optimistic) while the new page loads.
//
// What an order still owes is the loudest thing in a row: a coloured edge plus
// a solid "Unpaid" / "DP" badge with a one-tap Collect button. Paid rows stay calm.
"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight,
  Loader2, Package, Plus, Search, X,
} from "lucide-react";
import { formatUSD, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import { formatDayTimeBiz, timeAgoShort } from "@/lib/utils/business-time";
import { paymentBalance } from "@/lib/utils/order-payment";
import {
  DEFAULT_ORDER_LIST_QUERY,
  DEFAULT_SORT_DIR,
  hasOrderListFilters,
  orderListSearch,
  type DateRangeFilter,
  type OrderListQuery,
  type OrderSortKey,
  type OrderStatusFilter,
  type PaymentFilter,
} from "@/lib/utils/order-query";
import { updateOrderStatus, type OrderListResult, type OrderListRow } from "@/lib/actions/orders";
import { DeleteOrderButton } from "@/components/shared/DeleteOrderButton";
import { EditedBadge } from "@/components/shared/EditedBadge";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { WhatsAppNotify } from "@/components/employee/WhatsAppNotify";
import { PaymentModal } from "@/components/employee/PaymentModal";
import {
  CustomerAvatar, PaymentBadge, PAYMENT_ACCENT, PAYMENT_LABELS, STATUS_STYLES, serviceNames, serviceSummary,
} from "@/components/employee/order-ui";
import type { Order } from "@/lib/db/schema";
import type { WaTemplateData } from "@/lib/actions/wa-templates";

// ─── Options ─────────────────────────────────────────────────────────────────

const STATUS_VALUES: Order["status"][] = ["pending", "processing", "done", "picked_up"];

const STATUS_TABS: { value: OrderStatusFilter; label: string; dot?: string }[] = [
  { value: "all",        label: "All" },
  { value: "active",     label: "In shop" },
  { value: "pending",    label: "Pending",    dot: STATUS_STYLES.pending.dot },
  { value: "processing", label: "Processing", dot: STATUS_STYLES.processing.dot },
  { value: "done",       label: "Done",       dot: STATUS_STYLES.done.dot },
  { value: "picked_up",  label: "Picked up",  dot: STATUS_STYLES.picked_up.dot },
];

const PAYMENT_CHIPS: { value: Exclude<PaymentFilter, "all">; dot: string; active: string }[] = [
  { value: "unpaid",  dot: "bg-rose-500",    active: "bg-rose-500 text-white ring-rose-500 shadow-sm shadow-rose-500/30" },
  { value: "partial", dot: "bg-amber-400",   active: "bg-amber-500 text-white ring-amber-500 shadow-sm shadow-amber-500/30" },
  { value: "paid",    dot: "bg-emerald-500", active: "bg-emerald-500 text-white ring-emerald-500 shadow-sm shadow-emerald-500/30" },
];

const RANGE_OPTIONS: { value: Exclude<DateRangeFilter, "custom">; label: string }[] = [
  { value: "all",   label: "All time" },
  { value: "today", label: "Today"    },
  { value: "7d",    label: "7 days"   },
  { value: "30d",   label: "30 days"  },
];

/** Sort presets for the phone layout, which has no column headers. */
const SORT_PRESETS: { label: string; sort: OrderSortKey; dir: "asc" | "desc" }[] = [
  { label: "Newest first",      sort: "date",     dir: "desc" },
  { label: "Oldest first",      sort: "date",     dir: "asc"  },
  { label: "Unpaid first",      sort: "payment",  dir: "asc"  },
  { label: "Total: high → low", sort: "total",    dir: "desc" },
  { label: "Total: low → high", sort: "total",    dir: "asc"  },
  { label: "Customer A → Z",    sort: "customer", dir: "asc"  },
  { label: "Status",            sort: "status",   dir: "asc"  },
];

const METHOD_LABELS: Record<string, string> = { cash: "Cash", transfer: "Transfer", qris: "QRIS" };

/** yyyy-mm-dd in the tablet's local time (the shop's own timezone). */
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromLocalISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  result:       OrderListResult;
  query:        OrderListQuery;
  /** Server render time (ISO) — keeps "Today / Yesterday" identical on server and client. */
  now:          string;
  templateData: WaTemplateData | null;
}

export function EmployeeOrdersClient({ result, query, now, templateData }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const nowDate  = new Date(now);

  const [isPending, startTransition] = useTransition();
  // Shows a clicked filter right away; settles on the server's answer.
  const [view, setOptimisticView] = useOptimistic(query);
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  const tableTopRef = useRef<HTMLDivElement>(null);
  const [payOrder, setPayOrder] = useState<OrderListRow | null>(null);

  const navigate = (patch: Partial<OrderListQuery>) => {
    const next: OrderListQuery = { ...viewRef.current, page: 1, ...patch };
    startTransition(() => {
      setOptimisticView(next);
      router.push(`${pathname}${orderListSearch(next)}`, { scroll: false });
    });
  };

  // ── Search box (debounced) ────────────────────────────────────────────────
  const [searchInput, setSearchInput]   = useState(query.search);
  const [pushedSearch, setPushedSearch] = useState(query.search);
  const [seenSearch, setSeenSearch]     = useState(query.search);
  if (query.search !== seenSearch) {
    setSeenSearch(query.search);
    // Our own debounced push coming back: leave the box alone (the user may
    // have typed on). Anything else — back button, a dashboard link — wins.
    if (query.search !== pushedSearch) {
      setSearchInput(query.search);
      setPushedSearch(query.search);
    }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const pushSearch = (value: string) => {
    const term = value.trim();
    setPushedSearch(term);
    navigate({ search: term });
  };
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushSearch(value), 350);
  };
  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    pushSearch("");
  };

  // ── Custom date range (committed once both ends are picked) ───────────────
  const [partialRange, setPartialRange] = useState<DateRange | undefined>();
  const committedRange: DateRange | undefined =
    view.range === "custom" && view.from
      ? { from: fromLocalISO(view.from), to: fromLocalISO(view.to || view.from) }
      : undefined;
  const handleCustomRange = (r: DateRange | undefined) => {
    if (!r) {
      setPartialRange(undefined);
      navigate({ range: "all", from: "", to: "" });
    } else if (r.from && r.to) {
      setPartialRange(undefined);
      navigate({ range: "custom", from: toLocalISO(r.from), to: toLocalISO(r.to) });
    } else {
      setPartialRange(r);
    }
  };

  // ── Sort / paging / reset ─────────────────────────────────────────────────
  const sortBy = (key: OrderSortKey) => {
    const v = viewRef.current;
    navigate({
      sort: key,
      dir:  v.sort === key ? (v.dir === "asc" ? "desc" : "asc") : DEFAULT_SORT_DIR[key],
    });
  };
  const goToPage = (page: number) => {
    navigate({ page });
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clearFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    setPushedSearch("");
    setPartialRange(undefined);
    navigate({ ...DEFAULT_ORDER_LIST_QUERY, sort: view.sort, dir: view.dir });
  };

  const filtered = hasOrderListFilters(view);
  const page     = isPending ? view.page : result.page;
  const rows     = result.rows;

  return (
    <div className="space-y-4">
      {payOrder && (
        <PaymentModal
          orderId={payOrder.id}
          orderNumber={payOrder.orderNumber}
          customerName={payOrder.customerName}
          totalPrice={parseFloat(payOrder.totalPrice)}
          amountPaid={paymentBalance(payOrder).received}
          onClose={() => setPayOrder(null)}
          onSuccess={(r) => {
            setPayOrder(null);
            toast.success(
              r.paymentStatus === "partial"
                ? `DP recorded — ${formatUSD(r.balanceDue)} still due`
                : r.change > 0
                  ? `Paid ✓ — give ${formatUSD(r.change)} change`
                  : "Payment received ✓",
            );
            startTransition(() => router.refresh());
          }}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] md:text-[30px] font-extrabold tracking-tight text-slate-900">Orders</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-500">
            <span>
              <span className="tabular-nums">{result.total}</span> order{result.total === 1 ? "" : "s"}
              {filtered ? " match" : ""}
            </span>
            {result.toCollect.orders > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-rose-600">
                  {formatUSD(result.toCollect.amount)} to collect from {result.toCollect.orders}
                </span>
              </>
            )}
            {filtered && (
              <button type="button" onClick={clearFilters} className="font-bold text-brand hover:underline">
                Clear filters
              </button>
            )}
          </p>
        </div>
        <Link
          href="/employee/orders/new"
          className="flex h-12 shrink-0 items-center gap-2 rounded-2xl px-5 text-sm font-extrabold text-white transition-transform active:scale-95"
          style={{ background: "linear-gradient(145deg, #2496d6, #1a7fba)", boxShadow: "0 6px 18px rgba(26,127,186,0.38)" }}
        >
          <Plus size={17} strokeWidth={3} /> New order
        </Link>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-[24px] bg-white p-3 md:p-4 ring-1 ring-slate-200/80 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Name, phone, order # or service…"
              enterKeyHint="search"
              aria-label="Search orders"
              className="h-12 w-full rounded-2xl bg-slate-50 pl-11 pr-11 text-[15px] font-semibold text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand/40"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="akiro-no-scrollbar min-w-0 overflow-x-auto">
              <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                {RANGE_OPTIONS.map((o) => {
                  const active = view.range === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { setPartialRange(undefined); navigate({ range: o.value, from: "", to: "" }); }}
                      aria-pressed={active}
                      className={`h-10 shrink-0 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-bold transition-colors ${
                        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <DateRangePicker
              value={partialRange ?? committedRange}
              onChange={handleCustomRange}
              onOpenChange={(open) => { if (!open) setPartialRange(undefined); }}
              align="right"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="akiro-no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Order status">
            {STATUS_TABS.map((t) => {
              const active = view.status === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => navigate({ status: t.value })}
                  aria-pressed={active}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold transition ${
                    active ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {t.dot && <span className={`h-2 w-2 rounded-full ${t.dot}`} />}
                  {t.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
                  }`}>
                    {result.statusCounts[t.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="akiro-no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1" role="group" aria-label="Payment">
            <span className="mr-0.5 shrink-0 text-[11px] font-black uppercase tracking-wider text-slate-400">Payment</span>
            {PAYMENT_CHIPS.map((c) => {
              const active = view.payment === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => navigate({ payment: active ? "all" : c.value })}
                  aria-pressed={active}
                  className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold ring-1 transition ${
                    active ? c.active : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-white" : c.dot}`} />
                  {PAYMENT_LABELS[c.value]}
                  <span className={`text-[12px] font-extrabold tabular-nums ${active ? "text-white/85" : "text-slate-400"}`}>
                    {result.paymentCounts[c.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────── */}
      <div ref={tableTopRef} className="relative scroll-mt-4 overflow-clip rounded-[24px] bg-white ring-1 ring-slate-200/80 shadow-sm">
        {isPending && <div className="akiro-progress" />}

        {/* Phone: sort picker (the table headers sort on tablets) */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 md:hidden">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Sort</span>
          <div className="relative">
            <select
              value={`${view.sort}:${view.dir}`}
              onChange={(e) => {
                const [sort, dir] = e.target.value.split(":") as [OrderSortKey, "asc" | "desc"];
                navigate({ sort, dir });
              }}
              aria-label="Sort orders"
              className="h-10 appearance-none rounded-xl bg-slate-50 pl-3 pr-9 text-[13px] font-bold text-slate-800 ring-1 ring-slate-200 outline-none"
            >
              {!SORT_PRESETS.some((p) => p.sort === view.sort && p.dir === view.dir) && (
                <option value={`${view.sort}:${view.dir}`}>Custom</option>
              )}
              {SORT_PRESETS.map((p) => (
                <option key={p.label} value={`${p.sort}:${p.dir}`}>{p.label}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState filtered={filtered} onClear={clearFilters} />
        ) : (
          <div className={`transition-opacity ${isPending ? "opacity-55" : ""}`}>
            {/* Tablet & desktop: table */}
            <table className="hidden w-full table-fixed border-separate border-spacing-0 md:table">
              <thead>
                <tr>
                  <SortTh label="Customer" sortKey="customer" view={view} onSort={sortBy} className="pl-5" />
                  <th scope="col" className={`${TH} hidden w-[16%] xl:table-cell`}>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Services</span>
                  </th>
                  <SortTh label="Date"    sortKey="date"    view={view} onSort={sortBy} className="hidden w-[150px] lg:table-cell" />
                  <SortTh label="Total"   sortKey="total"   view={view} onSort={sortBy} className="w-[92px] lg:w-[104px]" align="right" />
                  <SortTh label="Payment" sortKey="payment" view={view} onSort={sortBy} className="w-[176px] xl:w-[212px]" />
                  <SortTh label="Status"  sortKey="status"  view={view} onSort={sortBy} className="w-[150px]" />
                  <th scope="col" className={`${TH} w-[68px] min-[1100px]:w-[116px]`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <OrderRow key={o.id} order={o} now={nowDate} templateData={templateData} onPay={setPayOrder} />
                ))}
              </tbody>
            </table>

            {/* Phone: cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((o) => (
                <OrderCard key={o.id} order={o} now={nowDate} templateData={templateData} onPay={setPayOrder} />
              ))}
            </ul>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          shownPage={result.page}
          onPage={goToPage}
        />
      </div>
    </div>
  );
}

// ─── Table header ────────────────────────────────────────────────────────────

const TH = "sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 py-3 text-left backdrop-blur";

function SortTh({
  label, sortKey, view, onSort, className = "", align = "left",
}: {
  label:     string;
  sortKey:   OrderSortKey;
  view:      OrderListQuery;
  onSort:    (key: OrderSortKey) => void;
  className?: string;
  align?:    "left" | "right";
}) {
  const active = view.sort === sortKey;
  const Icon   = !active ? ArrowUpDown : view.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (view.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`${TH} ${align === "right" ? "text-right" : ""} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`-mx-1.5 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-black uppercase tracking-wider transition-colors ${
          active ? "text-brand" : "text-slate-400 hover:text-slate-700"
        }`}
      >
        {label}
        <Icon size={13} strokeWidth={2.5} className={active ? "" : "opacity-50"} />
      </button>
    </th>
  );
}

// ─── Rows ────────────────────────────────────────────────────────────────────

interface RowProps {
  order:        OrderListRow;
  now:          Date;
  templateData: WaTemplateData | null;
  onPay:        (order: OrderListRow) => void;
}

const TD = "border-b border-slate-100 px-3 py-3 align-middle";

function OrderRow({ order, now, templateData, onPay }: RowProps) {
  const router  = useRouter();
  const total   = parseFloat(order.totalPrice);
  const balance = paymentBalance(order);
  const { main, more } = serviceSummary(order.items);

  // The whole row opens the order — except its own controls, and anything in a
  // portalled dialog (React bubbles those clicks up the component tree).
  const openOrder = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target)) return;
    if (target.closest("a, button, select, input, label, [role=button]")) return;
    router.push(`/employee/orders/${order.id}`);
  };

  return (
    <tr onClick={openOrder} className="group cursor-pointer transition-colors hover:bg-sky-50/50">
      <td className={`${TD} relative pl-5`}>
        <span className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full ${PAYMENT_ACCENT[order.paymentStatus]}`} />
        <div className="flex min-w-0 items-center gap-3">
          <CustomerAvatar name={order.customerName} size={40} className="hidden lg:inline-flex" />
          <div className="min-w-0">
            <Link
              href={`/employee/orders/${order.id}`}
              className="block truncate text-[14.5px] font-bold text-slate-900 hover:text-brand"
            >
              {order.customerName}
            </Link>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <span className="truncate font-mono text-[11px] font-semibold text-slate-400">{order.orderNumber}</span>
              <EditedBadge editCount={order.editCount} editedAfterPaymentAt={order.editedAfterPaymentAt} iconOnly />
            </div>
            {/* Date moves under the name when its column is hidden */}
            <p className="truncate text-[11px] font-semibold text-slate-400 lg:hidden">
              {formatDayTimeBiz(order.createdAt, now)}
            </p>
          </div>
        </div>
      </td>

      <td className={`${TD} hidden xl:table-cell`}>
        <p className="truncate text-[13px] font-semibold text-slate-700">{main}</p>
        {more > 0 && (
          <p className="text-[11px] font-bold text-slate-400">+{more} more service{more > 1 ? "s" : ""}</p>
        )}
      </td>

      <td className={`${TD} hidden whitespace-nowrap lg:table-cell`}>
        <p className="truncate text-[13px] font-semibold text-slate-700">{formatDayTimeBiz(order.createdAt, now)}</p>
        <p className="truncate text-[11px] font-semibold text-slate-400">
          {order.createdByName ? `by ${order.createdByName}` : `${timeAgoShort(order.createdAt, now)} ago`}
        </p>
      </td>

      <td className={`${TD} whitespace-nowrap text-right`}>
        <span className="font-display text-[15px] font-extrabold text-slate-900 tabular-nums">{formatUSD(total)}</span>
        {order.paymentStatus === "partial" && (
          <p className="text-[11px] font-semibold text-slate-400 tabular-nums">paid {formatUSD(balance.received)}</p>
        )}
      </td>

      <td className={TD}>
        <PaymentCell order={order} balanceDue={balance.balanceDue} overpaid={balance.overpaid} onPay={onPay} />
      </td>

      <td className={TD}>
        <StatusSelect order={order} />
      </td>

      <td className={`${TD} pr-4`}>
        <div className="flex items-center justify-end gap-1.5">
          <WhatsAppNotify
            customerPhone={order.customerPhone}
            customerName={order.customerName}
            orderNumber={order.orderNumber}
            servicesSummary={serviceNames(order.items)}
            status={order.status}
            paymentStatus={order.paymentStatus}
            totalPrice={total}
            balanceDue={balance.balanceDue}
            notes={order.notes}
            clothesCounts={order.clothesCounts}
            templateData={templateData}
            compact
          />
          {/* Narrower tablets give the room to the customer name — delete stays on the order page */}
          <span className="hidden min-[1100px]:contents">
            <DeleteOrderButton orderId={order.id} orderNumber={order.orderNumber} compact />
          </span>
        </div>
      </td>
    </tr>
  );
}

function OrderCard({ order, now, templateData, onPay }: RowProps) {
  const total   = parseFloat(order.totalPrice);
  const balance = paymentBalance(order);
  const { main, more } = serviceSummary(order.items);

  return (
    <li className="relative px-4 py-3.5">
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${PAYMENT_ACCENT[order.paymentStatus]}`} />
      <Link href={`/employee/orders/${order.id}`} className="flex items-start gap-3">
        <CustomerAvatar name={order.customerName} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[15px] font-bold text-slate-900">{order.customerName}</p>
            <span className="shrink-0 font-display text-[15px] font-extrabold text-slate-900 tabular-nums">
              {formatUSD(total)}
            </span>
          </div>
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-400">
            <span className="truncate"><span className="font-mono">{order.orderNumber}</span> · {formatDayTimeBiz(order.createdAt, now)}</span>
            <EditedBadge editCount={order.editCount} editedAfterPaymentAt={order.editedAfterPaymentAt} iconOnly />
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
            {main}{more > 0 ? ` · +${more} more` : ""}
          </p>
        </div>
      </Link>
      <div className="mt-3 space-y-2 pl-[54px]">
        <PaymentCell order={order} balanceDue={balance.balanceDue} overpaid={balance.overpaid} onPay={onPay} />
        <div className="flex items-center gap-2">
          <StatusSelect order={order} className="min-w-0 flex-1" />
          <WhatsAppNotify
            customerPhone={order.customerPhone}
            customerName={order.customerName}
            orderNumber={order.orderNumber}
            servicesSummary={serviceNames(order.items)}
            status={order.status}
            paymentStatus={order.paymentStatus}
            totalPrice={total}
            balanceDue={balance.balanceDue}
            notes={order.notes}
            clothesCounts={order.clothesCounts}
            templateData={templateData}
            compact
          />
        </div>
      </div>
    </li>
  );
}

// ─── Cells ───────────────────────────────────────────────────────────────────

function PaymentCell({
  order, balanceDue, overpaid, onPay,
}: {
  order:      OrderListRow;
  balanceDue: number;
  overpaid:   number;
  onPay:      (order: OrderListRow) => void;
}) {
  const due = order.paymentStatus !== "paid" && balanceDue > 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* The Collect button carries the amount, so the DP badge doesn't repeat it */}
      <PaymentBadge order={order} showDue={!due} />
      {due ? (
        // Unpaid: the amount is the order total, already in its own column.
        <button
          type="button"
          onClick={() => onPay(order)}
          className="inline-flex h-8 items-center rounded-full bg-emerald-50 px-3 text-[12px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 active:scale-95"
        >
          Collect{order.paymentStatus === "partial" ? ` ${formatUSD(balanceDue)}` : ""}
        </button>
      ) : overpaid > 0 ? (
        <span className="text-[11px] font-bold text-amber-600">Overpaid {formatUSD(overpaid)} — refund</span>
      ) : order.paymentMethod ? (
        <span className="text-[11px] font-semibold text-slate-400">via {METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
      ) : null}
    </div>
  );
}

// Native <select> for reliable big-target pickers on tablets/phones. It is
// hidden with opacity-0 (not transparent text): Chromium copies the select's
// `color` into its option popup, which would make the options invisible.
function StatusSelect({ order, className = "w-[132px]" }: { order: OrderListRow; className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setOptimisticStatus] = useOptimistic(order.status);
  const paid  = order.paymentStatus === "paid";
  const style = STATUS_STYLES[status];

  const change = (next: Order["status"]) => {
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await updateOrderStatus(order.id, next);
      if (result.success) toast.success(`${order.customerName} → ${ORDER_STATUS_LABELS[next]}`);
      else toast.error(result.error ?? "Failed to update status.");
    });
  };

  return (
    <div className={`relative inline-flex h-9 items-center rounded-full ring-1 transition-opacity ${className} ${style.pill} ${isPending ? "opacity-70" : ""}`}>
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => change(e.target.value as Order["status"])}
        aria-label={`Status for ${order.customerName}`}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-wait"
      >
        {STATUS_VALUES.map((s) => (
          <option key={s} value={s} disabled={s === "picked_up" && !paid && status !== "picked_up"}>
            {ORDER_STATUS_LABELS[s]}{s === "picked_up" && !paid ? " — pay first" : ""}
          </option>
        ))}
      </select>
      <span className="pointer-events-none flex w-full items-center justify-between gap-1 px-3 text-[12.5px] font-bold">
        <span className="flex min-w-0 items-center gap-1.5">
          {isPending
            ? <Loader2 size={12} className="shrink-0 animate-spin" />
            : <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />}
          <span className="truncate">{ORDER_STATUS_LABELS[status]}</span>
        </span>
        <ChevronDown size={14} className="shrink-0 opacity-60" />
      </span>
    </div>
  );
}

// ─── Empty state & pagination ────────────────────────────────────────────────

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft text-brand/70 ring-2 ring-brand-muted">
        <Package size={26} />
      </span>
      <div className="space-y-1">
        <p className="font-display text-[15px] font-extrabold text-slate-800">
          {filtered ? "No orders match these filters" : "No orders yet"}
        </p>
        <p className="text-[13px] font-semibold text-slate-400">
          {filtered ? "Try another search, status, payment or date." : "Orders you create will appear here."}
        </p>
      </div>
      {filtered ? (
        <button
          type="button"
          onClick={onClear}
          className="h-11 rounded-full bg-slate-100 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95"
        >
          Clear filters
        </button>
      ) : (
        <Link
          href="/employee/orders/new"
          className="flex h-11 items-center rounded-full px-6 text-sm font-bold text-white transition-transform active:scale-95"
          style={{ background: "linear-gradient(145deg, #2496d6, #1a7fba)", boxShadow: "0 4px 16px rgba(26,127,186,0.35)" }}
        >
          Create the first order →
        </Link>
      )}
    </div>
  );
}

/** Page numbers around the current page, with "…" gaps: 1 … 4 5 6 … 17. */
function pageList(page: number, totalPages: number): (number | "gap")[] {
  const pages = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

function Pagination({
  page, totalPages, total, pageSize, shownPage, onPage,
}: {
  page:       number;
  totalPages: number;
  total:      number;
  pageSize:   number;
  /** The page whose rows are on screen (differs from `page` while the next one loads). */
  shownPage:  number;
  onPage:     (page: number) => void;
}) {
  if (total === 0) return null;
  const first = (shownPage - 1) * pageSize + 1;
  const last  = Math.min(total, shownPage * pageSize);
  const btn   = "flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-[13px] font-bold transition disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-3">
      <p className="text-[13px] font-semibold text-slate-500">
        Showing <span className="font-extrabold text-slate-800 tabular-nums">{first}–{last}</span> of{" "}
        <span className="font-extrabold text-slate-800 tabular-nums">{total}</span>
      </p>
      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className={`${btn} gap-1 bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100`}
          >
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Prev</span>
          </button>
          <span className="hidden items-center gap-1 sm:flex">
            {pageList(page, totalPages).map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`${btn} tabular-nums ${
                    p === page ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          </span>
          <span className="px-2 text-[13px] font-bold text-slate-500 tabular-nums sm:hidden">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className={`${btn} gap-1 bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100`}
          >
            <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
