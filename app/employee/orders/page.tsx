// app/employee/orders/page.tsx
import { getOrders } from "@/lib/actions/orders";
import { Badge }     from "@/components/ui/badge";
import { formatUSD } from "@/lib/utils/order-form";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/order-form";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";

export default async function OrdersPage() {
  const orders = await getOrders(50);

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="text-lg font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders found</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Package size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No orders yet.</p>
          <Link
            href="/employee/orders/new"
            className="text-sm text-brand font-semibold hover:underline"
          >
            Create the first order →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/employee/orders/${order.id}`}
              className="flex items-center gap-3 p-4 rounded-lg border bg-white hover:border-brand/30 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center shrink-0">
                <span className="text-brand font-bold text-sm">{order.customerName[0]}</span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm truncate">{order.customerName}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 ${ORDER_STATUS_COLORS[order.status]}`} variant="outline">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{order.serviceName} · {order.weightKg} kg</p>
              </div>

              {/* Price + chevron */}
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