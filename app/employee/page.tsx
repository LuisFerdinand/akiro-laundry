// app/employee/page.tsx
import { getDashboardStats, getOrders } from "@/lib/actions/orders";
import { formatUSD, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import { Badge }   from "@/components/ui/badge";
import Link        from "next/link";
import {
  ShoppingBag, Clock, CheckCircle, TrendingUp, ChevronRight, PlusCircle,
} from "lucide-react";

export default async function EmployeeDashboard() {
  const [stats, recentOrders] = await Promise.all([
    getDashboardStats(),
    getOrders(5),
  ]);

  const statCards = [
    { label: "Today's Orders",  value: stats.todayOrders,             icon: ShoppingBag,  color: "text-blue-600",   bg: "bg-blue-50"   },
    { label: "In Progress",     value: stats.activeOrders,            icon: Clock,        color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Ready to Pickup", value: stats.doneOrders,              icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50"  },
    { label: "Today's Revenue", value: formatUSD(stats.todayRevenue), icon: TrendingUp,   color: "text-brand",      bg: "bg-brand-soft"},
  ];

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold">Good morning 👋</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-lg border bg-white p-4 space-y-2">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xl font-bold leading-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <Link
        href="/employee/orders/new"
        className="flex items-center gap-3 p-4 rounded-lg brand-gradient text-white shadow-md"
      >
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
          <PlusCircle size={18} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">New Order</p>
          <p className="text-white/70 text-xs">Add a new laundry order</p>
        </div>
        <ChevronRight size={16} className="text-white/60" />
      </Link>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Recent Orders</h2>
            <Link href="/employee/orders" className="text-xs text-brand font-medium">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/employee/orders/${order.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:border-brand/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center shrink-0">
                  <span className="text-brand text-xs font-bold">{order.customerName[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.orderNumber}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`text-[10px] px-1.5 py-0 ${ORDER_STATUS_COLORS[order.status]}`} variant="outline">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <span className="text-xs font-semibold">{formatUSD(parseFloat(order.totalPrice))}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}