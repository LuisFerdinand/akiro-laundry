// components/admin/CustomersClient.tsx
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, X, Loader2, Save,
  Users, ArrowUpRight, Trophy, Star,
  UserPlus, Crown, Medal, Award,
  ShoppingBag, Sparkles, BarChart3, ChevronDown,
} from "lucide-react";
import { createCustomer } from "@/lib/actions/admin-customers";
import { formatUSD } from "@/lib/utils/order-form";
import type { CustomerWithStats, CustomerInsights, SortOption } from "@/lib/actions/admin-customers";

// ─── Create Customer Modal ────────────────────────────────────────────────────
function CreateCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim() || !address.trim()) { setError("All fields are required."); return; }
    setError(null);
    start(async () => {
      const result = await createCustomer({ name, phone, address });
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

// ─── Monthly Bar Chart ────────────────────────────────────────────────────────
function MonthlyNewCustomers({ data, thisMonthCount }: { data: { month: string; count: number }[]; thisMonthCount: number }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 34, height: 34, borderRadius: "9px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserPlus size={16} style={{ color: "#16a34a" }} />
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>New Customers</p>
            <p style={{ fontSize: "10px", color: "#94a3b8" }}>Monthly growth · last 6 months</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "#16a34a", fontFamily: "Sora, sans-serif", lineHeight: 1 }}>{thisMonthCount}</p>
          <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>this month</p>
        </div>
      </div>
      <div style={{ padding: "18px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
          {data.map((d, i) => {
            const isLast = i === data.length - 1;
            const pct = (d.count / max) * 100;
            return (
              <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: isLast ? "#16a34a" : "#64748b" }}>{d.count}</span>
                <div style={{
                  width: "100%", height: `${Math.max(pct, 6)}%`, minHeight: "4px",
                  borderRadius: "4px 4px 0 0",
                  background: isLast ? "linear-gradient(180deg,#16a34a,#4ade80)" : "linear-gradient(180deg,#94a3b8,#cbd5e1)",
                  boxShadow: isLast ? "0 2px 8px rgba(22,163,74,0.25)" : "none",
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
          {data.map((d, i) => (
            <div key={d.month} style={{ flex: 1, textAlign: "center" }}>
              <span style={{ fontSize: "9px", fontWeight: 600, color: i === data.length - 1 ? "#16a34a" : "#94a3b8" }}>{d.month}</span>
            </div>
          ))}
        </div>
      </div>
      {thisMonthCount > 0 && (
        <div style={{ padding: "0 18px 14px" }}>
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={12} style={{ color: "#16a34a" }} />
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#14532d" }}>{thisMonthCount} new customer{thisMonthCount !== 1 ? "s" : ""} joined this month!</p>
          </div>
        </div>
      )}
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
  customers:     CustomerWithStats[];
  insights:      CustomerInsights;
  initialSearch: string;
  initialSort:   SortOption;
}

export function CustomersClient({ customers, insights, initialSearch, initialSort }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [search,    setSearch]    = useState(initialSearch);
  const [sort,      setSort]      = useState<SortOption>(initialSort);
  const [showModal, setShowModal] = useState(false);
  const [isPending, start]        = useTransition();

  // Debounce ref — prevents a router.push on every single keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushUrl = (newSearch: string, newSort: SortOption) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (newSearch) sp.set("search", newSearch); else sp.delete("search");
    sp.set("sort", newSort);
    start(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const handleSearch = (v: string) => {
    setSearch(v); // update input immediately (controlled value)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl(v, sort), 350);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    pushUrl("", sort);
  };

  // Clean up timer on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSort = (v: SortOption) => {
    setSort(v);
    if (debounceRef.current) clearTimeout(debounceRef.current); // cancel any in-flight search
    pushUrl(search, v); // sort is instant — no debounce
  };

  const handleCreated = () => { setShowModal(false); router.refresh(); };

  const totalSpent  = customers.reduce((s, c) => s + c.totalSpent,  0);
  const totalOrders = customers.reduce((s, c) => s + c.totalOrders, 0);

  return (
    <>
      {showModal && <CreateCustomerModal onClose={() => setShowModal(false)} onSuccess={handleCreated} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>Customers</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              {customers.length} customer{customers.length !== 1 ? "s" : ""} · {formatUSD(totalSpent)} total revenue · {totalOrders} orders
            </p>
          </div>
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

        {/* ── Insights Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <LeaderboardCard title="Top Spenders" icon={Trophy} iconColor="#d97706" iconBg="linear-gradient(135deg,#fffbeb,#fef3c7)" customers={insights.topSpenders} valueKey="totalSpent" formatValue={formatUSD} />
          <LeaderboardCard title="Most Repeat"  icon={Star}   iconColor="#1a7fba"  iconBg="linear-gradient(135deg,#edf7fd,#c8e9f8)" customers={insights.mostRepeat}  valueKey="totalOrders" formatValue={(v) => `${v} orders`} />
          <MonthlyNewCustomers data={insights.newByMonth} thisMonthCount={insights.newThisMonth.length} />
        </div>

        {/* ── Search + Sort ── */}
        <div style={{
          background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0",
          padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          {/* Search input with clear button */}
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

          {/* Sort select */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
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

          {/* Pending indicator */}
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
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["#", "Customer", "Phone", "Address", "Orders", "Total Spent", "Last Order", ""].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "48px", textAlign: "center" }}>
                      <Users size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
                        {search ? `No customers matching "${search}"` : "No customers found"}
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
                      <Link href={`/admin/customers/${c.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#1a7fba", textDecoration: "none", background: "#edf7fd", padding: "4px 10px", borderRadius: "6px", border: "1px solid #b6def5" }}>
                        View <ArrowUpRight size={10} />
                      </Link>
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