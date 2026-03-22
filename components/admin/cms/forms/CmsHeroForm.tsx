// components/admin/cms/forms/CmsHeroForm.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import type { CmsHero, CmsHeroStat } from "@/lib/db/schema/cms";
import { saveHero }                from "@/lib/actions/cms/hero.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, AddButton, SaveBar,
} from "./CmsFormPrimitives";
import { useCmsSave } from "@/hooks/useCmsSave";

type HeroData = (CmsHero & { stats: CmsHeroStat[] }) | null;

// ── Inline info box ───────────────────────────────────────────────────────────
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(26,127,186,0.05)", border: "1.5px solid rgba(26,127,186,0.12)", fontSize: "12px", fontWeight: 500, color: "#607080", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

// ── CTA button preview ────────────────────────────────────────────────────────
function CtaPreview({ primary, secondary }: { primary: string; secondary: string }) {
  if (!primary && !secondary) return null;
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", padding: "14px 16px", borderRadius: "12px", background: "hsl(210 30% 97%)", border: "1.5px solid hsl(210 25% 91%)" }}>
      {primary && (
        <span style={{ padding: "8px 18px", borderRadius: "10px", background: "linear-gradient(135deg,#1a7fba,#2496d6)", color: "white", fontSize: "13px", fontWeight: 800, fontFamily: "Sora, sans-serif" }}>
          {primary}
        </span>
      )}
      {secondary && (
        <span style={{ padding: "8px 18px", borderRadius: "10px", border: "1.5px solid #c8e9f8", background: "white", color: "#1a7fba", fontSize: "13px", fontWeight: 700 }}>
          {secondary}
        </span>
      )}
    </div>
  );
}

