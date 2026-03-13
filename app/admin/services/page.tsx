// app/admin/services/page.tsx
import { getAdminServices } from "@/lib/actions/admin-services";
import { ServicesClient }   from "@/components/admin/ServicesClient";

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  // ✅ Next.js 15 — searchParams is a Promise, must be awaited
  const sp = await searchParams;

  const services = await getAdminServices(sp.search);
  return <ServicesClient services={services} initialSearch={sp.search ?? ""} />;
}