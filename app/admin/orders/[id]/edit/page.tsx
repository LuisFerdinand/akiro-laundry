// app/admin/orders/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { getAdminOrderById } from "@/lib/actions/admin-orders";
import { EditOrderForm } from "@/components/shared/EditOrderForm";
import { amountReceived } from "@/lib/utils/order-payment";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditOrderPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);

  const order = await getAdminOrderById(id);
  if (!order) notFound();

  // Paid / DP orders stay editable — the edit never touches the cash register;
  // the form shows how the new total compares with what was received.
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
        specialRequests: order.specialRequests,
        payment: order.paymentStatus === "unpaid" ? null : {
          status:   order.paymentStatus,
          received: amountReceived(order),
          method:   order.paymentMethod,
        },
      }}
      backHref={`/admin/orders/${id}`}
    />
  );
}
