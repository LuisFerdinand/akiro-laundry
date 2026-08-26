// app/admin/orders/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { getAdminOrderById } from "@/lib/actions/admin-orders";
import { EditOrderForm } from "@/components/shared/EditOrderForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditOrderPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);

  const order = await getAdminOrderById(id);
  if (!order) notFound();

  const backHref = `/admin/orders/${id}`;

  if (order.paymentStatus === "paid") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Link href={backHref} style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "12px", fontWeight: 700, color: "#64748b", textDecoration: "none",
        }}>
          <ArrowLeft size={13} /> Fila ba Pedidu
        </Link>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "12px", textAlign: "center", padding: "64px 20px",
          background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "10px",
            background: "#f8fafc", border: "1.5px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={18} style={{ color: "#94a3b8" }} />
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 800, color: "#334155" }}>This order is paid and locked</p>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", maxWidth: "320px" }}>
              Editing is disabled once a payment has been recorded, so the receipt always matches what was collected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EditOrderForm
      order={{
        id:              order.id,
        orderNumber:     order.orderNumber,
        customerName:    order.customerName,
        customerPhone:   order.customerPhone,
        customerAddress: order.customerAddress,
        notes:           order.notes,
        items:           order.items,
      }}
      backHref={backHref}
    />
  );
}
