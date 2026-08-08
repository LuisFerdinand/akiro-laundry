// app/employee/orders/page.tsx
import { getOrders } from "@/lib/actions/orders";
import { getWaTemplateData } from "@/lib/actions/wa-templates";
import { EmployeeOrdersClient } from "@/components/employee/EmployeeOrdersClient";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const filters = { search: sp.search, status: sp.status };

  const [orders, templateData] = await Promise.all([
    getOrders(filters),
    getWaTemplateData(),
  ]);

  return (
    <EmployeeOrdersClient
      orders={orders}
      initialFilters={filters}
      templateData={templateData}
    />
  );
}
