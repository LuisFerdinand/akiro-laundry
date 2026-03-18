// app/admin/cms/layout.tsx
import { CmsTabNav } from "@/components/admin/cms/CmsTabNav";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <CmsTabNav />
      <div>{children}</div>
    </div>
  );
}