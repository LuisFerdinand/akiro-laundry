// app/admin/orders/page.tsx
import { getAdminOrders } from "@/lib/actions/admin-orders";
import { OrdersClient }   from "@/components/admin/OrdersClient";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; payment?: string; page?: string }>;
}) {
  // ✅ Next.js 15 — searchParams is a Promise, must be awaited
  const sp = await searchParams;

  const filters = {
    search:  sp.search,
    status:  sp.status,
    payment: sp.payment,
    page:    sp.page ? parseInt(sp.page) : 1,
    limit:   25,
  };

  const data = await getAdminOrders(filters);

  return <OrdersClient initialData={data} initialFilters={filters} />;
}