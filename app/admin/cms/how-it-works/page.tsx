import { getHowItWorksSection } from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }      from "@/components/admin/cms/CmsSectionShell";
import { CmsHowItWorksForm }    from "@/components/admin/cms/forms/CmsHowItWorksForm";
 
export default async function CmsHowItWorksPage() {
  const data = await getHowItWorksSection();
  return (
    <CmsSectionShell
      title="How It Works"
      description="Step-by-step process cards with images, descriptions and accent colours."
      color="#10b981"
    >
      <CmsHowItWorksForm data={data} />
    </CmsSectionShell>
  );
}