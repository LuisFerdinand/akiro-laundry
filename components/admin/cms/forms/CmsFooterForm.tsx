// components/admin/cms/forms/CmsFooterForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { CmsFooter, CmsFooterLink } from "@/lib/db/schema/cms";
import { saveFooter }              from "@/lib/actions/cms/footer.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, SelectInput,
  ItemCard, AddButton, SaveBar,
} from "./CmsFormPrimitives";

type FooterData = (CmsFooter & { links: CmsFooterLink[] }) | null;
type LinkState  = { id?: number; column: string; label: string; href: string; sortOrder: number };

const COLUMN_OPTIONS = [
  { value: "quick_links", label: "Quick Links" },
  { value: "social",      label: "Social"      },
  { value: "services",    label: "Services"    },
  { value: "company",     label: "Company"     },
];

export function CmsFooterForm({ data }: { data: FooterData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [brandName,     setBrandName]     = useState(data?.brandName     ?? "Akiro Laundry");
  const [tagline,       setTagline]       = useState(data?.tagline       ?? "");
  const [logoUrl,       setLogoUrl]       = useState(data?.logoUrl       ?? "");
  const [logoAlt,       setLogoAlt]       = useState(data?.logoAlt       ?? "");
  const [copyrightText, setCopyrightText] = useState(data?.copyrightText ?? `© ${new Date().getFullYear()} Akiro Laundry & Perfume. All rights reserved.`);

  const [links, setLinks] = useState<LinkState[]>(
    (data?.links ?? []).map((l) => ({ id: l.id, column: l.column, label: l.label, href: l.href, sortOrder: l.sortOrder }))
  );

  const addLink    = () => setLinks((p) => [...p, { column: "quick_links", label: "", href: "#", sortOrder: p.length }]);
  const removeLink = (i: number) => setLinks((p) => p.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: keyof LinkState, val: string) =>
    setLinks((p) => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const handleSave = () => {
    startTransition(async () => {
      await saveFooter({ footerId: data?.id, brandName, tagline: tagline || null, logoUrl: logoUrl || null, logoAlt: logoAlt || null, copyrightText, links: links.map((l, i) => ({ ...l, sortOrder: i })) });
      setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionDivider label="Brand" />
      <FormGrid cols={2}>
        <FormField label="Brand Name">    <TextInput value={brandName} onChange={setBrandName} placeholder="Akiro Laundry" /></FormField>
        <FormField label="Logo Alt Text"> <TextInput value={logoAlt}   onChange={setLogoAlt}   placeholder="Akiro Laundry" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "20px" }}>
        <ImageUploadField
          label="Footer Logo"
          value={logoUrl}
          onChange={setLogoUrl}
          folder="akiro/footer"
          aspectHint="Square or horizontal, transparent PNG on dark background"
          hint="Leave blank to use the built-in SVG fallback."
        />
      </div>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Tagline"><TextArea value={tagline} onChange={setTagline} rows={2} placeholder="Premium laundry & dry-cleaning service in Timor-Leste." /></FormField>
      </div>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Copyright Text"><TextInput value={copyrightText} onChange={setCopyrightText} placeholder={`© ${new Date().getFullYear()} Akiro Laundry & Perfume. All rights reserved.`} /></FormField>
      </div>

      <SectionDivider label="Footer Links" />
      <p style={{ fontSize: "12px", color: "#8ca0b0", fontWeight: 500, margin: "0 0 14px" }}>
        Assign each link to a column. <strong>quick_links</strong> and <strong>social</strong> are built-in; you can add custom column names too.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {links.map((link, i) => (
          <ItemCard key={i} onDelete={() => removeLink(i)} deleteLabel="Remove">
            <FormGrid cols={3}>
              <FormField label="Column"><SelectInput value={link.column} onChange={(v) => updateLink(i, "column", v)} options={COLUMN_OPTIONS} /></FormField>
              <FormField label="Label"> <TextInput value={link.label} onChange={(v) => updateLink(i, "label", v)} placeholder="Services" /></FormField>
              <FormField label="Href">  <TextInput value={link.href}  onChange={(v) => updateLink(i, "href",  v)} placeholder="#services or https://…" /></FormField>
            </FormGrid>
          </ItemCard>
        ))}
        <AddButton onClick={addLink} label="Add link" />
      </div>

      <SaveBar pending={pending} saved={saved} onSave={handleSave} />
    </div>
  );
}