// components/admin/cms/forms/CmsCtaForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { CmsCtaSection, CmsContactItem } from "@/lib/db/schema/cms";
import { saveCta }                 from "@/lib/actions/cms/cta.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, SelectInput,
  ItemCard, AddButton, SaveBar,
} from "./CmsFormPrimitives";

type ContactState = { id?: number; label: string; value: string; href: string; iconType: string; sortOrder: number };

const ICON_OPTIONS = [
  { value: "phone",    label: "📞 Phone"    },
  { value: "email",    label: "✉️ Email"    },
  { value: "location", label: "📍 Location" },
  { value: "hours",    label: "🕐 Hours"    },
];

export function CmsCtaForm({ cta, contactItems }: { cta: CmsCtaSection | null; contactItems: CmsContactItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [badge,             setBadge]             = useState(cta?.badge             ?? "Ready to Get Started?");
  const [headline,          setHeadline]          = useState(cta?.headline          ?? "Book Your First Pickup");
  const [headlineAccent,    setHeadlineAccent]    = useState(cta?.headlineAccent    ?? "Free of Charge");
  const [subtext,           setSubtext]           = useState(cta?.subtext           ?? "");
  const [primaryCtaLabel,   setPrimaryCtaLabel]   = useState(cta?.primaryCtaLabel   ?? "Call Now");
  const [primaryCtaHref,    setPrimaryCtaHref]    = useState(cta?.primaryCtaHref    ?? "tel:+67077230001");
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState(cta?.secondaryCtaLabel ?? "WhatsApp");
  const [secondaryCtaHref,  setSecondaryCtaHref]  = useState(cta?.secondaryCtaHref  ?? "https://wa.me/67077230001");
  const [bgImageUrl,        setBgImageUrl]        = useState(cta?.bgImageUrl        ?? "");

  const [contacts, setContacts] = useState<ContactState[]>(
    contactItems.map((c) => ({ id: c.id, label: c.label, value: c.value, href: c.href ?? "", iconType: c.iconType, sortOrder: c.sortOrder }))
  );

  const addContact    = () => setContacts((p) => [...p, { label: "", value: "", href: "", iconType: "phone", sortOrder: p.length }]);
  const removeContact = (i: number) => setContacts((p) => p.filter((_, idx) => idx !== i));
  const updateContact = (i: number, field: keyof ContactState, val: string) =>
    setContacts((p) => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const handleSave = () => {
    startTransition(async () => {
      await saveCta({ ctaId: cta?.id, badge, headline, headlineAccent, subtext, primaryCtaLabel, primaryCtaHref, secondaryCtaLabel, secondaryCtaHref, bgImageUrl: bgImageUrl || null, contacts: contacts.map((c, i) => ({ ...c, sortOrder: i, href: c.href || null })) });
      setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionDivider label="Banner Copy" />
      <FormGrid cols={2}>
        <FormField label="Badge">           <TextInput value={badge}          onChange={setBadge}          placeholder="Ready to Get Started?" /></FormField>
        <FormField label="Headline">        <TextInput value={headline}       onChange={setHeadline}       placeholder="Book Your First Pickup" /></FormField>
        <FormField label="Headline Accent"> <TextInput value={headlineAccent} onChange={setHeadlineAccent} placeholder="Free of Charge" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext"><TextArea value={subtext} onChange={setSubtext} placeholder="Short description below the headline…" /></FormField>
      </div>

      <SectionDivider label="Background Image" />
      <ImageUploadField
        label="Background Image (optional)"
        value={bgImageUrl}
        onChange={setBgImageUrl}
        folder="akiro/cta"
        aspectHint="Wide landscape 16:9 or 21:9"
        hint="Used as a subtle background behind the CTA banner."
      />

      <SectionDivider label="CTA Buttons" />
      <FormGrid cols={2}>
        <FormField label="Primary Button Label">  <TextInput value={primaryCtaLabel}   onChange={setPrimaryCtaLabel}   placeholder="Call Now" /></FormField>
        <FormField label="Primary Button Href">   <TextInput value={primaryCtaHref}    onChange={setPrimaryCtaHref}    placeholder="tel:+67077230001" /></FormField>
        <FormField label="Secondary Button Label"><TextInput value={secondaryCtaLabel} onChange={setSecondaryCtaLabel} placeholder="WhatsApp" /></FormField>
        <FormField label="Secondary Button Href"> <TextInput value={secondaryCtaHref}  onChange={setSecondaryCtaHref}  placeholder="https://wa.me/…" /></FormField>
      </FormGrid>

      <SectionDivider label="Contact Info Items" />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {contacts.map((c, i) => (
          <ItemCard key={i} onDelete={() => removeContact(i)} deleteLabel="Remove item">
            <FormGrid cols={2}>
              <FormField label="Label"><TextInput value={c.label} onChange={(v) => updateContact(i, "label", v)} placeholder="Call Us" /></FormField>
              <FormField label="Value"><TextInput value={c.value} onChange={(v) => updateContact(i, "value", v)} placeholder="+670 7723 0001" /></FormField>
              <FormField label="Link (href)">
                <TextInput value={c.href} onChange={(v) => updateContact(i, "href", v)} placeholder="tel:+67077230001" hint="Leave blank for non-link items." />
              </FormField>
              <FormField label="Icon Type">
                <SelectInput value={c.iconType} onChange={(v) => updateContact(i, "iconType", v)} options={ICON_OPTIONS} />
              </FormField>
            </FormGrid>
          </ItemCard>
        ))}
        <AddButton onClick={addContact} label="Add contact item" />
      </div>

      <SaveBar pending={pending} saved={saved} onSave={handleSave} />
    </div>
  );
}