export function CmsHeroForm({ data }: { data: HeroData }) {
  const { save, pending } = useCmsSave();
  const [statsOpen, setStatsOpen]  = useState(true);

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
    save(() => saveHero({ heroId: data?.id, badge, headline, headlineAccent, headlineSuffix, subtext, primaryCtaLabel, primaryCtaHref, secondaryCtaLabel, secondaryCtaHref, heroImageUrl: heroImageUrl || null, heroImageAlt: heroImageAlt || null, stats: stats.map((s, i) => ({ ...s, sortOrder: i })) }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Badge & Headline ────────────────────────────────────────────── */}
      <SectionDivider label="Badge & Headline" />
      <InfoBox>
        The headline is split into three parts so you can style the middle word differently (it appears in blue on the live site). Example: <strong>&ldquo;Fresh Laundry,&rdquo;</strong> + <strong>&ldquo;Delivered&rdquo;</strong> + <strong>&ldquo;to Your Door.&rdquo;</strong>
      </InfoBox>

      <div style={{ marginTop: "16px" }}>
        <FormField label="Badge Text" hint="Small pill shown above the headline. e.g. business hours or a promo.">
          <TextInput value={badge} onChange={setBadge} placeholder="Open Today · 08:00 – 20:00" />
        </FormField>
      </div>

      <div style={{ marginTop: "14px" }}>
        <FormGrid cols={3}>
          <FormField label="Line 1">       <TextInput value={headline}       onChange={setHeadline}       placeholder="Fresh Laundry," /></FormField>
          <FormField label="Accent (blue)"><TextInput value={headlineAccent} onChange={setHeadlineAccent} placeholder="Delivered" /></FormField>
          <FormField label="Line 3">       <TextInput value={headlineSuffix} onChange={setHeadlineSuffix} placeholder="to Your Door." /></FormField>
        </FormGrid>
      </div>

      {/* Live headline preview */}
      {(headline || headlineAccent || headlineSuffix) && (
        <div style={{ marginTop: "12px", padding: "16px 20px", borderRadius: "14px", background: "linear-gradient(135deg,#f5fbff,#edf7fd)", border: "1.5px solid #c8e9f8" }}>
          <p style={{ fontSize: "9px", fontWeight: 800, color: "#8ca0b0", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: "Sora, sans-serif" }}>Headline Preview</p>
          <p style={{ fontFamily: "Sora, sans-serif", fontSize: "clamp(1.2rem,3vw,1.8rem)", fontWeight: 800, color: "#0a1f2e", margin: 0, lineHeight: 1.2 }}>
            {headline} <span style={{ color: "#1a7fba" }}>{headlineAccent}</span> {headlineSuffix}
          </p>
        </div>
      )}

      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext" hint="2–3 sentences shown below the headline. Keep it punchy.">
          <TextArea value={subtext} onChange={setSubtext} rows={3} placeholder="Professional laundry & dry-cleaning with fast turnaround. We pick up, we clean, we deliver." />
        </FormField>
      </div>

      {/* ── CTA Buttons ─────────────────────────────────────────────────── */}
      <SectionDivider label="CTA Buttons" />
      <InfoBox>Primary button is solid blue. Secondary is outlined. Both appear side-by-side in the hero.</InfoBox>

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Primary */}
        <div style={{ padding: "16px", borderRadius: "14px", background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#1a7fba", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px", fontFamily: "Sora, sans-serif" }}>
            Primary Button
          </p>
          <FormGrid cols={2}>
            <FormField label="Label"><TextInput value={primaryCtaLabel} onChange={setPrimaryCtaLabel} placeholder="Order a Pickup" /></FormField>
            <FormField label="Link (href)"><TextInput value={primaryCtaHref} onChange={setPrimaryCtaHref} placeholder="#contact" /></FormField>
          </FormGrid>
        </div>
        {/* Secondary */}
        <div style={{ padding: "16px", borderRadius: "14px", background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px", fontFamily: "Sora, sans-serif" }}>
            Secondary Button
          </p>
          <FormGrid cols={2}>
            <FormField label="Label"><TextInput value={secondaryCtaLabel} onChange={setSecondaryCtaLabel} placeholder="View Services" /></FormField>
            <FormField label="Link (href)"><TextInput value={secondaryCtaHref} onChange={setSecondaryCtaHref} placeholder="#services" /></FormField>
          </FormGrid>
        </div>
        {/* Live button preview */}
        <CtaPreview primary={primaryCtaLabel} secondary={secondaryCtaLabel} />
      </div>

      {/* ── Hero Image ──────────────────────────────────────────────────── */}
      <SectionDivider label="Hero Image" />
      <ImageUploadField
        label="Hero Image"
        value={heroImageUrl}
        onChange={setHeroImageUrl}
        folder="akiro/hero"
        aspectHint="Landscape 16:9 or square works best"
        hint="Shown alongside the headline. Leave blank to use the default placeholder."
      />
      <div style={{ marginTop: "12px" }}>
        <FormField label="Image Alt Text" hint="Describes the image for screen readers and search engines.">
          <TextInput value={heroImageAlt} onChange={setHeroImageAlt} placeholder="Freshly laundered clothes ready for delivery" />
        </FormField>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div style={{ marginTop: "28px" }}>
        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setStatsOpen((v) => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: "0 0 12px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={14} style={{ color: "#1a7fba" }} />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#8ca0b0", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Sora, sans-serif" }}>
              Stats ({stats.length})
            </span>
          </div>
          {statsOpen ? <ChevronUp size={14} style={{ color: "#b0bec9" }} /> : <ChevronDown size={14} style={{ color: "#b0bec9" }} />}
        </button>
        <div style={{ height: "1px", background: "hsl(210 25% 91%)", marginBottom: "16px" }} />

        {statsOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <InfoBox>Stats appear as small metric chips in the hero section. e.g. &ldquo;10K+&rdquo; / &ldquo;Happy Customers&rdquo;</InfoBox>
            {stats.length === 0 && (
              <p style={{ fontSize: "13px", color: "#b0bec9", fontStyle: "italic", fontWeight: 500, margin: "4px 0 8px" }}>No stats yet — add one below.</p>
            )}
            {stats.map((stat, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-end", gap: "10px", padding: "14px 16px", background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)", borderRadius: "14px" }}
              >
                {/* Mini preview chip */}
                <div style={{ flexShrink: 0, textAlign: "center", minWidth: "60px" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#1a7fba", fontFamily: "Sora, sans-serif", lineHeight: 1 }}>{stat.value || "—"}</div>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#8ca0b0", marginTop: "2px" }}>{stat.label || "label"}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <FormGrid cols={2}>
                    <FormField label="Value"><TextInput value={stat.value} onChange={(v) => updateStat(i, "value", v)} placeholder="10K+" /></FormField>
                    <FormField label="Label"><TextInput value={stat.label} onChange={(v) => updateStat(i, "label", v)} placeholder="Happy Customers" /></FormField>
                  </FormGrid>
                </div>
                <button
                  type="button"
                  onClick={() => removeStat(i)}
                  style={{ padding: "6px 12px", borderRadius: "8px", border: "1.5px solid rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.06)", fontSize: "11px", fontWeight: 700, color: "#ef4444", cursor: "pointer", flexShrink: 0, marginBottom: "2px" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <AddButton onClick={addStat} label="Add stat" />
          </div>
        )}
      </div>

      <SaveBar pending={pending} onSave={handleSave} />
    </div>
  );
}