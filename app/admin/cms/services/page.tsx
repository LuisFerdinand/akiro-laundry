import { getServicesSection }  from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }     from "@/components/admin/cms/CmsSectionShell";
import { CmsServicesForm }     from "@/components/admin/cms/forms/CmsServicesForm";
 
export default async function CmsServicesPage() {
  const data = await getServicesSection();
  return (
    <CmsSectionShell
      title="Services"
      description="Service cards — titles, descriptions, prices, images and accent colours."
      color="#d97706"
    >
      <CmsServicesForm data={data} />
    </CmsSectionShell>
  );
}