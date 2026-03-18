// components/admin/cms/forms/CmsHeroForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { CmsHero, CmsHeroStat } from "@/lib/db/schema/cms";
import { saveHero }                from "@/lib/actions/cms/hero.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField,
  ItemCard, AddButton, SaveBar,
} from "./CmsFormPrimitives";

type HeroData = (CmsHero & { stats: CmsHeroStat[] }) | null;

export function CmsHeroForm({ data }: { data: HeroData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);

  const [badge,             setBadge]             = useState(data?.badge             ?? "Open Today · 08:00 – 20:00");
  const [headline,          setHeadline]          = useState(data?.headline          ?? "Fresh Laundry,");
  const [headlineAccent,    setHeadlineAccent]    = useState(data?.headlineAccent    ?? "Delivered");
  const [headlineSuffix,    setHeadlineSuffix]    = useState(data?.headlineSuffix    ?? "to Your Door.");
  const [subtext,           setSubtext]           = useState(data?.subtext           ?? "");
  const [primaryCtaLabel,   setPrimaryCtaLabel]   = useState(data?.primaryCtaLabel   ?? "Order a Pickup");
  const [primaryCtaHref,    setPrimaryCtaHref]    = useState(data?.primaryCtaHref    ?? "#contact");
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState(data?.secondaryCtaLabel ?? "View Services");
  const [secondaryCtaHref,  setSecondaryCtaHref]  = useState(data?.secondaryCtaHref  ?? "#services");
  const [heroImageUrl,      setHeroImageUrl]      = useState(data?.heroImageUrl      ?? "");
  const [heroImageAlt,      setHeroImageAlt]      = useState(data?.heroImageAlt      ?? "");

  const [stats, setStats] = useState<Array<{ id?: number; value: string; label: string; sortOrder: number }>>(
    (data?.stats ?? []).map((s) => ({ id: s.id, value: s.value, label: s.label, sortOrder: s.sortOrder }))
  );

  const addStat    = () => setStats((p) => [...p, { value: "", label: "", sortOrder: p.length }]);
  const removeStat = (i: number) => setStats((p) => p.filter((_, idx) => idx !== i));
  const updateStat = (i: number, field: "value" | "label", val: string) =>
    setStats((p) => p.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const handleSave = () => {
    startTransition(async () => {
      await saveHero({ heroId: data?.id, badge, headline, headlineAccent, headlineSuffix, subtext, primaryCtaLabel, primaryCtaHref, secondaryCtaLabel, secondaryCtaHref, heroImageUrl: heroImageUrl || null, heroImageAlt: heroImageAlt || null, stats: stats.map((s, i) => ({ ...s, sortOrder: i })) });
      setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionDivider label="Badge & Headline" />
      <FormField label="Badge Text">
        <TextInput value={badge} onChange={setBadge} placeholder="Open Today · 08:00 – 20:00" />
      </FormField>
      <div style={{ marginTop: "14px" }}>
        <FormGrid cols={3}>
          <FormField label="Headline (line 1)"><TextInput value={headline}       onChange={setHeadline}       placeholder="Fresh Laundry," /></FormField>
          <FormField label="Headline Accent">  <TextInput value={headlineAccent} onChange={setHeadlineAccent} placeholder="Delivered" /></FormField>
          <FormField label="Headline Suffix">  <TextInput value={headlineSuffix} onChange={setHeadlineSuffix} placeholder="to Your Door." /></FormField>
        </FormGrid>
      </div>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext"><TextArea value={subtext} onChange={setSubtext} rows={3} placeholder="Short description below the headline…" /></FormField>
      </div>

      <SectionDivider label="CTA Buttons" />
      <FormGrid cols={2}>
        <FormField label="Primary Button Label"> <TextInput value={primaryCtaLabel}   onChange={setPrimaryCtaLabel}   placeholder="Order a Pickup" /></FormField>
        <FormField label="Primary Button Href">  <TextInput value={primaryCtaHref}    onChange={setPrimaryCtaHref}    placeholder="#contact" /></FormField>
        <FormField label="Secondary Button Label"><TextInput value={secondaryCtaLabel} onChange={setSecondaryCtaLabel} placeholder="View Services" /></FormField>
        <FormField label="Secondary Button Href"> <TextInput value={secondaryCtaHref}  onChange={setSecondaryCtaHref}  placeholder="#services" /></FormField>
      </FormGrid>

      <SectionDivider label="Hero Image" />
      <ImageUploadField
        label="Hero Image"
        value={heroImageUrl}
        onChange={setHeroImageUrl}
        folder="akiro/hero"
        aspectHint="Landscape 16:9 or square works best"
        hint="Displayed alongside the headline. Leave blank for placeholder."
      />
      <div style={{ marginTop: "12px" }}>
        <FormField label="Image Alt Text">
          <TextInput value={heroImageAlt} onChange={setHeroImageAlt} placeholder="Freshly laundered clothes ready for delivery" />
        </FormField>
      </div>

      <SectionDivider label="Stats" />
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {stats.map((stat, i) => (
          <ItemCard key={i} onDelete={() => removeStat(i)} deleteLabel="Remove stat">
            <FormGrid cols={2}>
              <FormField label="Value"><TextInput value={stat.value} onChange={(v) => updateStat(i, "value", v)} placeholder="10K+" /></FormField>
              <FormField label="Label"><TextInput value={stat.label} onChange={(v) => updateStat(i, "label", v)} placeholder="Happy Customers" /></FormField>
            </FormGrid>
          </ItemCard>
        ))}
        <AddButton onClick={addStat} label="Add stat" />
      </div>

      <SaveBar pending={pending} saved={saved} onSave={handleSave} />
    </div>
  );
}