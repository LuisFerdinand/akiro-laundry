// app/admin/cms/page.tsx
import { getLandingPageData }          from "@/lib/db/queries/cms.queries";
import { CmsOverviewGrid, CMS_SECTION_COUNT } from "@/components/admin/cms/CmsOverviewGrid";
import { Layers } from "lucide-react";

export default async function CmsOverviewPage() {
  const data = await getLandingPageData();

  // Only plain booleans — safe to pass to a Client Component
  const seededMap: Record<string, boolean> = {
    "/admin/cms/navbar":       !!data.navbar,
    "/admin/cms/hero":         !!data.hero,
    "/admin/cms/services":     !!data.services,
    "/admin/cms/how-it-works": !!data.howItWorks,
    "/admin/cms/gallery":      !!data.gallery,
    "/admin/cms/testimonials": !!data.testimonials,
    "/admin/cms/cta":          !!data.cta,
    "/admin/cms/footer":       !!data.footer,
  };

  const seededCount = Object.values(seededMap).filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Page header — pure server, no event handlers */}
      <div
        style={{
          background: "white", borderRadius: "20px",
          border: "1.5px solid hsl(210 25% 91%)",
          boxShadow: "0 2px 10px rgba(26,127,186,0.05)",
          padding: "24px 28px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "16px", flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px", height: "42px", borderRadius: "14px",
              background: "rgba(26,127,186,0.10)", border: "1.5px solid rgba(26,127,186,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Layers size={20} style={{ color: "#1a7fba" }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: "20px", fontWeight: 800, color: "#0a1f2e", margin: 0, lineHeight: 1.2 }}>
              Content Management
            </h1>
            <p style={{ fontSize: "13px", color: "#607080", fontWeight: 500, margin: "4px 0 0" }}>
              Edit every section of your public landing page from one place.
            </p>
          </div>
        </div>

        {/* Progress pill */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: "hsl(210 30% 97%)", border: "1.5px solid hsl(210 25% 91%)",
            borderRadius: "999px", padding: "8px 16px",
          }}
        >
          <div style={{ width: 80, height: 6, background: "hsl(210 25% 91%)", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${(seededCount / CMS_SECTION_COUNT) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #1a7fba, #3ecb9a)",
                borderRadius: "999px",
              }}
            />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a7fba", whiteSpace: "nowrap" }}>
            {seededCount} / {CMS_SECTION_COUNT} seeded
          </span>
        </div>
      </div>

      {/* Grid — rendered by Client Component; only receives plain data */}
      <CmsOverviewGrid seededMap={seededMap} />
    </div>
  );
}