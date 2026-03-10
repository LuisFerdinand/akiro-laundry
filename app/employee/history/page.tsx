// app/employee/history/page.tsx
import { getOrders } from "@/lib/actions/orders";
import { formatUSD } from "@/lib/utils/order-form";
import { Badge }     from "@/components/ui/badge";
import Link          from "next/link";
import { ChevronRight, History } from "lucide-react";

export default async function HistoryPage() {
  const allOrders = await getOrders(100);
  const delivered = allOrders.filter((o) => o.status === "picked_up");

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="text-lg font-bold">History</h1>
        <p className="text-sm text-muted-foreground">{delivered.length} picked up orders</p>
      </div>

      {delivered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <History size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No delivered orders yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {delivered.map((order) => (
            <Link
              key={order.id}
              href={`/employee/orders/${order.id}`}
              className="flex items-center gap-3 p-4 rounded-lg border bg-white hover:border-brand/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-muted-foreground font-bold text-sm">{order.customerName[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{order.customerName}</p>
                <p className="text-xs text-muted-foreground font-mono">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{order.serviceName} · {order.weightKg} kg</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{formatUSD(parseFloat(order.totalPrice))}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}