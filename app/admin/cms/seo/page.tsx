// app/admin/cms/seo/page.tsx
import { getSeoSettings }  from "@/lib/db/queries/cms.queries";
import { CmsSectionShell } from "@/components/admin/cms/CmsSectionShell";
import { CmsSeoForm }      from "@/components/admin/cms/forms/CmsSeoForm";

export default async function CmsSeoPage() {
  const data = await getSeoSettings();
  return (
    <CmsSectionShell
      title="SEO & Metadata"
      description="Page titles, meta descriptions, Open Graph, Twitter cards and custom head scripts."
      color="#0ea5e9"
    >
      <CmsSeoForm data={data} />
    </CmsSectionShell>
  );
}