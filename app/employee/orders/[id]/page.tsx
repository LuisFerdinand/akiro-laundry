// app/employee/orders/[id]/page.tsx
import { notFound }      from "next/navigation";
import { getOrderById }  from "@/lib/actions/orders";
import { formatUSD, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/order-form";
import { Badge }         from "@/components/ui/badge";
import { OrderStatusUpdater } from "@/components/employee/OrderStatusUpdater";
import { ArrowLeft, User, Phone, Layers, Weight, Calendar, Clock, FileText, Droplets, Wind } from "lucide-react";
import Link              from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-7 h-7 rounded-xl bg-brand-soft border border-brand-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

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
    <div className="space-y-4">

      {/* ── Back + Header ─────────────────────────────────────── */}
      <div>
        <Link
          href="/employee/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-brand transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Back to Orders
        </Link>

        <div className="akiro-detail-header">
          <div className="akiro-detail-avatar">
            <span>{order.customerName[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-lg text-foreground leading-tight" style={{ fontFamily: "Sora, sans-serif" }}>
              {order.customerName}
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">{order.orderNumber}</p>
          </div>
          <Badge className={`${ORDER_STATUS_COLORS[order.status]} border font-bold text-[10px] shrink-0`}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
      </div>

      {/* ── Details card ─────────────────────────────────────── */}
      <div className="akiro-section-card">
        <div className="akiro-section-header">
          <p>Order Details</p>
        </div>
        <div className="px-4 divide-y divide-border/40">
          <DetailRow icon={User}     label="Customer" value={order.customerName} />
          <DetailRow icon={Phone}    label="Phone"    value={order.customerPhone} />
          <DetailRow icon={Layers}   label="Service"  value={order.serviceName} />
          <DetailRow icon={Weight}   label="Weight"   value={`${order.weightKg} kg`} />
          <DetailRow icon={Calendar} label="Date"     value={new Date(order.createdAt).toLocaleString()} />
          {order.estimatedDoneAt && (
            <DetailRow icon={Clock} label="Est. Done" value={new Date(order.estimatedDoneAt).toLocaleString()} />
          )}
          {order.notes && (
            <DetailRow icon={FileText} label="Notes" value={order.notes} />
          )}
        </div>
      </div>

      {/* ── Price breakdown ──────────────────────────────────── */}
      <div className="akiro-section-card overflow-hidden">
        <div className="akiro-section-header">
          <p>Price Breakdown</p>
        </div>
        <div className="px-4 divide-y divide-border/40">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Layers size={13} className="text-blue-400" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Base</span>
            </div>
            <span className="text-sm font-bold">{formatUSD(baseTotal)}</span>
          </div>
          {soapCost > 0 && (
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Droplets size={13} className="text-blue-400" />
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Detergent</span>
              </div>
              <span className="text-sm font-bold">+ {formatUSD(soapCost)}</span>
            </div>
          )}
          {pewangiCost > 0 && (
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <Wind size={13} className="text-purple-400" />
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Fragrance</span>
              </div>
              <span className="text-sm font-bold">+ {formatUSD(pewangiCost)}</span>
            </div>
          )}
        </div>
        {/* Total footer */}
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)" }}>
          <div className="flex justify-between items-center px-5 py-4">
            <span className="text-white/75 text-sm font-bold">Total</span>
            <span className="text-white font-extrabold text-xl" style={{ fontFamily: "Sora, sans-serif" }}>
              {formatUSD(totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Status updater ────────────────────────────────────── */}
      <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
    </div>
  );
}