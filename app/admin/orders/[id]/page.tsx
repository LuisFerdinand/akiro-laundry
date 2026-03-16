// app/admin/orders/[id]/page.tsx
import { getAdminOrderById }              from "@/lib/actions/admin-orders";
import { notFound }                        from "next/navigation";
import { formatUSD, ORDER_STATUS_LABELS }  from "@/lib/utils/order-form";
import Link                                from "next/link";
import {
  ArrowLeft, User, Phone, FileText, CreditCard, Calendar,
  Hash, BadgeCheck, AlertTriangle, Clock, Waves,
  PackageCheck, ShoppingBag, Tag, Weight, Hash as PcsIcon,
  Droplets, Wind,
} from "lucide-react";
import type { AdminOrderItem } from "@/lib/actions/admin-orders";
import { WhatsAppNotify } from "@/components/employee/WhatsAppNotify";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  color: string; bg: string; border: string; Icon: React.ElementType;
}> = {
  pending:    { color: "#d97706", bg: "#fffbeb", border: "#fcd34d", Icon: Clock        },
  processing: { color: "#1a7fba", bg: "#edf7fd", border: "#b6def5", Icon: Waves        },
  done:       { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", Icon: PackageCheck },
  picked_up:  { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: ShoppingBag  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon, label, value, mono = false,
}: {
  icon: React.ElementType; label: string; value: string; mono?: boolean;
}) {
  if (!value || value === "—" || value === "None" || value === "null") return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "12px 0", borderBottom: "1px solid #f1f5f9",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "8px", flexShrink: 0,
        background: "linear-gradient(135deg,#edf7fd,#c8e9f8)",
        border: "1.5px solid #b6def5",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={13} style={{ color: "#1a7fba" }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: "10px", fontWeight: 800, color: "#94a3b8",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          {label}
        </p>
        <p style={{
          fontSize: "14px", fontWeight: 600, color: "#1e293b", marginTop: "1px",
          fontFamily: mono ? "monospace" : undefined,
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white", borderRadius: "12px",
      border: "1.5px solid #e2e8f0",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 20px",
        background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
        borderBottom: "1.5px solid #e2e8f0",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <div style={{
          width: 4, height: 16, borderRadius: "2px",
          background: "linear-gradient(180deg,#1a7fba,#2496d6)", flexShrink: 0,
        }} />
        <p style={{
          fontSize: "10px", fontWeight: 800, color: "#64748b",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          {title}
        </p>
      </div>
      <div style={{ padding: "0 20px" }}>{children}</div>
    </div>
  );
}

/** Per-item price breakdown card */
function OrderItemCard({
  item,
  index,
}: {
  item: AdminOrderItem;
  index: number;
}) {
  const isPerPcs    = item.quantity != null;
  const baseCost    = parseFloat(item.basePricePerKg) *
    (isPerPcs ? (item.quantity ?? 0) : parseFloat(item.weightKg ?? "0"));
  const soapCost    = parseFloat(item.soapCost    ?? "0");
  const pewangiCost = parseFloat(item.pewangiCost ?? "0");
  const subtotal    = parseFloat(item.subtotal);

  return (
    <div style={{
      borderRadius: "10px", border: "1.5px solid #e2e8f0",
      background: "white", overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* Item header */}
      <div style={{
        padding: "10px 14px",
        background: "linear-gradient(135deg,#edf7fd,#dff0fb)",
        borderBottom: "1px solid #b6def5",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "7px", flexShrink: 0,
          background: "linear-gradient(135deg,#1a7fba,#2496d6)",
          boxShadow: "0 2px 8px rgba(26,127,186,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Tag size={12} style={{ color: "white" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f5a85" }}>
            {item.serviceName}
          </p>
          <p style={{ fontSize: "10px", color: "#1a7fba", fontWeight: 600, marginTop: "1px" }}>
            Item {index + 1}
          </p>
        </div>
        <span style={{
          fontSize: "13px", fontWeight: 900,
          fontFamily: "Sora, sans-serif", color: "#0f5a85",
        }}>
          {formatUSD(subtotal)}
        </span>
      </div>

      {/* Item rows */}
      <div style={{ padding: "4px 14px" }}>
        {isPerPcs ? (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid #f1f5f9",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <PcsIcon size={12} style={{ color: "#1a7fba" }} />
              <span style={{ fontSize: "12px", color: "#64748b" }}>Kuantidade</span>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
              {item.quantity} pcs
            </span>
          </div>
        ) : (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid #f1f5f9",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Weight size={12} style={{ color: "#1a7fba" }} />
              <span style={{ fontSize: "12px", color: "#64748b" }}>Todan</span>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
              {item.weightKg} kg
            </span>
          </div>
        )}

        {/* Base cost */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 0", borderBottom: "1px solid #f1f5f9",
        }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Baze ({formatUSD(parseFloat(item.basePricePerKg))}{isPerPcs ? "/pc" : "/kg"})
          </span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
            {formatUSD(baseCost)}
          </span>
        </div>

        {/* Detergent */}
        {item.soapName && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid #f1f5f9",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Droplets size={12} style={{ color: "#1a7fba" }} />
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Deterjentu · {item.soapName}
              </span>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
              +{formatUSD(soapCost)}
            </span>
          </div>
        )}

        {/* Fragrance */}
        {item.pewangiName && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid #f1f5f9",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Wind size={12} style={{ color: "#7c3aed" }} />
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Aroma · {item.pewangiName}
              </span>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
              +{formatUSD(pewangiCost)}
            </span>
          </div>
        )}

        {/* Item subtotal row */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 0",
        }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
            Subtotal item
          </span>
          <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f5a85" }}>
            {formatUSD(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrderById(parseInt(id));
  if (!order) notFound();

  const sc     = STATUS_CONFIG[order.status];
  const isPaid = order.paymentStatus === "paid";
  const total  = parseFloat(order.totalPrice);

  const servicesSummary =
    order.items.length === 1
      ? order.items[0].serviceName
      : `${order.items.length} servisu`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Back + Header ─────────────────────────────────── */}
      <div>
        <Link href="/admin/orders" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "12px", fontWeight: 700, color: "#64748b",
          textDecoration: "none", marginBottom: "16px",
        }}>
          <ArrowLeft size={13} /> Fila ba Pedidu
        </Link>

        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", flexWrap: "wrap", gap: "12px",
        }}>
          <div>
            <h1 style={{
              fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px",
              color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px",
            }}>
              {order.orderNumber}
            </h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              Kria iha{" "}
              {new Date(order.createdAt).toLocaleString("pt-TL", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* ── Action badges + WA button ── */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 14px", borderRadius: "999px",
              background: isPaid ? "#f0fdf4" : "#fffbeb",
              border: `1.5px solid ${isPaid ? "#86efac" : "#fcd34d"}`,
              fontSize: "12px", fontWeight: 700,
              color: isPaid ? "#16a34a" : "#d97706",
            }}>
              {isPaid ? <BadgeCheck size={13} /> : <AlertTriangle size={13} />}
              {isPaid ? "Selu ona" : "Seidauk selu"}
            </span>

            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 14px", borderRadius: "999px",
              background: sc.bg, border: `1.5px solid ${sc.border}`,
              fontSize: "12px", fontWeight: 700, color: sc.color,
            }}>
              <sc.Icon size={13} />
              {ORDER_STATUS_LABELS[order.status]}
            </span>

            {/* WhatsApp notify button — sends Tetum message via shared component */}
            <WhatsAppNotify
              customerPhone={order.customerPhone}
              customerName={order.customerName}
              orderNumber={order.orderNumber}
              servicesSummary={servicesSummary}
              status={order.status}
              paymentStatus={order.paymentStatus as "paid" | "unpaid"}
              totalPrice={total}
              notes={order.notes}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 360px",
        gap: "20px", alignItems: "start",
      }}>

        {/* ── Left column ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <SectionCard title="Kliente">
            <DetailRow icon={User}  label="Naran"  value={order.customerName}  />
            <DetailRow icon={Phone} label="Telefone" value={order.customerPhone} />
          </SectionCard>

          {/* Service items — one card per item */}
          <SectionCard title={`Item Servisu · ${order.items.length}`}>
            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
              {order.items.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
                  La iha item
                </p>
              ) : (
                order.items.map((item, i) => (
                  <OrderItemCard key={item.id} item={item} index={i} />
                ))
              )}
            </div>
          </SectionCard>

          {/* Order meta */}
          <SectionCard title="Info Pedidu">
            <DetailRow icon={Hash}     label="Nú. Pedidu"   value={order.orderNumber} mono />
            {order.notes && (
              <DetailRow icon={FileText} label="Nota" value={order.notes} />
            )}
            {order.estimatedDoneAt && (
              <DetailRow
                icon={Calendar}
                label="Est. Remata"
                value={new Date(order.estimatedDoneAt).toLocaleDateString("pt-TL", {
                  dateStyle: "medium",
                })}
              />
            )}
          </SectionCard>

          {/* Payment details (only when paid) */}
          {isPaid && (
            <SectionCard title="Detallu Pagamentu">
              <DetailRow
                icon={CreditCard}
                label="Métodu"
                value={(order.paymentMethod ?? "").toUpperCase()}
              />
              <DetailRow
                icon={CreditCard}
                label="Montante Selu"
                value={formatUSD(parseFloat(order.amountPaid ?? "0"))}
              />
              <DetailRow
                icon={CreditCard}
                label="Troku"
                value={formatUSD(parseFloat(order.changeGiven ?? "0"))}
              />
              <DetailRow
                icon={Calendar}
                label="Selu iha"
                value={
                  order.paidAt
                    ? new Date(order.paidAt).toLocaleString("pt-TL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"
                }
              />
            </SectionCard>
          )}
        </div>

        {/* ── Right column ────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Grand total card */}
          <div style={{
            background: "white", borderRadius: "12px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 20px",
              background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
              borderBottom: "1.5px solid #e2e8f0",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <div style={{
                width: 4, height: 16, borderRadius: "2px",
                background: "linear-gradient(180deg,#1a7fba,#2496d6)",
              }} />
              <p style={{
                fontSize: "10px", fontWeight: 800, color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                Sumáriu Pedidu
              </p>
            </div>

            <div style={{ padding: "0 20px" }}>
              {order.items.map((item) => (
                <div key={item.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 0", borderBottom: "1px solid #f1f5f9",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "5px", flexShrink: 0,
                      background: "linear-gradient(135deg,#edf7fd,#c8e9f8)",
                      border: "1px solid #b6def5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Tag size={9} style={{ color: "#1a7fba" }} />
                    </div>
                    <div>
                      <p style={{
                        fontSize: "12px", fontWeight: 600, color: "#475569",
                        maxWidth: "180px", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.serviceName}
                      </p>
                      <p style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {item.quantity != null
                          ? `${item.quantity} pcs`
                          : `${item.weightKg} kg`}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                    {formatUSD(parseFloat(item.subtotal))}
                  </span>
                </div>
              ))}
            </div>

            {/* Grand total */}
            <div style={{ padding: "16px 20px" }}>
              <div style={{
                borderRadius: "10px",
                background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
                boxShadow: "0 4px 16px rgba(26,127,186,0.3)",
                padding: "16px 20px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <p style={{
                    fontSize: "10px", fontWeight: 800,
                    color: "rgba(255,255,255,0.65)",
                    textTransform: "uppercase", letterSpacing: "0.1em",
                  }}>
                    Total Tomak
                  </p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "1px" }}>
                    {order.items.length} servisu{order.items.length !== 1 ? "" : ""}
                  </p>
                </div>
                <span style={{
                  fontFamily: "Sora,sans-serif", fontWeight: 900,
                  fontSize: "26px", color: "white",
                }}>
                  {formatUSD(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div style={{
            background: "white", borderRadius: "12px",
            border: "1.5px solid #e2e8f0", padding: "16px 20px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          }}>
            <p style={{
              fontSize: "10px", fontWeight: 800, color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px",
            }}>
              Tempu
            </p>
            {[
              { label: "Kria iha",       date: order.createdAt },
              { label: "Atualiza foun", date: order.updatedAt },
            ].map(({ label, date }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "1px solid #f8fafc",
              }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                  {new Date(date).toLocaleString("pt-TL", {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}