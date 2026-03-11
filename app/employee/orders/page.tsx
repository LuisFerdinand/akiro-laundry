// app/employee/orders/page.tsx
import { getOrders } from "@/lib/actions/orders";
import { Badge }     from "@/components/ui/badge";
import { formatUSD, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/order-form";
import Link from "next/link";
import { ChevronRight, Package, Sparkles } from "lucide-react";

export default async function OrdersPage() {
  const orders = await getOrders(50);

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-extrabold text-xl text-foreground" style={{ fontFamily: "Sora, sans-serif" }}>
            Orders
          </h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
            {orders.length} {orders.length === 1 ? "order" : "orders"} found
          </p>
        </div>
        <Link
          href="/employee/orders/new"
          className="flex items-center gap-1.5 bg-brand text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-md shadow-brand/30 hover:bg-brand-dark transition-colors"
        >
          <Sparkles size={12} />
          New
        </Link>
      </div>

      {/* ── Empty state ──────────────────────────────────────── */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-brand-soft border-2 border-brand-muted flex items-center justify-center">
            <Package size={24} className="text-brand" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">Orders you create will appear here</p>
          </div>
          <Link
            href="/employee/orders/new"
            className="mt-1 bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md shadow-brand/30 hover:bg-brand-dark transition-colors"
          >
            Create first order →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/employee/orders/${order.id}`}
              className="akiro-order-row group"
            >
              <div className="akiro-avatar akiro-avatar--brand">
                <span>{order.customerName[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-sm truncate">{order.customerName}</p>
                  <Badge
                    className={`text-[9px] px-2 py-0.5 font-bold shrink-0 ${ORDER_STATUS_COLORS[order.status]}`}
                    variant="outline"
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{order.orderNumber}</p>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  {order.serviceName} · {order.weightKg} kg
                </p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="font-extrabold text-sm text-foreground">
                  {formatUSD(parseFloat(order.totalPrice))}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/50 shrink-0 ml-1 group-hover:text-brand transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}