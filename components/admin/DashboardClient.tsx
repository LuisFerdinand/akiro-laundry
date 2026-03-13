/* eslint-disable react-hooks/immutability */
// components/admin/DashboardClient.tsx
"use client";

import Link from "next/link";
import {
  ArrowUpRight, TrendingUp, ShoppingBag, Users,
  Wallet, Clock, Waves, PackageCheck,
  CreditCard, AlertCircle, Star, Crown, Flame,
  Instagram, Music2, UserPlus, Activity, ExternalLink,
} from "lucide-react";
import { formatUSD, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import type {
  FullDashboardStats,
  DailyRevenuePoint,
  MonthlyRevenuePoint,
} from "@/lib/actions/dashboard-stats";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  stats:  FullDashboardStats;
  social: { tiktokHandle: string; instagramHandle: string };
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function DailyBarChart({
  data, color, height = 110,
}: {
  data:   DailyRevenuePoint[];
  color:  string;
  height?: number;
}) {
  const values  = data.map((d) => d.revenue);
  const max     = Math.max(...values, 1);
  const lastIdx = data.length - 1;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height }}>
      {data.map((d, i) => {
        const pct    = (d.revenue / max) * 100;
        const isLast = i === lastIdx;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
              <div
                title={`${d.date}: ${formatUSD(d.revenue)} · ${d.orders} orders`}
                style={{
                  width: "100%", minHeight: "3px",
                  height: `${Math.max(pct, 3)}%`,
                  borderRadius: "4px 4px 0 0",
                  background: isLast ? color : `${color}66`,
                  boxShadow: isLast ? `0 2px 8px ${color}44` : "none",
                  cursor: "default",
                }}
              />
            </div>
            <span style={{ fontSize: "9px", fontWeight: 600, color: isLast ? "#475569" : "#94a3b8", whiteSpace: "nowrap" }}>
              {d.date}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyBarChart({
  data, valueKey, color, height = 110,
}: {
  data:     MonthlyRevenuePoint[];
  valueKey: "revenue" | "orders";
  color:    string;
  height?:  number;
}) {
  const values  = data.map((d) => d[valueKey]);
  const max     = Math.max(...values, 1);
  const lastIdx = data.length - 1;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height }}>
      {data.map((d, i) => {
        const val    = d[valueKey];
        const pct    = (val / max) * 100;
        const isLast = i === lastIdx;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
              <div
                title={`${d.month}: ${valueKey === "revenue" ? formatUSD(val) : `${val} orders`}`}
                style={{
                  width: "100%", minHeight: "3px",
                  height: `${Math.max(pct, 3)}%`,
                  borderRadius: "4px 4px 0 0",
                  background: isLast ? color : `${color}66`,
                  boxShadow: isLast ? `0 2px 8px ${color}44` : "none",
                  cursor: "default",
                }}
              />
            </div>
            <span style={{ fontSize: "9px", fontWeight: 600, color: isLast ? "#475569" : "#94a3b8", whiteSpace: "nowrap" }}>
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max  = Math.max(...values, 1);
  const W    = 80;
  const H    = 28;
  const step = values.length > 1 ? W / (values.length - 1) : W;

  const pts = values.map((v, i) => {
    const x = i * step;
    const y = H - (v / max) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const fillPts = `0,${H} ${pts} ${W},${H}`;
  const lastX   = (values.length - 1) * step;
  const lastY   = H - (values[values.length - 1] / max) * (H - 4) - 2;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polygon points={fillPts} fill={`${color}22`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total  = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const R = 38; const cx = 48; const cy = 48; const stroke = 12;
  let offset   = -90;

  const arcs = segments.map((seg) => {
    const deg    = (seg.value / total) * 360;
    const rad    = (offset * Math.PI) / 180;
    const endRad = ((offset + deg) * Math.PI) / 180;
    const x1 = cx + R * Math.cos(rad);   const y1 = cy + R * Math.sin(rad);
    const x2 = cx + R * Math.cos(endRad); const y2 = cy + R * Math.sin(endRad);
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${deg > 180 ? 1 : 0} 1 ${x2} ${y2}`;
    offset += deg;
    return { ...seg, path };
  });

  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {arcs.map((arc, i) =>
        arc.value > 0 ? (
          <path key={i} d={arc.path} fill="none" stroke={arc.color} strokeWidth={stroke} strokeLinecap="butt" />
        ) : null
      )}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 8}  textAnchor="middle" fontSize="7.5"            fill="#94a3b8">orders</text>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", padding: "18px 20px", ...style }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, sub, href }: { title: string; sub?: string; href?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
      <div>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>{title}</p>
        {sub && <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>{sub}</p>}
      </div>
      {href && (
        <Link href={href} style={{ fontSize: "11px", fontWeight: 700, color: "#1a7fba", textDecoration: "none", background: "#edf7fd", padding: "4px 12px", borderRadius: "999px", border: "1px solid #b6def5", display: "flex", alignItems: "center", gap: "4px" }}>
          View all <ArrowUpRight size={10} />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color, bg, border, sparkValues, trend,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; color: string; bg: string; border: string;
  sparkValues?: number[]; trend?: number;
}) {
  const trendUp = (trend ?? 0) >= 0;
  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 38, height: 38, borderRadius: "10px", background: bg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={17} style={{ color }} />
        </div>
        {sparkValues && <Sparkline values={sparkValues} color={color} />}
      </div>
      <div>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "22px", color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginTop: "4px" }}>{label}</p>
        <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sub}</p>
      </div>
      {trend !== undefined && (
        <span style={{ fontSize: "10px", fontWeight: 700, color: trendUp ? "#16a34a" : "#dc2626" }}>
          {trendUp ? "▲" : "▼"} {Math.abs(trend).toFixed(0)}% vs last month
        </span>
      )}
    </div>
  );
}

// ─── Social profile card ──────────────────────────────────────────────────────

function SocialProfileCard({
  platform, handle, profileUrl, color, gradientFrom, gradientTo, Icon, description,
}: {
  platform:     string;
  handle:       string;
  profileUrl:   string;
  color:        string;
  gradientFrom: string;
  gradientTo:   string;
  Icon:         React.ElementType;
  description:  string;
}) {
  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{
        borderRadius: "14px", overflow: "hidden",
        border: `1.5px solid ${color}33`,
        boxShadow: `0 4px 20px ${color}14`,
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "pointer",
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${color}28`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${color}14`;
        }}
      >
        {/* Gradient header */}
        <div style={{
          background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          padding: "20px 22px 16px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -20, right: -20, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, right: 30, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Platform icon circle */}
            <div style={{
              width: 48, height: 48, borderRadius: "14px",
              background: "rgba(255,255,255,0.18)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={22} style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{platform}</p>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "white", marginTop: "1px", fontFamily: "Sora, sans-serif" }}>{handle}</p>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ExternalLink size={13} style={{ color: "white" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ background: "white", padding: "14px 22px" }}>
          <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>{description}</p>
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color }}>Open {platform} profile →</span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; Icon: React.ElementType }> = {
  pending:    { color: "#d97706", bg: "#fffbeb", border: "#fcd34d", Icon: Clock        },
  processing: { color: "#1a7fba", bg: "#edf7fd", border: "#b6def5", Icon: Waves        },
  done:       { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", Icon: PackageCheck },
  picked_up:  { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: ShoppingBag  },
};

export function DashboardClient({ stats, social }: Props) {
  const {
    revenue, orderCounts, dailyRevenue, monthlyRevenue,
    statusBreakdown, paymentBreakdown,
    topCustomers, topServices,
    cashBalance, newCustomersThisMonth, avgOrderValue, recentOrders,
  } = stats;

  const revenueTrend = revenue.lastMonth > 0
    ? ((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth) * 100
    : 0;
  const orderTrend = orderCounts.lastMonth > 0
    ? ((orderCounts.thisMonth - orderCounts.lastMonth) / orderCounts.lastMonth) * 100
    : 0;

  const sparkRevenue = dailyRevenue.map((d) => d.revenue);
  const sparkOrders  = dailyRevenue.map((d) => d.orders);

  const donutSegments = [
    { value: statusBreakdown.pending,    color: "#f59e0b", label: "Pending"    },
    { value: statusBreakdown.processing, color: "#1a7fba", label: "Processing" },
    { value: statusBreakdown.done,       color: "#16a34a", label: "Done"       },
    { value: statusBreakdown.picked_up,  color: "#94a3b8", label: "Picked Up"  },
  ];

  const totalOrdersAll = Object.values(statusBreakdown).reduce((s, v) => s + v, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>Dashboard</h1>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {/* Cash register pill */}
        <div style={{ background: "linear-gradient(135deg,#0c1e35,#0f3460)", borderRadius: "12px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 16px rgba(12,30,53,0.2)" }}>
          <Wallet size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
          <div>
            <p style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Cash Register</p>
            <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "18px", color: "white", lineHeight: 1, marginTop: "2px" }}>{formatUSD(cashBalance)}</p>
          </div>
          <Link href="/admin/cash-register" style={{ fontSize: "10px", fontWeight: 700, color: "#2496d6", textDecoration: "none", background: "rgba(36,150,214,0.15)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(36,150,214,0.25)", whiteSpace: "nowrap" }}>
            Manage →
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <StatCard label="This Month Revenue" value={formatUSD(revenue.thisMonth)} sub={`${formatUSD(revenue.today)} today`} icon={TrendingUp} color="#16a34a" bg="linear-gradient(135deg,#f0fdf4,#dcfce7)" border="#86efac" sparkValues={sparkRevenue} trend={revenueTrend} />
        <StatCard label="Orders This Month"  value={orderCounts.thisMonth.toString()} sub={`${orderCounts.today} today · ${orderCounts.thisWeek} this week`} icon={ShoppingBag} color="#1a7fba" bg="linear-gradient(135deg,#edf7fd,#c8e9f8)" border="#b6def5" sparkValues={sparkOrders} trend={orderTrend} />
        <StatCard label="New Customers"      value={newCustomersThisMonth.toString()} sub="joined this month" icon={UserPlus} color="#7c3aed" bg="linear-gradient(135deg,#f5f3ff,#ede9fe)" border="#c4b5fd" />
        <StatCard label="Avg Order Value"    value={formatUSD(avgOrderValue)} sub={`from ${paymentBreakdown.paid} paid orders`} icon={Activity} color="#d97706" bg="linear-gradient(135deg,#fffbeb,#fef3c7)" border="#fcd34d" />
      </div>

      {/* ── Revenue charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card>
          <SectionHeader title="Revenue — Last 7 Days" sub="Paid orders only" />
          <DailyBarChart data={dailyRevenue} color="#1a7fba" height={110} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
            <div>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>This week</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>{formatUSD(revenue.thisWeek)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>Today</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "#1a7fba", fontFamily: "Sora, sans-serif" }}>{formatUSD(revenue.today)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Revenue — Last 6 Months" sub="Monthly breakdown" />
          <MonthlyBarChart data={monthlyRevenue} valueKey="revenue" color="#16a34a" height={110} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
            <div>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>This month</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>{formatUSD(revenue.thisMonth)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>Last month</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "#64748b", fontFamily: "Sora, sans-serif" }}>{formatUSD(revenue.lastMonth)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Status + payment + volume ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>

        <Card>
          <SectionHeader title="Order Status" sub="All-time breakdown" />
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <DonutChart segments={donutSegments} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              {donutSegments.map((seg) => (
                <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{seg.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Payment Status" sub="Revenue collection" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ padding: "12px 14px", background: "#f0fdf4", borderRadius: "10px", border: "1.5px solid #86efac" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <CreditCard size={13} style={{ color: "#16a34a" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a" }}>Paid</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#16a34a" }}>{paymentBreakdown.paid} orders</span>
              </div>
              <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "18px", color: "#14532d" }}>{formatUSD(paymentBreakdown.paidRevenue)}</p>
            </div>
            <div style={{ padding: "12px 14px", background: "#fffbeb", borderRadius: "10px", border: "1.5px solid #fcd34d" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={13} style={{ color: "#d97706" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706" }}>Unpaid</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#d97706" }}>{paymentBreakdown.unpaid} orders</span>
              </div>
              <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "18px", color: "#92400e" }}>{formatUSD(paymentBreakdown.unpaidValue)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Order Volume" sub="Count per month" />
          <MonthlyBarChart data={monthlyRevenue} valueKey="orders" color="#7c3aed" height={110} />
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>This month</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>{orderCounts.thisMonth}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>All time</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "#7c3aed", fontFamily: "Sora, sans-serif" }}>{totalOrdersAll}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Top customers + services ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card>
          <SectionHeader title="Top Customers" sub="By total spend" href="/admin/customers?sort=top_spender" />
          {topCustomers.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No paid orders yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topCustomers.map((c, i) => {
                const RANK = [
                  { bg: "linear-gradient(135deg,#f59e0b,#fbbf24)", icon: <Crown size={11} style={{ color: "white" }} /> },
                  { bg: "linear-gradient(135deg,#94a3b8,#cbd5e1)", icon: <Users size={10} style={{ color: "white" }} /> },
                  { bg: "linear-gradient(135deg,#cd7c3f,#e8a06b)", icon: <Users size={10} style={{ color: "white" }} /> },
                ];
                const rc = RANK[i];
                const pct = topCustomers[0].totalSpent > 0 ? (c.totalSpent / topCustomers[0].totalSpent) * 100 : 0;
                return (
                  <Link key={c.id} href={`/admin/customers/${c.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", transition: "background 0.1s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{rc.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#d97706", flexShrink: 0, marginLeft: "8px" }}>{formatUSD(c.totalSpent)}</span>
                        </div>
                        <div style={{ height: 3, background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: "999px", background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
                        </div>
                        <p style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>{c.totalOrders} orders</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Top Services" sub="By order count" href="/admin/services" />
          {topServices.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No orders yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topServices.map((s, i) => {
                const icons  = [<Flame key={0} size={13} style={{ color: "white" }} />, <Star key={1} size={11} style={{ color: "white" }} />, <ShoppingBag key={2} size={11} style={{ color: "white" }} />];
                const bgs    = ["linear-gradient(135deg,#f59e0b,#fbbf24)", "linear-gradient(135deg,#1a7fba,#2496d6)", "linear-gradient(135deg,#94a3b8,#cbd5e1)"];
                const bars   = ["#f59e0b", "#1a7fba", "#94a3b8"];
                const pct    = topServices[0].totalOrders > 0 ? (s.totalOrders / topServices[0].totalOrders) * 100 : 0;
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "8px", background: bgs[i], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icons[i]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: bars[i], flexShrink: 0, marginLeft: "8px" }}>{s.totalOrders} orders</span>
                      </div>
                      <div style={{ height: 3, background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: "999px", background: bars[i] }} />
                      </div>
                      <p style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>{formatUSD(s.totalRevenue)} earned · {s.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent orders ── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <SectionHeader title="Recent Orders" sub={`Last ${recentOrders.length} orders`} href="/admin/orders" />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Order #", "Customer", "Total", "Payment", "Status", "Date", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o, i) => {
                const sc     = STATUS_CONFIG[o.status];
                const isPaid = o.paymentStatus === "paid";
                return (
                  <tr key={o.id}
                    style={{ background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                  >
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a7fba", fontFamily: "monospace" }}>{o.orderNumber}</span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{o.customerName}</span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{formatUSD(parseFloat(o.totalPrice))}</span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", color: isPaid ? "#16a34a" : "#d97706", background: isPaid ? "#f0fdf4" : "#fffbeb", border: `1px solid ${isPaid ? "#86efac" : "#fcd34d"}` }}>
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <sc.Icon size={9} />{ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <Link href={`/admin/orders/${o.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#1a7fba", textDecoration: "none", background: "#edf7fd", padding: "4px 10px", borderRadius: "6px", border: "1px solid #b6def5" }}>
                        View <ArrowUpRight size={10} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Social media profiles ── */}
      <div>
        <div style={{ marginBottom: "14px" }}>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>Social Media</p>
          <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>Our brand presence — click to open profiles</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <SocialProfileCard
            platform="TikTok"
            handle={social.tiktokHandle}
            profileUrl={`https://www.tiktok.com/@${social.tiktokHandle.replace("@", "")}`}
            color="#010101"
            gradientFrom="#010101"
            gradientTo="#2d2d2d"
            Icon={Music2}
            description="Watch our latest laundry tips, behind-the-scenes content, and promotions on TikTok."
          />
          <SocialProfileCard
            platform="Instagram"
            handle={social.instagramHandle}
            profileUrl={`https://www.instagram.com/${social.instagramHandle.replace("@", "")}`}
            color="#e1306c"
            gradientFrom="#f09433"
            gradientTo="#e1306c"
            Icon={Instagram}
            description="Follow us on Instagram for promos, customer stories, and daily updates from our laundry."
          />
        </div>
      </div>

    </div>
  );
}