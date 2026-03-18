// components/admin/cms/CmsSectionShell.tsx
import { ReactNode } from "react";

interface Props {
  title:       string;
  description: string;
  color:       string;
  children:    ReactNode;
  /** Optional extra content for the header right side (e.g. a preview link) */
  headerRight?: ReactNode;
}

export function CmsSectionShell({ title, description, color, children, headerRight }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Section header */}
      <div
        style={{
          background:     "white",
          borderRadius:   "20px",
          border:         "1.5px solid hsl(210 25% 91%)",
          boxShadow:      `0 2px 10px rgba(26,127,186,0.05)`,
          padding:        "20px 24px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            "12px",
          flexWrap:       "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Accent stripe */}
          <div
            style={{
              width:        "4px",
              height:       "36px",
              borderRadius: "999px",
              background:   `linear-gradient(to bottom, ${color}, ${color}88)`,
              flexShrink:   0,
            }}
          />
          <div>
            <h1
              style={{
                fontFamily:  "Sora, sans-serif",
                fontSize:    "18px",
                fontWeight:  800,
                color:       "#0a1f2e",
                margin:      0,
                lineHeight:  1.2,
              }}
            >
              {title}
            </h1>
            <p style={{ fontSize: "12px", color: "#8ca0b0", marginTop: "3px", fontWeight: 500 }}>
              {description}
            </p>
          </div>
        </div>

        {headerRight && <div>{headerRight}</div>}
      </div>

      {/* Form / content area */}
      <div
        style={{
          background:   "white",
          borderRadius: "20px",
          border:       "1.5px solid hsl(210 25% 91%)",
          boxShadow:    "0 2px 10px rgba(26,127,186,0.05)",
          padding:      "28px",
        }}
      >
        {children}
      </div>
    </div>
  );
}