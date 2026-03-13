/* eslint-disable react-hooks/set-state-in-effect */
// components/admin/OrdersClient.tsx
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, ChevronLeft, ChevronRight,
  ArrowUpRight, Clock, Waves, PackageCheck, ShoppingBag,
  CreditCard, AlertCircle, Filter, X, Loader2,
} from "lucide-react";
import { formatUSD, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import type { PaginatedOrders, OrderFilters } from "@/lib/actions/admin-orders";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "#d97706", bg: "#fffbeb", border: "#fcd34d", Icon: Clock        },
  processing: { label: "Processing", color: "#1a7fba", bg: "#edf7fd", border: "#b6def5", Icon: Waves        },
  done:       { label: "Done",       color: "#16a34a", bg: "#f0fdf4", border: "#86efac", Icon: PackageCheck },
  picked_up:  { label: "Picked Up",  color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: ShoppingBag  },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  paid:   { label: "Paid",   color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  unpaid: { label: "Unpaid", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  initialData:    PaginatedOrders;
  initialFilters: OrderFilters;
}

export function OrdersClient({ initialData, initialFilters }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Local state — search is debounced, filters are instant
  const [search,    setSearch]    = useState(initialFilters.search  ?? "");
  const [status,    setStatus]    = useState(initialFilters.status  ?? "all");
  const [payment,   setPayment]   = useState(initialFilters.payment ?? "all");
  const [isPending, start]        = useTransition();

  // Debounce ref for the search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when server re-renders with new initialFilters
  // (e.g. browser back/forward navigation)
  useEffect(() => {
    setSearch(initialFilters.search  ?? "");
    setStatus(initialFilters.status  ?? "all");
    setPayment(initialFilters.payment ?? "all");
  }, [initialFilters.search, initialFilters.status, initialFilters.payment]);

  // Clean up debounce timer on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  /**
   * Build a new URL from current params + overrides.
   * Always resets page to 1 when any filter changes.
   */
  const pushUrl = (overrides: {
    search?:  string;
    status?:  string;
    payment?: string;
  }) => {
    const sp = new URLSearchParams(searchParams.toString());

    const next = {
      search:  "search"  in overrides ? overrides.search  : search,
      status:  "status"  in overrides ? overrides.status  : status,
      payment: "payment" in overrides ? overrides.payment : payment,
    };

    if (next.search)              sp.set("search",  next.search);  else sp.delete("search");
    if (next.status  !== "all")   sp.set("status",  next.status!); else sp.delete("status");
    if (next.payment !== "all")   sp.set("payment", next.payment!); else sp.delete("payment");
    sp.delete("page"); // always reset to page 1 on filter change

    start(() => router.push(`${pathname}?${sp.toString()}`));
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = (v: string) => {
    setSearch(v); // update the input immediately (controlled)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl({ search: v }), 350);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    pushUrl({ search: "" });
  };

  const handleStatus = (v: string) => {
    setStatus(v);
    if (debounceRef.current) clearTimeout(debounceRef.current); // cancel any pending search
    pushUrl({ status: v });
  };

  const handlePayment = (v: string) => {
    setPayment(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushUrl({ payment: v });
  };

  const { rows, total, page, totalPages } = initialData;

  // Helper to build pagination URLs, preserving current filters
  const pageUrl = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Orders
        </h1>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          {total} order{total !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0",
        padding: "14px 18px", display: "flex", gap: "12px", alignItems: "center",
        flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>

        {/* Search with clear button + pending indicator */}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px", maxWidth: "340px" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search order # or customer…"
            style={{
              width: "100%", boxSizing: "border-box",
              paddingLeft: 34, paddingRight: search ? 30 : 12,
              paddingTop: 9, paddingBottom: 9,
              border: "1.5px solid #e2e8f0", borderRadius: "8px",
              fontSize: "13px", color: "#1e293b", outline: "none",
              background: "#f8fafc", transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
          />
          {search && (
            <button
              onClick={handleClearSearch}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "#e2e8f0", border: "none", borderRadius: "50%",
                width: 18, height: 18, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", padding: 0,
              }}
            >
              <X size={10} style={{ color: "#64748b" }} />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["all", "pending", "processing", "done", "picked_up"] as const).map((s) => {
            const active = status === s;
            const cfg    = s !== "all" ? STATUS_CONFIG[s] : null;
            return (
              <button key={s} onClick={() => handleStatus(s)} style={{
                padding: "6px 12px", borderRadius: "999px", border: "1.5px solid",
                borderColor: active ? (cfg?.color ?? "#1a7fba") : "#e2e8f0",
                background:  active ? (cfg?.bg    ?? "#edf7fd") : "white",
                color:       active ? (cfg?.color ?? "#1a7fba") : "#64748b",
                fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
              }}>
                {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>

        {/* Payment pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "paid", "unpaid"] as const).map((p) => {
            const active = payment === p;
            const cfg    = p !== "all" ? PAYMENT_CONFIG[p] : null;
            return (
              <button key={p} onClick={() => handlePayment(p)} style={{
                padding: "6px 12px", borderRadius: "999px", border: "1.5px solid",
                borderColor: active ? (cfg?.color ?? "#1a7fba") : "#e2e8f0",
                background:  active ? (cfg?.bg    ?? "#edf7fd") : "white",
                color:       active ? (cfg?.color ?? "#1a7fba") : "#64748b",
                fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
              }}>
                {p === "all" ? "All Payments" : cfg!.label}
              </button>
            );
          })}
        </div>

        {/* Searching indicator */}
        {isPending && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
            <Loader2 size={13} style={{ color: "#94a3b8" }} className="animate-spin" />
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Searching…</span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
        opacity: isPending ? 0.55 : 1, transition: "opacity 0.2s",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Order #", "Customer", "Service", "Weight", "Total", "Payment", "Status", "Date", ""].map((h) => (
                  <th key={h} style={{
                    padding: "11px 16px", textAlign: "left",
                    fontSize: "10px", fontWeight: 800, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "48px 20px", textAlign: "center" }}>
                    <Filter size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
                      {search ? `No orders matching "${search}"` : "No orders match your filters"}
                    </p>
                    {search && (
                      <button onClick={handleClearSearch} style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "#1a7fba", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : rows.map((order, i) => {
                const sc = STATUS_CONFIG[order.status];
                const pc = PAYMENT_CONFIG[order.paymentStatus];
                return (
                  <tr key={order.id}
                    style={{ background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                  >
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a7fba", fontFamily: "monospace" }}>
                        {order.orderNumber}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#1a7fba,#2496d6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "10px", fontWeight: 800, color: "white" }}>{order.customerName[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>{order.customerName}</p>
                          <p style={{ fontSize: "10px", color: "#94a3b8" }}>{order.customerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      {order.items.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "#cbd5e1" }}>—</span>
                      ) : order.items.length === 1 ? (
                        <span style={{ fontSize: "12px", color: "#475569", whiteSpace: "nowrap" }}>
                          {order.items[0].serviceName}
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {order.items.map((item) => (
                            <span key={item.id} style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>
                              {item.serviceName}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      {order.items.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "#cbd5e1" }}>—</span>
                      ) : order.items.length === 1 ? (
                        <span style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                          {order.items[0].weightKg != null
                            ? `${order.items[0].weightKg} kg`
                            : order.items[0].quantity != null
                            ? `${order.items[0].quantity} pcs`
                            : "—"}
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {order.items.map((item) => (
                            <span key={item.id} style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>
                              {item.weightKg != null
                                ? `${item.weightKg} kg`
                                : item.quantity != null
                                ? `${item.quantity} pcs`
                                : "—"}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {formatUSD(parseFloat(order.totalPrice))}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}`, padding: "3px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                        {order.paymentStatus === "paid" ? <CreditCard size={9} /> : <AlertCircle size={9} />}
                        {pc.label}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: "3px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                        <sc.Icon size={9} />
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <Link href={`/admin/orders/${order.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#1a7fba", textDecoration: "none", background: "#edf7fd", padding: "4px 10px", borderRadius: "6px", border: "1px solid #b6def5", whiteSpace: "nowrap" }}>
                        View <ArrowUpRight size={10} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>Page {page} of {totalPages}</p>
            <div style={{ display: "flex", gap: "6px" }}>
              {page > 1 && (
                <Link href={pageUrl(page - 1)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "12px", fontWeight: 600, color: "#475569", textDecoration: "none" }}>
                  <ChevronLeft size={13} /> Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageUrl(page + 1)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "12px", fontWeight: 600, color: "#475569", textDecoration: "none" }}>
                  Next <ChevronRight size={13} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}