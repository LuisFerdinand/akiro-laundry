// components/admin/cms/CmsOverviewGrid.tsx
"use client";

import Link from "next/link";
import {
  Navigation,
  LayoutTemplate,
  Wrench,
  FileText,
  ImageIcon,
  Star,
  Megaphone,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// SECTIONS lives here — never passed from a Server Component.
// Icons are plain React components, safe to use in a Client Component.
const SECTIONS = [
  { href: "/admin/cms/navbar",       icon: Navigation,     label: "Navbar",        description: "Brand name, logo, navigation links and CTA button.",            color: "#1a7fba" },
  { href: "/admin/cms/hero",         icon: LayoutTemplate, label: "Hero",          description: "Main headline, subtext, CTA buttons and hero image.",            color: "#8b5cf6" },
  { href: "/admin/cms/services",     icon: Wrench,         label: "Services",      description: "Service cards with titles, descriptions, prices and images.",    color: "#d97706" },
  { href: "/admin/cms/how-it-works", icon: FileText,       label: "How It Works",  description: "Step-by-step process cards with images and accent colours.",     color: "#10b981" },
  { href: "/admin/cms/gallery",      icon: ImageIcon,      label: "Gallery",       description: "Facility photo gallery with captions and layout hints.",         color: "#0d9488" },
  { href: "/admin/cms/testimonials", icon: Star,           label: "Testimonials",  description: "Customer reviews, ratings and avatar photos.",                   color: "#f59e0b" },
  { href: "/admin/cms/cta",          icon: Megaphone,      label: "CTA & Contact", description: "Call-to-action banner, contact info items and links.",           color: "#ec4899" },
  { href: "/admin/cms/footer",       icon: FileText,       label: "Footer",        description: "Brand details, quick links, social icons and map coordinates.", color: "#6366f1" },
] as const;

interface Props {
  // Only plain serialisable data comes from the server — a simple boolean map
  seededMap: Record<string, boolean>;
}

export function CmsOverviewGrid({ seededMap }: Props) {
  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap:                 "14px",
      }}
    >
      {SECTIONS.map((s) => {
        const Icon   = s.icon;
        const seeded = seededMap[s.href] ?? false;

        return (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display:        "flex",
              flexDirection:  "column",
              gap:            "14px",
              padding:        "20px",
              background:     "white",
              borderRadius:   "18px",
              border:         "1.5px solid hsl(210 25% 91%)",
              boxShadow:      "0 2px 10px rgba(26,127,186,0.05)",
              textDecoration: "none",
              transition:     "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
              cursor:         "pointer",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = `${s.color}40`;
              el.style.boxShadow   = `0 6px 20px ${s.color}14`;
              el.style.transform   = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "hsl(210 25% 91%)";
              el.style.boxShadow   = "0 2px 10px rgba(26,127,186,0.05)";
              el.style.transform   = "translateY(0)";
            }}
          >
            {/* Icon + seeded status */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "40px", height: "40px", borderRadius: "14px",
                  background: `${s.color}14`, border: `1.5px solid ${s.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon size={18} style={{ color: s.color }} />
              </div>
              {seeded
                ? <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                : <AlertCircle  size={16} style={{ color: "#f59e0b" }} />}
            </div>

            {/* Label + description */}
            <div>
              <p style={{ fontFamily: "Sora, sans-serif", fontSize: "14px", fontWeight: 800, color: "#0a1f2e", margin: "0 0 4px" }}>
                {s.label}
              </p>
              <p style={{ fontSize: "12px", fontWeight: 500, color: "#8ca0b0", margin: 0, lineHeight: 1.5 }}>
                {s.description}
              </p>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700, color: s.color, marginTop: "auto" }}>
              Edit section <ChevronRight size={13} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Export count so the server page can build the progress bar
export const CMS_SECTION_COUNT = SECTIONS.length;