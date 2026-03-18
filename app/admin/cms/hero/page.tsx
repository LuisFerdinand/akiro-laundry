import { getHero }             from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }     from "@/components/admin/cms/CmsSectionShell";
import { CmsHeroForm }         from "@/components/admin/cms/forms/CmsHeroForm";
 
export default async function CmsHeroPage() {
  const data = await getHero();
  return (
    <CmsSectionShell
      title="Hero"
      description="Main headline, subtext, CTA buttons and the hero image."
      color="#8b5cf6"
    >
      <CmsHeroForm data={data} />
    </CmsSectionShell>
  );
}