// components/admin/cms/CmsTabNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Navigation,
  LayoutTemplate,
  Wrench,
  FileText,
  ImageIcon,
  Star,
  Megaphone,
  Search,
} from "lucide-react";

const CMS_SECTIONS = [
  { href: "/admin/cms",              icon: Layers,         label: "Overview"      },
  { href: "/admin/cms/navbar",       icon: Navigation,     label: "Navbar"        },
  { href: "/admin/cms/hero",         icon: LayoutTemplate, label: "Hero"          },
  { href: "/admin/cms/services",     icon: Wrench,         label: "Services"      },
  { href: "/admin/cms/how-it-works", icon: FileText,       label: "How It Works"  },
  { href: "/admin/cms/gallery",      icon: ImageIcon,      label: "Gallery"       },
  { href: "/admin/cms/testimonials", icon: Star,           label: "Testimonials"  },
  { href: "/admin/cms/cta",          icon: Megaphone,      label: "CTA & Contact" },
  { href: "/admin/cms/footer",       icon: FileText,       label: "Footer"        },
  { href: "/admin/cms/seo",          icon: Search,         label: "SEO"           },
] as const;

export function CmsTabNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin/cms" ? pathname === href : pathname.startsWith(href);

  return (
    <div
      style={{
        background:   "white",
        borderRadius: "16px",
        border:       "1.5px solid hsl(210 25% 91%)",
        boxShadow:    "0 2px 8px rgba(26,127,186,0.05)",
        padding:      "6px",
        display:      "flex",
        alignItems:   "center",
        gap:          "2px",
        overflowX:    "auto",
        flexWrap:     "nowrap",
        scrollbarWidth: "none",
      }}
    >
      {CMS_SECTIONS.map((section) => {
        const Icon    = section.icon;
        const active  = isActive(section.href);

        return (
          <Link
            key={section.href}
            href={section.href}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "6px",
              padding:        "7px 12px",
              borderRadius:   "10px",
              textDecoration: "none",
              whiteSpace:     "nowrap",
              fontSize:       "12px",
              fontWeight:     active ? 700 : 500,
              color:          active ? "#1a7fba" : "#607080",
              background:     active ? "rgba(26,127,186,0.09)" : "transparent",
              border:         active ? "1px solid rgba(26,127,186,0.18)" : "1px solid transparent",
              transition:     "all 0.15s",
              flexShrink:     0,
            }}
          >
            <Icon size={13} style={{ color: active ? "#1a7fba" : "#8ca0b0" }} />
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}