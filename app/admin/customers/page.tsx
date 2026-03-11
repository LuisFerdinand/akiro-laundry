// app/admin/customers/page.tsx
import { getAdminCustomers } from "@/lib/actions/admin-customers";
import { CustomersClient }   from "@/components/admin/CustomersClient";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const customers = await getAdminCustomers(searchParams.search);
  return <CustomersClient customers={customers} initialSearch={searchParams.search ?? ""} />;
}