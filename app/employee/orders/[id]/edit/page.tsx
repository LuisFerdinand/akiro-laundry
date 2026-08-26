// app/employee/orders/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { getOrderById } from "@/lib/actions/orders";
import { EditOrderForm } from "@/components/shared/EditOrderForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOrderPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);

  const order = await getOrderById(id);
  if (!order) notFound();

  const backHref = `/employee/orders/${id}`;

  if (order.paymentStatus === "paid") {
    return (
      <div className="space-y-4 pb-8 pt-2">
        <Link href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors text-slate-400 hover:text-[#1a7fba]">
          <ArrowLeft size={13} />
          Back to Order
        </Link>
        <div className="flex flex-col items-center justify-center gap-3 text-center py-16"
          style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0" }}>
          <div className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: "10px", background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
            <Lock size={18} style={{ color: "#94a3b8" }} />
          </div>
          <div>
            <p className="font-black text-sm text-slate-700">This order is paid and locked</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
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
