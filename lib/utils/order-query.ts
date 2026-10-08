// lib/utils/order-query.ts
//
// URL state for the employee Orders list. Every filter, the sort and the page
// live in the query string, so a view survives a refresh and the back button,
// and the dashboard can link straight into one ("/employee/orders?status=done").
// Pure — parsed by the server page, rebuilt by the client table.

import type { Order } from "@/lib/db/schema";

export type OrderStatusFilter = "all" | "active" | Order["status"];
export type PaymentFilter     = "all" | Order["paymentStatus"];
export type DateRangeFilter   = "all" | "today" | "7d" | "30d" | "custom";
export type OrderSortKey      = "date" | "customer" | "total" | "payment" | "status";
export type SortDir           = "asc" | "desc";

export interface OrderListQuery {
  search:  string;
  status:  OrderStatusFilter;
  payment: PaymentFilter;
  range:   DateRangeFilter;
  /** Business-local YYYY-MM-DD bounds — only read when range is "custom". */
  from:    string;
  to:      string;
  sort:    OrderSortKey;
  dir:     SortDir;
  page:    number;
}

export const ORDER_LIST_PAGE_SIZE = 25;

/** "In shop" — every order still physically with us. */
export const ACTIVE_ORDER_STATUSES: Order["status"][] = ["pending", "processing", "done"];

export const DEFAULT_ORDER_LIST_QUERY: OrderListQuery = {
  search:  "",
  status:  "all",
  payment: "all",
  range:   "all",
  from:    "",
  to:      "",
  sort:    "date",
  dir:     "desc",
  page:    1,
};

/** The direction a column sorts in when it is first clicked. */
export const DEFAULT_SORT_DIR: Record<OrderSortKey, SortDir> = {
  date:     "desc", // newest first
  customer: "asc",  // A → Z
  total:    "desc", // biggest first
  payment:  "asc",  // unpaid → DP → paid (enum order)
  status:   "asc",  // pending → picked up (enum order)
};

const STATUS_VALUES:  readonly OrderStatusFilter[] = ["all", "active", "pending", "processing", "done", "picked_up"];
const PAYMENT_VALUES: readonly PaymentFilter[]     = ["all", "unpaid", "partial", "paid"];
const RANGE_VALUES:   readonly DateRangeFilter[]   = ["all", "today", "7d", "30d", "custom"];
const SORT_VALUES:    readonly OrderSortKey[]      = ["date", "customer", "total", "payment", "status"];
const DIR_VALUES:     readonly SortDir[]           = ["asc", "desc"];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function pick<T extends string>(value: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const v = first(value);
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Normalise raw `searchParams` — anything unknown falls back to the default. */
export function parseOrderListQuery(sp: RawParams): OrderListQuery {
  const sort = pick(sp.sort, SORT_VALUES, DEFAULT_ORDER_LIST_QUERY.sort);
  const from = first(sp.from);
  const to   = first(sp.to);
  const page = parseInt(first(sp.page), 10);

  return {
    search:  first(sp.search).trim().slice(0, 100),
    status:  pick(sp.status,  STATUS_VALUES,  DEFAULT_ORDER_LIST_QUERY.status),
    payment: pick(sp.payment, PAYMENT_VALUES, DEFAULT_ORDER_LIST_QUERY.payment),
    range:   pick(sp.range,   RANGE_VALUES,   DEFAULT_ORDER_LIST_QUERY.range),
    from:    ISO_DAY.test(from) ? from : "",
    to:      ISO_DAY.test(to)   ? to   : "",
    sort,
    dir:     pick(sp.dir, DIR_VALUES, DEFAULT_SORT_DIR[sort]),
    page:    Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Query string for `q` ("?status=done&…"), leaving out everything at its default. */
export function orderListSearch(q: OrderListQuery): string {
  const d  = DEFAULT_ORDER_LIST_QUERY;
  const sp = new URLSearchParams();
  if (q.search)                sp.set("search",  q.search);
  if (q.status  !== d.status)  sp.set("status",  q.status);
  if (q.payment !== d.payment) sp.set("payment", q.payment);
  if (q.range   !== d.range)   sp.set("range",   q.range);
  if (q.range === "custom") {
    if (q.from) sp.set("from", q.from);
    if (q.to)   sp.set("to",   q.to);
  }
  if (q.sort !== d.sort || q.dir !== d.dir) {
    sp.set("sort", q.sort);
    sp.set("dir",  q.dir);
  }
  if (q.page > 1) sp.set("page", String(q.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** True when any filter (not the sort or page) narrows the list. */
export function hasOrderListFilters(q: OrderListQuery): boolean {
  return !!q.search || q.status !== "all" || q.payment !== "all" || q.range !== "all";
}
