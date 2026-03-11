// app/employee/page.tsx
import { getDashboardStats, getOrders } from "@/lib/actions/orders";
import { formatUSD, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import { Badge }   from "@/components/ui/badge";
import Link        from "next/link";
import {
  ShoppingBag, Clock, CheckCircle2, TrendingUp, ChevronRight, Sparkles,
} from "lucide-react";

export default async function EmployeeDashboard() {
  const [stats, recentOrders] = await Promise.all([
    getDashboardStats(),
    getOrders(5),
  ]);

  const statCards = [
    {
      label: "Today's Orders",
      value: stats.todayOrders,
      icon: ShoppingBag,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      accent: "#3b82f6",
    },
    {
      label: "In Progress",
      value: stats.activeOrders,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      accent: "#f59e0b",
    },
    {
      label: "Ready to Pickup",
      value: stats.doneOrders,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      accent: "#10b981",
    },
    {
      label: "Today's Revenue",
      value: formatUSD(stats.todayRevenue),
      icon: TrendingUp,
      iconBg: "bg-brand-soft",
      iconColor: "text-brand",
      accent: "#1a7fba",
    },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">

      {/* ── Greeting banner ─────────────────────────────────── */}
      <div className="akiro-greeting-card">
        <div className="akiro-greeting-orb akiro-greeting-orb--1" />
        <div className="akiro-greeting-orb akiro-greeting-orb--2" />
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-semibold tracking-wide uppercase mb-0.5">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-white font-extrabold text-2xl leading-tight" style={{ fontFamily: "Sora, sans-serif" }}>
            {greeting} 👋
          </h1>
          <p className="text-white/60 text-xs mt-1 font-medium">Here&apos;s what&apos;s happening today</p>
        </div>
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="akiro-stat-chip">
              <div className={`akiro-stat-icon ${iconBg}`}>
                <Icon size={14} className={iconColor} />
              </div>
              <p className="text-white font-extrabold text-xl leading-none mt-2" style={{ fontFamily: "Sora, sans-serif" }}>
                {value}
              </p>
              <p className="text-white/55 text-[10px] font-semibold mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick action ─────────────────────────────────────── */}
      <Link href="/employee/orders/new" className="akiro-new-order-btn group">
        <div className="akiro-new-order-icon">
          <Sparkles size={18} className="text-brand" />
        </div>
        <div className="flex-1">
          <p className="font-extrabold text-brand-dark text-sm">New Laundry Order</p>
          <p className="text-brand/50 text-xs font-semibold mt-0.5">Tap to start taking an order</p>
        </div>
        <div className="akiro-new-order-arrow">
          <ChevronRight size={16} className="text-brand" />
        </div>
      </Link>

      {/* ── Recent orders ────────────────────────────────────── */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm text-foreground" style={{ fontFamily: "Sora, sans-serif" }}>
              Recent Orders
            </h2>
            <Link
              href="/employee/orders"
              className="text-[11px] font-bold text-brand bg-brand-soft px-3 py-1 rounded-full hover:bg-brand-muted transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/employee/orders/${order.id}`}
                className="akiro-order-row group"
              >
                <div className="akiro-avatar akiro-avatar--brand">
                  <span>{order.customerName[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-foreground">{order.customerName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{order.orderNumber}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge
                    className={`text-[9px] px-2 py-0.5 font-bold ${ORDER_STATUS_COLORS[order.status]}`}
                    variant="outline"
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <span className="text-xs font-extrabold text-foreground">
                    {formatUSD(parseFloat(order.totalPrice))}
                  </span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/50 shrink-0 ml-1 group-hover:text-brand transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}