// components/admin/cms/forms/CmsFooterForm.tsx
"use client";

import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import type { CmsFooter, CmsFooterLink } from "@/lib/db/schema/cms";
import { saveFooter }              from "@/lib/actions/cms/footer.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, SaveBar,
} from "./CmsFormPrimitives";
import { useCmsSave } from "@/hooks/useCmsSave";

type FooterData = (CmsFooter & { links: CmsFooterLink[] }) | null;
type LinkState  = { id?: number; column: string; label: string; href: string; sortOrder: number };

const CURRENT_YEAR      = new Date().getFullYear();
const DEFAULT_COPYRIGHT = `© ${CURRENT_YEAR} Akiro Laundry & Perfume. All rights reserved.`;

// Column definitions with colours for the column badges
const COLUMNS = [
  { value: "quick_links", label: "Quick Links", color: "#1a7fba", bg: "rgba(26,127,186,0.10)"  },
  { value: "social",      label: "Social",      color: "#10b981", bg: "rgba(16,185,129,0.10)"  },
  { value: "services",    label: "Services",    color: "#8b5cf6", bg: "rgba(139,92,246,0.10)"  },
  { value: "company",     label: "Company",     color: "#f59e0b", bg: "rgba(245,158,11,0.10)"  },
] as const;

function colMeta(val: string) {
  return COLUMNS.find((c) => c.value === val) ?? { label: val, color: "#8ca0b0", bg: "hsl(210 30% 95%)" };
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(26,127,186,0.05)", border: "1.5px solid rgba(26,127,186,0.12)", fontSize: "12px", fontWeight: 500, color: "#607080", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

// ── Column pill picker ─────────────────────────────────────────────────────────
function ColumnPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {COLUMNS.map((col) => {
        const active = value === col.value;
        return (
          <button
            key={col.value}
            type="button"
            onClick={() => onChange(col.value)}
            style={{
              padding: "5px 12px", borderRadius: "999px", border: "1.5px solid",
              borderColor: active ? col.color : "hsl(210 20% 88%)",
              background:  active ? col.bg : "white",
              color:       active ? col.color : "#8ca0b0",
              fontSize:    "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {col.label}
          </button>
        );
      })}
    </div>
  );
}

export function CmsFooterForm({ data }: { data: FooterData }) {
  const { save, pending } = useCmsSave();
  const [tab, setTab]     = useState<"brand" | "links">("brand");

  const [brandName,     setBrandName]     = useState(data?.brandName     ?? "Akiro Laundry");
  const [tagline,       setTagline]       = useState(data?.tagline       ?? "");
  const [logoUrl,       setLogoUrl]       = useState(data?.logoUrl       ?? "");
  const [logoAlt,       setLogoAlt]       = useState(data?.logoAlt       ?? "");
  const [copyrightText, setCopyrightText] = useState(data?.copyrightText ?? DEFAULT_COPYRIGHT);

  const [links, setLinks] = useState<LinkState[]>(
    (data?.links ?? []).map((l) => ({ id: l.id, column: l.column, label: l.label, href: l.href, sortOrder: l.sortOrder }))
  );

  const addLink    = () => setLinks((p) => [...p, { column: "quick_links", label: "", href: "#", sortOrder: p.length }]);
  const removeLink = (i: number) => setLinks((p) => p.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: keyof LinkState, val: string) =>
    setLinks((p) => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const handleSave = () => {
    save(() => saveFooter({ footerId: data?.id, brandName, tagline: tagline || null, logoUrl: logoUrl || null, logoAlt: logoAlt || null, copyrightText, links: links.map((l, i) => ({ ...l, sortOrder: i })) }));
  };

  // Group links by column for the preview strip
  const grouped = COLUMNS.reduce<Record<string, LinkState[]>>((acc, col) => {
    acc[col.value] = links.filter((l) => l.column === col.value);
    return acc;
  }, {} as Record<string, LinkState[]>);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1.5px solid hsl(210 25% 91%)", marginBottom: "24px" }}>
        {(["brand", "links"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "9px 18px", borderRadius: "10px 10px 0 0", border: "none",
              background:   tab === t ? "white" : "transparent",
              color:        tab === t ? "#1a7fba" : "#8ca0b0",
              fontSize:     "13px", fontWeight: tab === t ? 800 : 600,
              cursor:       "pointer", fontFamily: "Sora, sans-serif",
              borderBottom: tab === t ? "2px solid #1a7fba" : "2px solid transparent",
              transition:   "all 0.15s",
            }}
          >
            {t === "brand" ? "Brand & Identity" : `Links (${links.length})`}
          </button>
        ))}
      </div>

      {/* ── Brand tab ───────────────────────────────────────────────────── */}
      {tab === "brand" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <InfoBox>
            These fields control what appears in the left column of your footer — your brand name, logo and tagline.
          </InfoBox>

          <FormGrid cols={2}>
            <FormField label="Brand Name"><TextInput value={brandName} onChange={setBrandName} placeholder="Akiro Laundry" /></FormField>
            <FormField label="Logo Alt Text"><TextInput value={logoAlt} onChange={setLogoAlt} placeholder="Akiro Laundry" /></FormField>
          </FormGrid>

          <ImageUploadField
            label="Footer Logo"
            value={logoUrl}
            onChange={setLogoUrl}
            folder="akiro/footer"
            aspectHint="Square or horizontal — transparent PNG on dark background works best"
            hint="Leave blank to use the built-in SVG logo fallback."
          />

          <FormField label="Tagline" hint="Short description shown below the logo in the footer.">
            <TextArea value={tagline} onChange={setTagline} rows={2} placeholder="Premium laundry & dry-cleaning service in Timor-Leste." />
          </FormField>

          <FormField label="Copyright Text">
            <TextInput value={copyrightText} onChange={setCopyrightText} placeholder={DEFAULT_COPYRIGHT} />
          </FormField>

          {/* Mini footer preview */}
          <div style={{ padding: "20px", borderRadius: "16px", background: "linear-gradient(135deg,#0a1f2e,#0f2d42)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, fontFamily: "Sora, sans-serif" }}>Footer Preview</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={logoAlt} style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "8px" }} />
              ) : (
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(36,150,214,0.20)", border: "1.5px solid rgba(36,150,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#2496d6", fontFamily: "Sora, sans-serif" }}>A</span>
                </div>
              )}
              <p style={{ fontFamily: "Sora, sans-serif", fontSize: "15px", fontWeight: 800, color: "white", margin: 0 }}>
                {brandName.split(" ")[0]} <span style={{ color: "#2496d6" }}>{brandName.split(" ").slice(1).join(" ")}</span>
              </p>
            </div>
            {tagline && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", margin: 0, lineHeight: 1.5 }}>{tagline}</p>}
            {copyrightText && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", margin: "8px 0 0", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "10px" }}>{copyrightText}</p>}
          </div>
        </div>
      )}

      {/* ── Links tab ───────────────────────────────────────────────────── */}
      {tab === "links" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <InfoBox>
            Assign each link to a <strong>column</strong>. <strong>Quick Links</strong> appear as page anchor links. <strong>Social</strong> links go to your social profiles. You can also create <strong>Services</strong> or <strong>Company</strong> columns.
          </InfoBox>

          {/* Column summary chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {COLUMNS.map((col) => {
              const count = grouped[col.value]?.length ?? 0;
              if (count === 0) return null;
              return (
                <div key={col.value} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", background: col.bg, border: `1.5px solid ${col.color}30` }}>
                  <Link2 size={11} style={{ color: col.color }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: col.color }}>{col.label}: {count}</span>
                </div>
              );
            })}
          </div>

          {/* Link rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {links.length === 0 && (
              <p style={{ fontSize: "13px", color: "#b0bec9", fontStyle: "italic", fontWeight: 500 }}>No links yet — add one below.</p>
            )}
            {links.map((link, i) => {
              const meta = colMeta(link.column);
              return (
                <div
                  key={i}
                  style={{ padding: "14px 16px", borderRadius: "14px", background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)", display: "flex", flexDirection: "column", gap: "12px" }}
                >
                  {/* Column picker */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px", fontFamily: "Sora, sans-serif" }}>Column</label>
                    <ColumnPicker value={link.column} onChange={(v) => updateLink(i, "column", v)} />
                  </div>

                  {/* Label + href inline */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <FormField label="Label">
                        <TextInput value={link.label} onChange={(v) => updateLink(i, "label", v)} placeholder="Services" />
                      </FormField>
                    </div>
                    <div style={{ flex: 1 }}>
                      <FormField label="Href">
                        <TextInput value={link.href} onChange={(v) => updateLink(i, "href", v)} placeholder="#services or https://…" />
                      </FormField>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      title="Remove"
                      style={{ width: "38px", height: "38px", borderRadius: "10px", border: "1.5px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: "2px" }}
                    >
                      <Trash2 size={13} style={{ color: "#ef4444" }} />
                    </button>
                  </div>

                  {/* Mini preview */}
                  {link.label && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "8px", background: "white", border: "1.5px solid hsl(210 25% 91%)", width: "fit-content" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#607080" }}>{link.label}</span>
                      <span style={{ fontSize: "10px", color: "#b0bec9" }}>{link.href}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLink}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "13px", borderRadius: "14px", border: "2px dashed hsl(210 25% 85%)", background: "transparent", fontSize: "13px", fontWeight: 700, color: "#8ca0b0", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.color = "#1a7fba"; e.currentTarget.style.background = "rgba(26,127,186,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(210 25% 85%)"; e.currentTarget.style.color = "#8ca0b0"; e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={14} /> Add Link
            </button>
          </div>
        </div>
      )}

      <SaveBar pending={pending} onSave={handleSave} />
    </div>
  );
}