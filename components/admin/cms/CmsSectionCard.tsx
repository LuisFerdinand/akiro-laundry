// components/admin/cms/CmsSectionCard.tsx
"use client";

import Link          from "next/link";
import { ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  href:        string;
  icon:        React.ElementType;
  label:       string;
  description: string;
  color:       string;
  seeded:      boolean;
}

export function CmsSectionCard({ href, icon: Icon, label, description, color, seeded }: Props) {
  return (
    <Link
      href={href}
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
        el.style.borderColor = `${color}40`;
        el.style.boxShadow   = `0 6px 20px ${color}14`;
        el.style.transform   = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "hsl(210 25% 91%)";
        el.style.boxShadow   = "0 2px 10px rgba(26,127,186,0.05)";
        el.style.transform   = "translateY(0)";
      }}
    >
      {/* Icon + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width:          "40px",
            height:         "40px",
            borderRadius:   "14px",
            background:     `${color}14`,
            border:         `1.5px solid ${color}22`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {seeded
          ? <CheckCircle2 size={16} style={{ color: "#10b981" }} />
          : <AlertCircle  size={16} style={{ color: "#f59e0b" }} />}
      </div>

      {/* Label + description */}
      <div>
        <p style={{ fontFamily: "Sora, sans-serif", fontSize: "14px", fontWeight: 800, color: "#0a1f2e", margin: 0, marginBottom: "4px" }}>
          {label}
        </p>
        <p style={{ fontSize: "12px", fontWeight: 500, color: "#8ca0b0", margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700, color, marginTop: "auto" }}>
        Edit section
        <ChevronRight size={13} />
      </div>
    </Link>
  );
}