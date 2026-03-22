// components/admin/cms/forms/CmsCtaForm.tsx
"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Plus } from "lucide-react";
import type { CmsCtaSection, CmsContactItem } from "@/lib/db/schema/cms";
import { saveCta }                 from "@/lib/actions/cms/cta.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, SaveBar,
} from "./CmsFormPrimitives";
import { useCmsSave } from "@/hooks/useCmsSave";

type ContactState = { id?: number; label: string; value: string; href: string; iconType: string; sortOrder: number };

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(26,127,186,0.05)", border: "1.5px solid rgba(26,127,186,0.12)", fontSize: "12px", fontWeight: 500, color: "#607080", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

// ── Icon type picker ──────────────────────────────────────────────────────────
const ICON_CHOICES = [
  { value: "phone",    icon: Phone,   label: "Phone"    },
  { value: "email",    icon: Mail,    label: "Email"    },
  { value: "location", icon: MapPin,  label: "Location" },
  { value: "hours",    icon: Clock,   label: "Hours"    },
] as const;

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {ICON_CHOICES.map((opt) => {
        const Icon    = opt.icon;
        const active  = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 12px", borderRadius: "10px", border: "1.5px solid",
              borderColor: active ? "#1a7fba" : "hsl(210 20% 88%)",
              background:  active ? "rgba(26,127,186,0.08)" : "white",
              color:       active ? "#1a7fba" : "#8ca0b0",
              fontSize:    "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <Icon size={13} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── CTA button preview ────────────────────────────────────────────────────────
function ButtonPreview({ primaryLabel, secondaryLabel }: { primaryLabel: string; secondaryLabel: string }) {
  if (!primaryLabel && !secondaryLabel) return null;
  return (
    <div style={{ padding: "14px 16px", borderRadius: "12px", background: "linear-gradient(135deg,#0a1f2e,#0f2d42)", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
      <p style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", width: "100%", margin: "0 0 6px", fontFamily: "Sora, sans-serif" }}>Button Preview</p>
      {primaryLabel && (
        <span style={{ padding: "9px 20px", borderRadius: "10px", background: "linear-gradient(135deg,#1a7fba,#2496d6)", color: "white", fontSize: "13px", fontWeight: 800, fontFamily: "Sora, sans-serif" }}>
          {primaryLabel}
        </span>
      )}
      {secondaryLabel && (
        <span style={{ padding: "9px 20px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.25)", color: "white", fontSize: "13px", fontWeight: 700 }}>
          {secondaryLabel}
        </span>
      )}
    </div>
  );
}

// ── Contact item row ──────────────────────────────────────────────────────────
function ContactRow({
  contact, index, onUpdate, onRemove,
}: {
  contact: ContactState; index: number;
  onUpdate: (field: keyof ContactState, val: string) => void;
  onRemove: () => void;
}) {
  const IconComp = ICON_CHOICES.find((o) => o.value === contact.iconType)?.icon ?? Phone;

  return (
    <div style={{ padding: "16px", borderRadius: "14px", background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)", display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Icon type picker */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px", fontFamily: "Sora, sans-serif" }}>
          Icon Type
        </label>
        <IconPicker value={contact.iconType} onChange={(v) => onUpdate("iconType", v)} />
      </div>

      <FormGrid cols={2}>
        <FormField label="Label" hint="e.g. Call Us">
          <TextInput value={contact.label} onChange={(v) => onUpdate("label", v)} placeholder="Call Us" />
        </FormField>
        <FormField label="Value" hint="e.g. +670 7723 0001">
          <TextInput value={contact.value} onChange={(v) => onUpdate("value", v)} placeholder="+670 7723 0001" />
        </FormField>
      </FormGrid>

      <FormField label="Link (href)" hint='Use tel:, mailto:, or a URL. Leave blank for non-clickable items like "Hours".'>
        <TextInput value={contact.href} onChange={(v) => onUpdate("href", v)} placeholder="tel:+67077230001" />
      </FormField>

      {/* Mini preview */}
      {(contact.label || contact.value) && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "white", border: "1.5px solid hsl(210 25% 91%)" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(26,127,186,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconComp size={14} style={{ color: "#1a7fba" }} />
          </div>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 800, color: "#607080", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{contact.label || "Label"}</p>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#0a1f2e", margin: "1px 0 0" }}>{contact.value || "Value"}</p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onRemove}
          style={{ padding: "6px 14px", borderRadius: "8px", border: "1.5px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)", fontSize: "11px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export function CmsCtaForm({ cta, contactItems }: { cta: CmsCtaSection | null; contactItems: CmsContactItem[] }) {
  const { save, pending } = useCmsSave();

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
    save(() => saveCta({ ctaId: cta?.id, badge, headline, headlineAccent, subtext, primaryCtaLabel, primaryCtaHref, secondaryCtaLabel, secondaryCtaHref, bgImageUrl: bgImageUrl || null, contacts: contacts.map((c, i) => ({ ...c, sortOrder: i, href: c.href || null })) }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Banner Copy ─────────────────────────────────────────────────── */}
      <SectionDivider label="Banner Copy" />
      <InfoBox>
        The headline has an accent word shown in a different colour on the live site — e.g. &ldquo;Book Your First Pickup&rdquo; + <strong style={{ color: "#1a7fba" }}>Free of Charge</strong>.
      </InfoBox>

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <FormField label="Badge" hint="Small pill above the headline.">
          <TextInput value={badge} onChange={setBadge} placeholder="Ready to Get Started?" />
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Headline">
            <TextInput value={headline} onChange={setHeadline} placeholder="Book Your First Pickup" />
          </FormField>
          <FormField label="Headline Accent (highlighted)">
            <TextInput value={headlineAccent} onChange={setHeadlineAccent} placeholder="Free of Charge" />
          </FormField>
        </FormGrid>

        {/* Live headline preview */}
        {(headline || headlineAccent) && (
          <div style={{ padding: "14px 18px", borderRadius: "14px", background: "linear-gradient(135deg,#0a1f2e,#0f2d42)" }}>
            <p style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: "Sora, sans-serif" }}>Preview</p>
            <p style={{ fontFamily: "Sora, sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "white", margin: 0, lineHeight: 1.25 }}>
              {headline} <span style={{ color: "#3ecb9a" }}>{headlineAccent}</span>
            </p>
          </div>
        )}

        <FormField label="Subtext">
          <TextArea value={subtext} onChange={setSubtext} rows={2} placeholder="New customers get their first pickup delivery fee waived." />
        </FormField>
      </div>

      {/* ── Background Image ─────────────────────────────────────────────── */}
      <SectionDivider label="Background Image" />
      <ImageUploadField
        label="Background Image (optional)"
        value={bgImageUrl}
        onChange={setBgImageUrl}
        folder="akiro/cta"
        aspectHint="Wide landscape 16:9 or 21:9"
        hint="Subtle background behind the CTA banner. Leave blank for the default gradient."
      />

      {/* ── CTA Buttons ─────────────────────────────────────────────────── */}
      <SectionDivider label="CTA Buttons" />
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ padding: "16px", borderRadius: "14px", background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#1a7fba", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px", fontFamily: "Sora, sans-serif" }}>Primary Button</p>
          <FormGrid cols={2}>
            <FormField label="Label"><TextInput value={primaryCtaLabel} onChange={setPrimaryCtaLabel} placeholder="Call Now" /></FormField>
            <FormField label="Link (href)" hint="e.g. tel:+67077230001"><TextInput value={primaryCtaHref} onChange={setPrimaryCtaHref} placeholder="tel:+67077230001" /></FormField>
          </FormGrid>
        </div>

        <div style={{ padding: "16px", borderRadius: "14px", background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px", fontFamily: "Sora, sans-serif" }}>Secondary Button</p>
          <FormGrid cols={2}>
            <FormField label="Label"><TextInput value={secondaryCtaLabel} onChange={setSecondaryCtaLabel} placeholder="WhatsApp" /></FormField>
            <FormField label="Link (href)" hint="e.g. https://wa.me/…"><TextInput value={secondaryCtaHref} onChange={setSecondaryCtaHref} placeholder="https://wa.me/67077230001" /></FormField>
          </FormGrid>
        </div>

        <ButtonPreview primaryLabel={primaryCtaLabel} secondaryLabel={secondaryCtaLabel} />
      </div>

      {/* ── Contact Info Items ───────────────────────────────────────────── */}
      <SectionDivider label={`Contact Info Items (${contacts.length})`} />
      <InfoBox>These appear below the CTA banner as small info chips with icons. Each item can have a clickable link (phone, email) or be display-only (hours).</InfoBox>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
        {contacts.length === 0 && (
          <p style={{ fontSize: "13px", color: "#b0bec9", fontStyle: "italic", fontWeight: 500 }}>No contact items yet — add one below.</p>
        )}
        {contacts.map((c, i) => (
          <ContactRow
            key={i}
            contact={c}
            index={i}
            onUpdate={(field, val) => updateContact(i, field, val)}
            onRemove={() => removeContact(i)}
          />
        ))}
        <button
          type="button"
          onClick={addContact}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "13px", borderRadius: "14px", border: "2px dashed hsl(210 25% 85%)", background: "transparent", fontSize: "13px", fontWeight: 700, color: "#8ca0b0", cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.color = "#1a7fba"; e.currentTarget.style.background = "rgba(26,127,186,0.04)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(210 25% 85%)"; e.currentTarget.style.color = "#8ca0b0"; e.currentTarget.style.background = "transparent"; }}
        >
          <Plus size={14} /> Add Contact Item
        </button>
      </div>

      <SaveBar pending={pending} onSave={handleSave} />
    </div>
  );
}