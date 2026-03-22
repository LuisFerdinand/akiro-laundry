// components/admin/cms/forms/CmsNavbarForm.tsx
"use client";

import { useState } from "react";
import { GripVertical, Trash2 }    from "lucide-react";
import type { CmsNavbar, CmsNavLink } from "@/lib/db/schema/cms";
import { saveNavbar }              from "@/lib/actions/cms/navbar.actions";
import {
  SectionDivider,
  FormGrid,
  FormField,
  TextInput,
  ImageUploadField,
  AddButton,
  SaveBar,
} from "./CmsFormPrimitives";
import { useCmsSave } from "@/hooks/useCmsSave";

type NavbarData = (CmsNavbar & { links: CmsNavLink[] }) | null;

export function CmsNavbarForm({ data }: { data: NavbarData }) {
  const { save, pending } = useCmsSave();

  // ── Field state ──────────────────────────────────────────────────────────
  const [brandName, setBrandName] = useState(data?.brandName ?? "Akiro Laundry");
  const [logoUrl,   setLogoUrl]   = useState(data?.logoUrl   ?? "");
  const [logoAlt,   setLogoAlt]   = useState(data?.logoAlt   ?? "");
  const [ctaLabel,  setCtaLabel]  = useState(data?.ctaLabel  ?? "Book Now");
  const [ctaHref,   setCtaHref]   = useState(data?.ctaHref   ?? "#contact");

  const [links, setLinks] = useState<Array<{ id?: number; label: string; href: string; sortOrder: number }>>(
    (data?.links ?? []).map((l) => ({ id: l.id, label: l.label, href: l.href, sortOrder: l.sortOrder }))
  );

  const addLink    = () => setLinks((p) => [...p, { label: "", href: "#", sortOrder: p.length }]);
  const removeLink = (i: number) => setLinks((p) => p.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "href", v: string) =>
    setLinks((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: v } : l)));

  const handleSave = () => {
    save(() => saveNavbar({
        navbarId:  data?.id,
        brandName,
        logoUrl:   logoUrl || null,
        logoAlt:   logoAlt || null,
        ctaLabel,
        ctaHref,
        links: links.map((l, i) => ({ ...l, sortOrder: i })),
      }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Brand ────────────────────────────────────────────────────────── */}
      <SectionDivider label="Brand" />

      <FormGrid cols={2}>
        <FormField label="Brand Name">
          <TextInput value={brandName} onChange={setBrandName} placeholder="Akiro Laundry" />
        </FormField>
        <FormField label="Logo Alt Text">
          <TextInput value={logoAlt} onChange={setLogoAlt} placeholder="Akiro Laundry logo" />
        </FormField>
      </FormGrid>

      <div style={{ marginTop: "20px" }}>
        <ImageUploadField
          label="Logo"
          value={logoUrl}
          onChange={setLogoUrl}
          folder="akiro/navbar"
          aspectHint="Square or horizontal, transparent PNG recommended"
          hint="Leave blank to use the built-in SVG logo."
        />
      </div>

      {/* ── Live preview strip ───────────────────────────────────────────── */}
      {(brandName || logoUrl) && (
        <div style={{ marginTop: "16px" }}>
          <SectionDivider label="Preview" />
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "10px",
              padding:      "12px 16px",
              background:   "rgba(255,255,255,0.90)",
              borderRadius: "14px",
              border:       "1.5px solid hsl(210 25% 91%)",
              boxShadow:    "0 2px 8px rgba(26,127,186,0.06)",
            }}
          >
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt={logoAlt || "logo"} style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "8px" }} />
            ) : (
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "1.5px solid #b6def5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#1a7fba" }}>A</span>
              </div>
            )}
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: "15px", fontWeight: 800, color: "#0a1f2e" }}>
              {brandName || "Brand Name"}
            </span>
            <div style={{ flex: 1 }} />
            {links.map((l, i) => (
              <span key={i} style={{ fontSize: "12px", fontWeight: 600, color: "#607080" }}>{l.label || "Link"}</span>
            ))}
            {ctaLabel && (
              <span style={{ fontSize: "12px", fontWeight: 800, color: "white", background: "#1a7fba", borderRadius: "8px", padding: "5px 12px" }}>
                {ctaLabel}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── CTA Button ───────────────────────────────────────────────────── */}
      <SectionDivider label="CTA Button" />

      <FormGrid cols={2}>
        <FormField label="Button Label">
          <TextInput value={ctaLabel} onChange={setCtaLabel} placeholder="Book Now" />
        </FormField>
        <FormField label="Button Link (href)">
          <TextInput value={ctaHref} onChange={setCtaHref} placeholder="#contact" />
        </FormField>
      </FormGrid>

      {/* ── Navigation Links ─────────────────────────────────────────────── */}
      <SectionDivider label="Navigation Links" />

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {links.length === 0 && (
          <p style={{ fontSize: "12px", color: "#b0bec9", fontWeight: 500, fontStyle: "italic", margin: "0 0 8px" }}>
            No links yet — add your first one below.
          </p>
        )}

        {links.map((link, i) => (
          <div
            key={i}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "8px",
              padding:      "10px 12px",
              background:   "hsl(210 30% 98%)",
              border:       "1.5px solid hsl(210 25% 91%)",
              borderRadius: "12px",
            }}
          >
            {/* Drag handle */}
            <GripVertical size={14} style={{ color: "#b0bec9", flexShrink: 0, cursor: "grab" }} />

            {/* Order badge */}
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#b0bec9", minWidth: "16px", fontFamily: "Sora, sans-serif" }}>
              {String(i + 1).padStart(2, "0")}
            </span>

            <input
              type="text"
              value={link.label}
              onChange={(e) => updateLink(i, "label", e.target.value)}
              placeholder="Label"
              style={{
                flex: 1, padding: "7px 10px", border: "1.5px solid hsl(210 20% 88%)",
                borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: "white",
                color: "hsl(215 25% 15%)", outline: "none", fontFamily: "Nunito, sans-serif",
              }}
            />

            <input
              type="text"
              value={link.href}
              onChange={(e) => updateLink(i, "href", e.target.value)}
              placeholder="#services"
              style={{
                flex: 1, padding: "7px 10px", border: "1.5px solid hsl(210 20% 88%)",
                borderRadius: "8px", fontSize: "13px", fontWeight: 500, background: "white",
                color: "#607080", outline: "none", fontFamily: "monospace",
              }}
            />

            <button
              type="button"
              onClick={() => removeLink(i)}
              style={{
                width: "32px", height: "32px", display: "flex", alignItems: "center",
                justifyContent: "center", borderRadius: "8px", border: "1.5px solid rgba(239,68,68,0.18)",
                background: "rgba(239,68,68,0.06)", cursor: "pointer", flexShrink: 0,
              }}
            >
              <Trash2 size={13} style={{ color: "#ef4444" }} />
            </button>
          </div>
        ))}

        <AddButton onClick={addLink} label="Add navigation link" />
      </div>

      <SaveBar pending={pending} onSave={handleSave} />
    </div>
  );
}