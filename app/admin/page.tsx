// app/admin/page.tsx
import { getDashboardStats, getOrders } from "@/lib/actions/orders";
import { getCashRegisterState }         from "@/lib/actions/payments";
import { formatUSD, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import { OrderTableRow } from "@/components/admin/OrderTableRow";
import {
  ShoppingBag, Clock, CheckCircle2, TrendingUp,
  Wallet, ArrowUpRight, Users,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [stats, recentOrders, cashState] = await Promise.all([
    getDashboardStats(),
    getOrders(10),
    getCashRegisterState(),
  ]);

  const statCards = [
    {
      label: "Today's Orders",
      value: stats.todayOrders.toString(),
      sub:   "new orders today",
      icon:  ShoppingBag,
      color: "#1a7fba",
      bg:    "linear-gradient(135deg,#edf7fd,#c8e9f8)",
      border:"#b6def5",
    },
    {
      label: "In Progress",
      value: stats.activeOrders.toString(),
      sub:   "pending or processing",
      icon:  Clock,
      color: "#d97706",
      bg:    "linear-gradient(135deg,#fffbeb,#fef3c7)",
      border:"#fcd34d",
    },
    {
      label: "Ready for Pickup",
      value: stats.doneOrders.toString(),
      sub:   "awaiting collection",
      icon:  CheckCircle2,
      color: "#16a34a",
      bg:    "linear-gradient(135deg,#f0fdf4,#dcfce7)",
      border:"#86efac",
    },
    {
      label: "Today's Revenue",
      value: formatUSD(stats.todayRevenue),
      sub:   "from paid orders",
      icon:  TrendingUp,
      color: "#7c3aed",
      bg:    "linear-gradient(135deg,#f5f3ff,#ede9fe)",
      border:"#c4b5fd",
    },
  ];

  const pipeline = ["pending", "processing", "done", "picked_up"] as const;

  const pipelineConfigs: Record<string, { color: string; bg: string; border: string }> = {
    pending:    { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
    processing: { color: "#1a7fba", bg: "#edf7fd", border: "#b6def5" },
    done:       { color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
    picked_up:  { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ── Page heading ───────────────────────────────────── */}
      <div>
        <h1 style={{
          fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px",
          color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px",
        }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "white", borderRadius: "12px",
              border: "1.5px solid #e2e8f0", padding: "20px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "10px",
                background: card.bg, border: `1.5px solid ${card.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
              <ArrowUpRight size={14} style={{ color: "#cbd5e1", marginTop: "2px" }} />
            </div>
            <p style={{
              fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "24px",
              color: "#0f172a", marginTop: "14px", letterSpacing: "-0.02em",
            }}>
              {card.value}
            </p>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginTop: "2px" }}>
              {card.label}
            </p>
            <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Lower grid ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

        {/* Recent orders table */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid #f1f5f9",
          }}>
            <div>
              <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                Recent Orders
              </p>
              <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                Latest {recentOrders.length} orders
              </p>
            </div>
            <Link
              href="/admin/orders"
              style={{
                fontSize: "11px", fontWeight: 700, color: "#1a7fba",
                textDecoration: "none",
                background: "#edf7fd", padding: "5px 12px", borderRadius: "999px",
                border: "1px solid #b6def5",
              }}
            >
              View all →
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Order #", "Customer", "Service", "Total", "Status"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left",
                      fontSize: "10px", fontWeight: 800,
                      color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em",
                      borderBottom: "1px solid #e2e8f0",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Client component — handles onMouseEnter / onMouseLeave */}
                {recentOrders.map((order, i) => (
                  <OrderTableRow key={order.id} order={order} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Cash register card */}
          <div style={{
            borderRadius: "12px",
            background: "linear-gradient(135deg,#0c1e35 0%,#0f3460 100%)",
            boxShadow: "0 8px 30px rgba(12,30,53,0.25)",
            padding: "22px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -40, right: -40,
              width: 140, height: 140, borderRadius: "50%",
              background: "radial-gradient(circle,rgba(26,127,186,0.3) 0%,transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Wallet size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
              <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Cash Register
              </p>
            </div>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 900, fontSize: "30px", color: "white", letterSpacing: "-0.03em" }}>
              {formatUSD(cashState.balance)}
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
              Current drawer balance
            </p>
            <Link
              href="/admin/cash-register"
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                marginTop: "14px", fontSize: "11px", fontWeight: 700,
                color: "#2496d6", textDecoration: "none",
                background: "rgba(36,150,214,0.12)",
                padding: "5px 12px", borderRadius: "999px",
                border: "1px solid rgba(36,150,214,0.25)",
              }}
            >
              Manage <ArrowUpRight size={11} />
            </Link>
          </div>

          {/* Order pipeline */}
          <div style={{
            background: "white", borderRadius: "12px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
              <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "13px", color: "#0f172a" }}>
                Order Pipeline
              </p>
            </div>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {pipeline.map((status) => {
                const count = recentOrders.filter((o) => o.status === status).length;
                const cfg   = pipelineConfigs[status];
                return (
                  <div key={status} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: cfg.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569", flex: 1 }}>
                      {ORDER_STATUS_LABELS[status]}
                    </span>
                    <span style={{
                      fontSize: "11px", fontWeight: 800, color: cfg.color,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      padding: "2px 8px", borderRadius: "999px",
                    }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div style={{
            background: "white", borderRadius: "12px",
            border: "1.5px solid #e2e8f0", padding: "14px 18px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          }}>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "13px", color: "#0f172a", marginBottom: "12px" }}>
              Quick Links
            </p>
            {[
              { href: "/admin/customers",     label: "Manage Customers",     icon: Users       },
              { href: "/admin/services",      label: "Edit Services",        icon: ShoppingBag },
              { href: "/admin/cash-register", label: "Adjust Cash Register", icon: Wallet      },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 0", borderBottom: "1px solid #f1f5f9",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <Icon size={14} style={{ color: "#1a7fba" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", flex: 1 }}>
                  {label}
                </span>
                <ArrowUpRight size={12} style={{ color: "#cbd5e1" }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}