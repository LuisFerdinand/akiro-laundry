// app/employee/orders/[id]/page.tsx
import { notFound }      from "next/navigation";
import { getOrderById }  from "@/lib/actions/orders";
import { formatUSD, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/order-form";
import { Badge }         from "@/components/ui/badge";
import { OrderStatusUpdater } from "@/components/employee/OrderStatusUpdater";
import { ArrowLeft }     from "lucide-react";
import Link              from "next/link";

// Next.js 15: params is a Promise
interface PageProps {
  params: Promise<{ id: string }>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

// Safe parse: soapCost / pewangiCost are nullable in the schema (.default("0") without .notNull())
function safeFloat(value: string | null | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id    = parseInt(rawId);
  const order = await getOrderById(id);

  if (!order) notFound();

  const soapCost    = safeFloat(order.soapCost);
  const pewangiCost = safeFloat(order.pewangiCost);
  const totalPrice  = safeFloat(order.totalPrice);
  const baseTotal   = safeFloat(order.basePricePerKg) * safeFloat(order.weightKg);

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Back + header */}
      <div>
        <Link
          href="/employee/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft size={14} /> Back to Orders
        </Link>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-bold text-lg">{order.customerName}</h1>
            <p className="font-mono text-xs text-muted-foreground">{order.orderNumber}</p>
          </div>
          <Badge className={`${ORDER_STATUS_COLORS[order.status]} border`}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-lg border bg-white">
        <div className="px-4 py-2 bg-muted/50 rounded-t-lg">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
        </div>
        <div className="px-4 divide-y divide-border/60">
          <Row label="Customer" value={order.customerName} />
          <Row label="Phone"    value={order.customerPhone} />
          <Row label="Service"  value={order.serviceName} />
          <Row label="Weight"   value={`${order.weightKg} kg`} />
          <Row label="Date"     value={new Date(order.createdAt).toLocaleString()} />
          {order.estimatedDoneAt && (
            <Row label="Est. Done" value={new Date(order.estimatedDoneAt).toLocaleString()} />
          )}
          {order.notes && <Row label="Notes" value={order.notes} />}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-2 bg-muted/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</p>
        </div>
        <div className="px-4 divide-y divide-border/60">
          <Row label="Base"     value={formatUSD(baseTotal)} />
          {soapCost > 0    && <Row label="Detergent" value={`+ ${formatUSD(soapCost)}`} />}
          {pewangiCost > 0 && <Row label="Fragrance" value={`+ ${formatUSD(pewangiCost)}`} />}
        </div>
        <div className="brand-gradient px-4 py-3 flex justify-between items-center">
          <span className="text-white/80 text-sm">Total</span>
          <span className="text-white font-bold text-lg">{formatUSD(totalPrice)}</span>
        </div>
      </div>

      {/* Status updater (client component) */}
      <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
    </div>
  );
}