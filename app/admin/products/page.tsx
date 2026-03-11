// app/admin/products/page.tsx
import { getAdminSoaps, getAdminPewangi } from "@/lib/actions/admin-products";
import { ProductsClient }                 from "@/components/admin/ProductsClient";

export default async function AdminProductsPage() {
  const [soaps, pewangiList] = await Promise.all([
    getAdminSoaps(),
    getAdminPewangi(),
  ]);
  return <ProductsClient soaps={soaps} pewangiList={pewangiList} />;
}