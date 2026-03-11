// app/admin/services/page.tsx
import { getAdminServices } from "@/lib/actions/admin-services";
import { ServicesClient }   from "@/components/admin/ServicesClient";

export default async function AdminServicesPage() {
  const services = await getAdminServices();
  return <ServicesClient services={services} />;
}