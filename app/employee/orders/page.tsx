// app/employee/orders/page.tsx
import { getOrders } from "@/lib/actions/orders";
import { Badge }     from "@/components/ui/badge";
import { formatUSD, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/order-form";
import Link from "next/link";
import { ChevronRight, Package, Plus } from "lucide-react";

export default async function OrdersPage() {
  const orders = await getOrders(50);

  return (
    <div className="space-y-5 px-4 pb-24 pt-2">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-xl text-slate-800 tracking-tight">Orders</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {orders.length} {orders.length === 1 ? "order" : "orders"} found
          </p>
        </div>
        <Link
          href="/employee/orders/new"
          className="flex items-center gap-1.5 bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-md shadow-blue-200 hover:bg-blue-600 transition-colors active:scale-95"
        >
          <Plus size={13} strokeWidth={3} />
          New Order
        </Link>
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
            <Package size={24} className="text-blue-400" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-700 text-sm">No orders yet</p>
            <p className="text-xs text-slate-400">Orders you create will appear here</p>
          </div>
          <Link
            href="/employee/orders/new"
            className="mt-1 bg-blue-500 text-white text-sm font-bold px-6 py-3 rounded-full shadow-md shadow-blue-200 hover:bg-blue-600 transition-colors active:scale-95"
          >
            Create first order →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => {
            // Build a compact services summary from items[]
            const servicesSummary = order.items.length > 0
              ? order.items.map((it) => it.serviceName).join(" + ")
              : "—";

            // Build weight/qty summary (e.g. "3.5 kg + 2 pcs")
            const qtySummary = order.items.length > 0
              ? order.items
                  .map((it) =>
                    it.quantity != null
                      ? `${it.quantity} pcs`
                      : it.weightKg != null
                      ? `${it.weightKg} kg`
                      : null,
                  )
                  .filter(Boolean)
                  .join(" + ")
              : null;

            return (
              <Link
                key={order.id}
                href={`/employee/orders/${order.id}`}
                className="group flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all duration-150 active:scale-[0.99]"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                  {order.customerName[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm text-slate-800 truncate">{order.customerName}</p>
                    <Badge
                      className={`text-[9px] px-2 py-0.5 font-bold shrink-0 ${ORDER_STATUS_COLORS[order.status]}`}
                      variant="outline"
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{order.orderNumber}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                    {servicesSummary}
                    {qtySummary ? ` · ${qtySummary}` : ""}
                  </p>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <p className="font-black text-sm text-slate-800">{formatUSD(parseFloat(order.totalPrice))}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                  {order.items.length > 1 && (
                    <p className="text-[9px] font-bold mt-0.5" style={{ color: "#1a7fba" }}>
                      {order.items.length} services
                    </p>
                  )}
                </div>

                <ChevronRight size={14} className="text-slate-300 shrink-0 ml-1 group-hover:text-blue-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}