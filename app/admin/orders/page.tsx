// app/admin/orders/page.tsx
import { getAdminOrders } from "@/lib/actions/admin-orders";
import { OrdersClient }   from "@/components/admin/OrdersClient";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; payment?: string; page?: string };
}) {
  const filters = {
    search:  searchParams.search,
    status:  searchParams.status,
    payment: searchParams.payment,
    page:    searchParams.page ? parseInt(searchParams.page) : 1,
    limit:   25,
  };

  const data = await getAdminOrders(filters);

  return <OrdersClient initialData={data} initialFilters={filters} />;
}