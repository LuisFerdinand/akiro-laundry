import { getFooter }           from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }     from "@/components/admin/cms/CmsSectionShell";
import { CmsFooterForm }       from "@/components/admin/cms/forms/CmsFooterForm";
 
export default async function CmsFooterPage() {
  const data = await getFooter();
  return (
    <CmsSectionShell
      title="Footer"
      description="Brand details, quick links, social icons and map coordinates."
      color="#6366f1"
    >
      <CmsFooterForm data={data} />
    </CmsSectionShell>
  );
}