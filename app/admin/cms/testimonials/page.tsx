import { getTestimonialsSection } from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }        from "@/components/admin/cms/CmsSectionShell";
import { CmsTestimonialsForm }    from "@/components/admin/cms/forms/CmsTestimonialsForm";
 
export default async function CmsTestimonialsPage() {
  const data = await getTestimonialsSection();
  return (
    <CmsSectionShell
      title="Testimonials"
      description="Customer reviews, star ratings, avatar photos and accent colours."
      color="#f59e0b"
    >
      <CmsTestimonialsForm data={data} />
    </CmsSectionShell>
  );
}