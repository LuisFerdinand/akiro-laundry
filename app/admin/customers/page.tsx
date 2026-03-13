// app/admin/customers/page.tsx
import { getAdminCustomers, getCustomerInsights } from "@/lib/actions/admin-customers";
import { CustomersClient } from "@/components/admin/CustomersClient";
import type { SortOption } from "@/lib/actions/admin-customers";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; sort?: string }>;
}) {
  // ✅ Next.js 15 — searchParams is a Promise, must be awaited
  const sp = await searchParams;
  const sort = (sp.sort ?? "recent") as SortOption;

  const [customers, insights] = await Promise.all([
    getAdminCustomers(sp.search, sort),
    getCustomerInsights(),
  ]);

  return (
    <CustomersClient
      customers={customers}
      insights={insights}
      initialSearch={sp.search ?? ""}
      initialSort={sort}
    />
  );
}