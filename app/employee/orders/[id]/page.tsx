// app/employee/orders/[id]/page.tsx
import { notFound }      from "next/navigation";
import { getOrderById }  from "@/lib/actions/orders";
import { formatUSD, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import { OrderStatusUpdater } from "@/components/employee/OrderStatusUpdater";
import {
  ArrowLeft, User, Phone, Layers, Weight,
  Calendar, Clock, FileText, Droplets, Wind,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  pending:    { bg: "#f8fafc", border: "#94a3b8", color: "#334155" },
  processing: { bg: "#edf7fd", border: "#1a7fba", color: "#0f5a85" },
  done:       { bg: "#f0fdf4", border: "#16a34a", color: "#14532d" },
  picked_up:  { bg: "#fffbeb", border: "#d97706", color: "#78350f" },
};

// ── Icon themes matching ReviewStep ───────────────────────────────────────────
type IconTheme = "brand" | "green" | "amber" | "violet" | "rose" | "slate";
const ICON_THEMES: Record<IconTheme, { bg: string; border: string; color: string }> = {
  brand:  { bg: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)", border: "#b6def5", color: "#1a7fba"  },
  green:  { bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#86efac", color: "#16a34a"  },
  amber:  { bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "#fcd34d", color: "#d97706"  },
  violet: { bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "#c4b5fd", color: "#7c3aed"  },
  rose:   { bg: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", border: "#fda4af", color: "#e11d48"  },
  slate:  { bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "#e2e8f0", color: "#64748b"  },
};

function DetailRow({
  icon: Icon,
  label,
  value,
  theme = "brand",
}: {
  icon:    React.ElementType;
  label:   string;
  value:   string;
  theme?:  IconTheme;
}) {
  const t = ICON_THEMES[theme];
  return (
    <div
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: "1px solid #f1f5f9" }}
    >
      <div
        className="shrink-0 flex items-center justify-center mt-0.5"
        style={{
          width: 30,
          height: 30,
          borderRadius: "6px",
          background: t.bg,
          border: `1.5px solid ${t.border}`,
          flexShrink: 0,
        }}
      >
        <Icon size={13} style={{ color: t.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>
          {label}
        </p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: "#1e293b" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────────
function SectionCard({
  title,
  children,
}: {
  title:    string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "9px 16px",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1.5px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 4,
            height: 16,
            borderRadius: "2px",
            background: "linear-gradient(180deg, #1a7fba 0%, #2496d6 100%)",
            flexShrink: 0,
          }}
        />
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
          {title}
        </p>
      </div>
      {children}
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

  const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">

      {/* Back link */}
      <Link
        href="/employee/orders"
        className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors text-slate-400 hover:text-[#1a7fba]"
      >
        <ArrowLeft size={13} />
        Back to Orders
      </Link>

      {/* Header card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          background: "white",
          borderRadius: "8px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Avatar */}
        <div
          className="shrink-0 flex items-center justify-center font-black text-white text-xl"
          style={{
            width: 46,
            height: 46,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)",
            boxShadow: "0 4px 12px rgba(26,127,186,0.30)",
          }}
        >
          {order.customerName[0].toUpperCase()}
        </div>

        {/* Name + order number */}
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-lg leading-tight tracking-tight" style={{ color: "#1e293b" }}>
            {order.customerName}
          </h1>
          <p className="font-mono text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            {order.orderNumber}
          </p>
        </div>

        {/* Status badge */}
        <span
          className="shrink-0 text-[10px] font-black uppercase tracking-wide"
          style={{
            padding: "4px 10px",
            borderRadius: "4px",
            background: statusStyle.bg,
            border: `1.5px solid ${statusStyle.border}`,
            color: statusStyle.color,
          }}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Order details */}
      <SectionCard title="Order Details">
        <div style={{ padding: "0 16px" }}>
          <DetailRow icon={User}     label="Customer" value={order.customerName}                            theme="brand"  />
          <DetailRow icon={Phone}    label="Phone"    value={order.customerPhone}                           theme="green"  />
          <DetailRow icon={Layers}   label="Service"  value={order.serviceName}                            theme="brand"  />
          <DetailRow icon={Weight}   label="Weight"   value={`${order.weightKg} kg`}                      theme="amber"  />
          <DetailRow icon={Calendar} label="Date"     value={new Date(order.createdAt).toLocaleString()}   theme="violet" />
          {order.estimatedDoneAt && (
            <DetailRow
              icon={Clock}
              label="Est. Done"
              value={new Date(order.estimatedDoneAt).toLocaleString()}
              theme="rose"
            />
          )}
          {order.notes && (
            <DetailRow icon={FileText} label="Notes" value={order.notes} theme="slate" />
          )}
        </div>
      </SectionCard>

      {/* Price breakdown */}
      <SectionCard title="Price Breakdown">
        <div style={{ padding: "0 16px" }}>
          {/* Base */}
          <div
            className="flex justify-between items-center py-3"
            style={{ borderBottom: "1px solid #f1f5f9" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 26, height: 26, borderRadius: "5px",
                  background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
                  border: "1.5px solid #b6def5",
                }}
              >
                <Layers size={11} style={{ color: "#1a7fba" }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Base
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#1e293b" }}>
              {formatUSD(baseTotal)}
            </span>
          </div>

          {/* Detergent */}
          {soapCost > 0 && (
            <div
              className="flex justify-between items-center py-3"
              style={{ borderBottom: pewangiCost > 0 ? "1px solid #f1f5f9" : "none" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 26, height: 26, borderRadius: "5px",
                    background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
                    border: "1.5px solid #b6def5",
                  }}
                >
                  <Droplets size={11} style={{ color: "#1a7fba" }} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#64748b" }}>
                  Detergent
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: "#1e293b" }}>
                + {formatUSD(soapCost)}
              </span>
            </div>
          )}

          {/* Fragrance */}
          {pewangiCost > 0 && (
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 26, height: 26, borderRadius: "5px",
                    background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                    border: "1.5px solid #c4b5fd",
                  }}
                >
                  <Wind size={11} style={{ color: "#7c3aed" }} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#64748b" }}>
                  Fragrance
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: "#1e293b" }}>
                + {formatUSD(pewangiCost)}
              </span>
            </div>
          )}
        </div>

        {/* Total footer */}
        <div style={{ padding: "12px 16px 16px" }}>
          <div
            style={{
              borderRadius: "7px",
              background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)",
              boxShadow: "0 4px 16px rgba(26,127,186,0.30)",
              padding: "13px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Total
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                incl. all add-ons
              </p>
            </div>
            <span className="font-black text-2xl tracking-tight" style={{ color: "white" }}>
              {formatUSD(totalPrice)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Status updater */}
      <OrderStatusUpdater
        orderId={order.id}
        currentStatus={order.status}
        orderNumber={order.orderNumber}
        customerName={order.customerName}
        customerPhone={order.customerPhone}
        totalPrice={order.totalPrice}
        serviceName={order.serviceName}
        paymentStatus={order.paymentStatus}
      />
    </div>
  );
}