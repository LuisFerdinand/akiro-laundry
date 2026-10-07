// app/admin/services/page.tsx
import { getAdminServices }    from "@/lib/actions/admin-services";
import { getAllClothingItems } from "@/lib/actions/clothing-items";
import { ServicesClient }      from "@/components/admin/ServicesClient";

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  // ✅ Next.js 15 — searchParams is a Promise, must be awaited
  const sp = await searchParams;

  const [services, clothingItems] = await Promise.all([
    getAdminServices(sp.search),
    getAllClothingItems(),
  ]);
  return <ServicesClient services={services} clothingItems={clothingItems} initialSearch={sp.search ?? ""} />;
}