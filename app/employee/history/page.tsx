// app/employee/history/page.tsx
import { getOrders } from "@/lib/actions/orders";
import { formatUSD } from "@/lib/utils/order-form";
import Link          from "next/link";
import { ChevronRight, History, CheckCircle2 } from "lucide-react";

export default async function HistoryPage() {
  const allOrders = await getOrders(100);
  const delivered = allOrders.filter((o) => o.status === "picked_up");

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="font-extrabold text-xl text-foreground" style={{ fontFamily: "Sora, sans-serif" }}>
          History
        </h1>
        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
          {delivered.length} picked up {delivered.length === 1 ? "order" : "orders"}
        </p>
      </div>

      {/* ── Empty state ──────────────────────────────────────── */}
      {delivered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
            <History size={24} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">No completed orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">Picked-up orders will appear here</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {delivered.map((order) => (
            <Link
              key={order.id}
              href={`/employee/orders/${order.id}`}
              className="akiro-order-row group"
            >
              {/* Completed avatar — muted green tint */}
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{order.customerName}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{order.orderNumber}</p>
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