// components/admin/CustomersClient.tsx
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, X, Loader2, Save,
  Users, ArrowUpRight, Trophy, Star,
  Crown, Medal, Award,
  ShoppingBag, BarChart3, ChevronDown, Download,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { createCustomer } from "@/lib/actions/admin-customers";
import { getCustomersForExport, getCustomersBySourceForExport } from "@/lib/actions/export";
import { exportSheetsToXlsx } from "@/lib/utils/export-xlsx";
import { formatUSD, REFERRAL_SOURCES } from "@/lib/utils/order-form";
import { ExportModal, type ExportDateRange } from "@/components/admin/ExportModal";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { DeleteCustomerButton } from "@/components/admin/DeleteCustomerButton";
import { NewCustomersPanel } from "@/components/admin/NewCustomersPanel";
import { RetentionPanel } from "@/components/admin/RetentionPanel";
import type { CustomerWithStats, CustomerInsights, SortOption, InactiveRange } from "@/lib/actions/admin-customers";

// yyyy-mm-dd in local time — matches the param format the customers page reads.
function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ─── Create Customer Modal ────────────────────────────────────────────────────
function CreateCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [referralSource, setReferralSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim() || !address.trim()) { setError("All fields are required."); return; }
    setError(null);
    start(async () => {
      const result = await createCustomer({ name, phone, address, referralSource });
      if (result.success) onSuccess();
      else setError(result.error ?? "Failed to create customer.");
    });
  };

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    border: "1.5px solid #e2e8f0", borderRadius: "8px",
    fontSize: "14px", color: "#1e293b", outline: "none", background: "#f8fafc",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      backdropFilter: "blur(6px)",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "white", borderRadius: "16px", border: "1.5px solid #e2e8f0",
        boxShadow: "0 32px 80px rgba(0,0,0,0.18)", width: "100%", maxWidth: "440px", overflow: "hidden",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
          padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>New Customer</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>Add Customer</p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
            borderRadius: "7px", width: 32, height: 32, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
          }}>
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>
        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={lbl}>Full Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Santos" style={inp} /></div>
          <div><label style={lbl}>Phone Number</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62 8XX XXXX XXXX" style={inp} /></div>
          <div><label style={lbl}>Address</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city…" rows={2} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} /></div>
          <div>
            <label style={lbl}>Heard about us via (optional)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {REFERRAL_SOURCES.map((src) => {
                const active = referralSource === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setReferralSource(active ? null : src)}
                    style={{
                      padding: "7px 12px", borderRadius: "8px", cursor: "pointer",
                      border: `1.5px solid ${active ? "#1a7fba" : "#e2e8f0"}`,
                      background: active ? "#edf7fd" : "white",
                      color: active ? "#0f5a85" : "#64748b",
                      fontSize: "12px", fontWeight: 700,
                    }}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>
          {error && <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}><p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p></div>}
          <button onClick={handleSubmit} disabled={isPending} style={{
            height: 46, borderRadius: "9px", border: "none",
            background: isPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.3)",
            color: "white", fontSize: "14px", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
          }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Create Customer</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Referral source badge ────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  Facebook:        "#1877f2",
  Tiktok:          "#0f172a",
  Belun:           "#16a34a",
  "Banner/Brosur": "#d97706",
};

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span style={{ fontSize: "12px", color: "#cbd5e1" }}>—</span>;
  const color = SOURCE_COLORS[source] ?? "#64748b";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "20px",
      background: color + "18", border: `1px solid ${color}40`,
      fontSize: "10px", fontWeight: 700, color, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {source}
    </span>
  );
}

