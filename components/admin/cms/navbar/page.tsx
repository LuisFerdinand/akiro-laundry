import { getNavbar }           from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }     from "@/components/admin/cms/CmsSectionShell";
import { CmsNavbarForm }       from "@/components/admin/cms/forms/CmsNavbarForm";
 
export default async function CmsNavbarPage() {
  const data = await getNavbar();
  return (
    <CmsSectionShell
      title="Navbar"
      description="Brand name, logo, navigation links and the top CTA button."
      color="#1a7fba"
    >
      <CmsNavbarForm data={data} />
    </CmsSectionShell>
  );
}