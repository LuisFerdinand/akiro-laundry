import { getCtaSection, getContactItems } from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }                from "@/components/admin/cms/CmsSectionShell";
import { CmsCtaForm }                     from "@/components/admin/cms/forms/CmsCtaForm";
 
export default async function CmsCtaPage() {
  const [cta, contactItems] = await Promise.all([getCtaSection(), getContactItems()]);
  return (
    <CmsSectionShell
      title="CTA & Contact"
      description="Call-to-action banner headline, buttons and contact info items."
      color="#ec4899"
    >
      <CmsCtaForm cta={cta} contactItems={contactItems} />
    </CmsSectionShell>
  );
}