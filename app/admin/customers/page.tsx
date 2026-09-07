// app/admin/customers/page.tsx
import { getAdminCustomers, getCustomerInsights } from "@/lib/actions/admin-customers";
import { CustomersClient } from "@/components/admin/CustomersClient";
import type { SortOption, InactiveRange } from "@/lib/actions/admin-customers";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string; sort?: string; inactiveFrom?: string; inactiveTo?: string;
  }>;
}) {
  // ✅ Next.js 15 — searchParams is a Promise, must be awaited
  const sp = await searchParams;
  const sort = (sp.sort ?? "recent") as SortOption;

  const inactive: InactiveRange | undefined =
    ISO_DATE.test(sp.inactiveFrom ?? "") && ISO_DATE.test(sp.inactiveTo ?? "")
      ? { from: sp.inactiveFrom!, to: sp.inactiveTo! }
      : undefined;

  const [customers, insights] = await Promise.all([
    getAdminCustomers(sp.search, sort, inactive),
    getCustomerInsights(),
  ]);

  return (
    <CustomersClient
      customers={customers}
      insights={insights}
      initialSearch={sp.search ?? ""}
      initialSort={sort}
      initialInactive={inactive ?? null}
    />
  );
}