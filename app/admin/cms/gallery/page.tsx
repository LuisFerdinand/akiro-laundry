import { getGallerySection }   from "@/lib/db/queries/cms.queries";
import { CmsSectionShell }     from "@/components/admin/cms/CmsSectionShell";
import { CmsGalleryForm }      from "@/components/admin/cms/forms/CmsGalleryForm";
 
export default async function CmsGalleryPage() {
  const data = await getGallerySection();
  return (
    <CmsSectionShell
      title="Gallery"
      description="Facility photo gallery — images, captions and masonry layout hints."
      color="#0d9488"
    >
      <CmsGalleryForm data={data} />
    </CmsSectionShell>
  );
}