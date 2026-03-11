// app/admin/customers/[id]/page.tsx
import { getAdminCustomerById } from "@/lib/actions/admin-customers";
import { CustomerDetailClient } from "@/components/admin/CustomerDetailClient";
import { notFound } from "next/navigation";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getAdminCustomerById(parseInt(id));
  if (!customer) notFound();
  return <CustomerDetailClient customer={customer} />;
}