// ─── Rank Medal ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const configs = [
    { bg: "linear-gradient(135deg,#f59e0b,#fbbf24)", shadow: "rgba(245,158,11,0.4)", icon: <Crown size={12} style={{ color: "white" }} /> },
    { bg: "linear-gradient(135deg,#94a3b8,#cbd5e1)", shadow: "rgba(148,163,184,0.4)", icon: <Medal size={12} style={{ color: "white" }} /> },
    { bg: "linear-gradient(135deg,#cd7c3f,#e8a06b)", shadow: "rgba(205,124,63,0.4)", icon: <Award size={12} style={{ color: "white" }} /> },
  ];
  const cfg = configs[rank - 1];
  if (cfg) {
    return (
      <div style={{
        width: 26, height: 26, borderRadius: "50%", background: cfg.bg,
        boxShadow: `0 2px 8px ${cfg.shadow}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {cfg.icon}
      </div>
    );
  }
  return (
    <div style={{
      width: 26, height: 26, borderRadius: "50%", background: "#f1f5f9",
      border: "1.5px solid #e2e8f0",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748b" }}>{rank}</span>
    </div>
  );
}

// ─── Leaderboard Card ─────────────────────────────────────────────────────────
function LeaderboardCard({
  title, icon: Icon, iconColor, iconBg, customers, valueKey, formatValue,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  customers: CustomerWithStats[];
  valueKey: "totalSpent" | "totalOrders";
  formatValue: (v: number) => string;
}) {
  return (
    <div style={{
      background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: 34, height: 34, borderRadius: "9px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>{title}</p>
          <p style={{ fontSize: "10px", color: "#94a3b8" }}>Top {customers.length} customers</p>
        </div>
      </div>
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {customers.length === 0 ? (
          <p style={{ textAlign: "center", padding: "16px", fontSize: "12px", color: "#94a3b8" }}>No data yet</p>
        ) : customers.map((c, i) => {
          const val = c[valueKey] as number;
          const maxVal = customers[0][valueKey] as number;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <Link key={c.id} href={`/admin/customers/${c.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "9px", transition: "background 0.15s", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <RankBadge rank={i + 1} />
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#1a7fba,#2496d6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "white" }}>{c.name[0]?.toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: iconColor, flexShrink: 0, marginLeft: "8px" }}>{formatValue(val)}</span>
                  </div>
                  <div style={{ height: 4, background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "999px", width: `${pct}%`, background: `linear-gradient(90deg, ${iconColor}88, ${iconColor})` }} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


// ─── Sort Options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent",      label: "Most Recent Activity" },
  { value: "top_spender", label: "Top Spenders" },
  { value: "most_orders", label: "Most Repeat Orders" },
  { value: "newest",      label: "Newest Customers" },
];


// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  customers:       CustomerWithStats[];
  insights:        CustomerInsights;
  initialSearch:   string;
  initialSort:     SortOption;
  initialInactive: InactiveRange | null;
}

function toDateRange(r: InactiveRange | null): DateRange | undefined {
  if (!r) return undefined;
  const parse = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  return { from: parse(r.from), to: parse(r.to) };
}

export function CustomersClient({ customers, insights, initialSearch, initialSort, initialInactive }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [search,      setSearch]      = useState(initialSearch);
  const [sort,        setSort]        = useState<SortOption>(initialSort);
  const [inactive,    setInactive]    = useState<DateRange | undefined>(toDateRange(initialInactive));
  const [showModal,   setShowModal]   = useState(false);
  const [showExport,  setShowExport]  = useState(false);
  const [isPending,   start]          = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushUrl = (newSearch: string, newSort: SortOption, newInactive: DateRange | undefined) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (newSearch) sp.set("search", newSearch); else sp.delete("search");
    sp.set("sort", newSort);
    if (newInactive?.from && newInactive?.to) {
      sp.set("inactiveFrom", toLocalISO(newInactive.from));
      sp.set("inactiveTo",   toLocalISO(newInactive.to));
    } else {
      sp.delete("inactiveFrom");
      sp.delete("inactiveTo");
    }
    // scroll: false — keep the viewport where it is instead of jumping to the
    // top of the page on every search / sort / filter change.
    start(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl(v, sort, inactive), 350);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    pushUrl("", sort, inactive);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSort = (v: SortOption) => {
    setSort(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushUrl(search, v, inactive);
  };

  const handleInactive = (r: DateRange | undefined) => {
    setInactive(r);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Only hit the server once a full range is picked (or the range is cleared).
    if (!r || (r.from && r.to)) pushUrl(search, sort, r);
  };

  const handleCreated = () => { setShowModal(false); router.refresh(); };

  // ── Export handler ────────────────────────────────────────────────────────
  const handleExport = async ({ from, to }: ExportDateRange) => {
    const [rows, bySource] = await Promise.all([
      getCustomersForExport(from, to),
      getCustomersBySourceForExport(from, to),
    ]);
    if (rows.length === 0) throw new Error("No customers found in the selected date range.");

    const fromLabel = from.replace(/-/g, "");
    const toLabel   = to.replace(/-/g, "");
    exportSheetsToXlsx(
      [
        { name: "Customers", rows },
        { name: "By Source", rows: bySource },
      ],
      `customers_${fromLabel}_${toLabel}`,
    );
  };

  const totalSpent  = customers.reduce((s, c) => s + c.totalSpent,  0);
  const totalOrders = customers.reduce((s, c) => s + c.totalOrders, 0);

  return (
    <>
      {showModal  && <CreateCustomerModal onClose={() => setShowModal(false)}  onSuccess={handleCreated} />}
      {showExport && (
        <ExportModal
          title="Export Customers"
          onClose={() => setShowExport(false)}
          onExport={handleExport}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>Customers</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              {customers.length} customer{customers.length !== 1 ? "s" : ""} · {formatUSD(totalSpent)} total revenue · {totalOrders} orders
            </p>
            {inactive?.from && inactive?.to && (
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#b45309", marginTop: "3px" }}>
                Showing customers with no order between {inactive.from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} and {inactive.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Export button */}
            <button
              onClick={() => setShowExport(true)}
              style={{
                display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px",
                borderRadius: "9px", border: "1.5px solid #86efac",
                background: "#f0fdf4",
                color: "#16a34a", fontSize: "13px", fontWeight: 800, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#dcfce7";
                e.currentTarget.style.borderColor = "#4ade80";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f0fdf4";
                e.currentTarget.style.borderColor = "#86efac";
              }}
            >
              <Download size={14} /> Export
            </button>
            {/* Add customer button */}
            <button onClick={() => setShowModal(true)} style={{
              display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px",
              borderRadius: "9px", border: "none",
              background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
              boxShadow: "0 4px 14px rgba(26,127,186,0.3)",
              color: "white", fontSize: "13px", fontWeight: 800, cursor: "pointer",
            }}>
              <Plus size={15} /> Add Customer
            </button>
          </div>
        </div>

        {/* ── Insights Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <LeaderboardCard title="Top Spenders" icon={Trophy} iconColor="#d97706" iconBg="linear-gradient(135deg,#fffbeb,#fef3c7)" customers={insights.topSpenders} valueKey="totalSpent" formatValue={formatUSD} />
          <LeaderboardCard title="Most Repeat"  icon={Star}   iconColor="#1a7fba"  iconBg="linear-gradient(135deg,#edf7fd,#c8e9f8)" customers={insights.mostRepeat}  valueKey="totalOrders" formatValue={(v) => `${v} orders`} />
        </div>

        {/* ── New customers + retention — two columns on desktop, stacked on narrow ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "16px", alignItems: "stretch" }}>
          <NewCustomersPanel initialData={insights.newByMonth} thisMonthCount={insights.newThisMonth.length} />
          <RetentionPanel initialData={insights.retentionByMonth} />
        </div>

        {/* ── Search + Sort — sticks to the top of the scroll area so it stays
             reachable while the table below scrolls ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0",
          padding: "14px 18px", boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          <div style={{ position: "relative", flex: "1", minWidth: "200px", maxWidth: "380px" }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or phone…"
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 34, paddingRight: search ? 30 : 12, paddingTop: 9, paddingBottom: 9,
                border: "1.5px solid #e2e8f0", borderRadius: "8px",
                fontSize: "13px", color: "#1e293b", outline: "none", background: "#f8fafc",
                transition: "border-color 0.15s",
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
                  width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", padding: 0,
                }}
              >
                <X size={10} style={{ color: "#64748b" }} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" }}>
              No order during:
            </span>
            <DateRangePicker
              value={inactive}
              onChange={handleInactive}
              align="right"
              size="sm"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={13} style={{ color: "#94a3b8" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>Sort:</span>
            <div style={{ position: "relative" }}>
              <select
                value={sort}
                onChange={(e) => handleSort(e.target.value as SortOption)}
                style={{
                  appearance: "none", paddingLeft: "12px", paddingRight: "32px", paddingTop: "8px", paddingBottom: "8px",
                  border: "1.5px solid #e2e8f0", borderRadius: "8px",
                  fontSize: "12px", fontWeight: 700, color: "#1e293b",
                  background: "#f8fafc", cursor: "pointer", outline: "none",
                }}
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
            </div>
          </div>

          {isPending && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
          <div style={{ overflow: "auto", maxHeight: "58vh" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["#", "Customer", "Phone", "Source", "Address", "Orders", "Total Spent", "Last Order", ""].map((h) => (
                    <th key={h} style={{ position: "sticky", top: 0, zIndex: 1, background: "#f8fafc", padding: "11px 16px", textAlign: "left", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", boxShadow: "inset 0 -1px 0 #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "48px", textAlign: "center" }}>
                      <Users size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
                        {search
                          ? `No customers matching "${search}"`
                          : inactive?.from && inactive?.to
                            ? "Every customer placed an order during that period"
                            : "No customers found"}
                      </p>
                      {search && (
                        <button onClick={handleClearSearch} style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "#1a7fba", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                          Clear search
                        </button>
                      )}
                    </td>
                  </tr>
                ) : customers.map((c, i) => (
                  <tr key={c.id}
                    style={{ background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                  >
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      {i < 3 ? <RankBadge rank={i + 1} /> : (
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1", paddingLeft: "4px" }}>{i + 1}</span>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: i === 0 ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : i === 1 ? "linear-gradient(135deg,#94a3b8,#cbd5e1)" : i === 2 ? "linear-gradient(135deg,#cd7c3f,#e8a06b)" : "linear-gradient(135deg,#1a7fba,#2496d6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "white" }}>{c.name[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{c.name}</p>
                          <p style={{ fontSize: "10px", color: "#94a3b8" }}>Since {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}><span style={{ fontSize: "12px", color: "#475569" }}>{c.phone}</span></td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}><SourceBadge source={c.referralSource} /></td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9", maxWidth: "180px" }}><span style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.address}</span></td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <ShoppingBag size={11} style={{ color: "#1a7fba" }} />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a7fba" }}>{c.totalOrders}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}><span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{formatUSD(c.totalSpent)}</span></td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No orders yet"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <Link href={`/admin/customers/${c.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#1a7fba", textDecoration: "none", background: "#edf7fd", padding: "4px 10px", borderRadius: "6px", border: "1px solid #b6def5" }}>
                          View <ArrowUpRight size={10} />
                        </Link>
                        <DeleteCustomerButton customerId={c.id} customerName={c.name} compact />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}