// components/admin/cms/forms/CmsServicesForm.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CmsServicesSection, CmsServiceCard } from "@/lib/db/schema/cms";
import { saveServices }            from "@/lib/actions/cms/services.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, ColorInput, SaveBar,
} from "./CmsFormPrimitives";
import { useCmsSave } from "@/hooks/useCmsSave";

type ServicesData = (CmsServicesSection & { cards: CmsServiceCard[] }) | null;
type CardState = { id?: number; title: string; description: string; price: string; imageUrl: string; imageAlt: string; accentColor: string; sortOrder: number };

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(26,127,186,0.05)", border: "1.5px solid rgba(26,127,186,0.12)", fontSize: "12px", fontWeight: 500, color: "#607080", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

// ── Accordion service card ─────────────────────────────────────────────────────
function ServiceCardRow({
  card, index, onUpdate, onRemove,
}: {
  card: CardState; index: number;
  onUpdate: (field: keyof CardState, val: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div style={{ border: "1.5px solid hsl(210 25% 91%)", borderRadius: "16px", overflow: "hidden", background: "white" }}>
      {/* Card header — div, not button, to avoid nested-button violation */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 16px", cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Color accent dot */}
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: card.accentColor || "#c8e9f8", flexShrink: 0 }} />

        {/* Title or placeholder */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "14px", fontWeight: 800, color: card.title ? "#0a1f2e" : "#b0bec9", margin: 0, fontFamily: "Sora, sans-serif", fontStyle: card.title ? "normal" : "italic" }}>
            {card.title || `Service Card ${index + 1}`}
          </p>
          {card.price && !open && (
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#8ca0b0", margin: "2px 0 0" }}>{card.price}</p>
          )}
        </div>

        {/* Actions — stop propagation so clicking these doesn't toggle the accordion */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {!open && (
            <button
              type="button"
              onClick={onRemove}
              style={{ padding: "4px 10px", borderRadius: "7px", border: "1.5px solid rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.06)", fontSize: "11px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}
            >
              Remove
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px" }}>
            {open
              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#b0bec9" strokeWidth="2" strokeLinecap="round"><path d="M2 9l5-5 5 5"/></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#b0bec9" strokeWidth="2" strokeLinecap="round"><path d="M2 5l5 5 5-5"/></svg>}
          </div>
        </div>
      </div>

      {/* Expandable body */}
      {open && (
        <div style={{ padding: "0 16px 20px", borderTop: "1px solid hsl(210 25% 93%)", display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
          <FormGrid cols={2}>
            <FormField label="Service Name"><TextInput value={card.title} onChange={(v) => onUpdate("title", v)} placeholder="Regular Wash" /></FormField>
            <FormField label="Price">        <TextInput value={card.price} onChange={(v) => onUpdate("price", v)} placeholder="From $2/kg" /></FormField>
          </FormGrid>

          <FormField label="Description" hint="2–3 sentences about what this service includes.">
            <TextArea value={card.description} onChange={(v) => onUpdate("description", v)} rows={2} placeholder="Everyday clothes washed, dried, and neatly folded…" />
          </FormField>

          <ImageUploadField
            label="Service Image"
            value={card.imageUrl}
            onChange={(v) => onUpdate("imageUrl", v)}
            folder="akiro/services"
            aspectHint="Square or 4:3"
            hint="Optional — shows alongside the service description."
          />

          <FormField label="Image Alt Text">
            <TextInput value={card.imageAlt} onChange={(v) => onUpdate("imageAlt", v)} placeholder="e.g. Clothes in a washing machine" />
          </FormField>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px", fontFamily: "Sora, sans-serif" }}>
              Card Accent Colour
            </label>
            <ColorInput value={card.accentColor} onChange={(v) => onUpdate("accentColor", v)} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onRemove}
              style={{ padding: "7px 16px", borderRadius: "9px", border: "1.5px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)", fontSize: "12px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}
            >
              Remove this card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CmsServicesForm({ data }: { data: ServicesData }) {
  const { save, pending } = useCmsSave();

  const [badge,    setBadge]    = useState(data?.badge    ?? "What We Offer");
  const [headline, setHeadline] = useState(data?.headline ?? "Every Fabric, Every Need");
  const [subtext,  setSubtext]  = useState(data?.subtext  ?? "");

  const [cards, setCards] = useState<CardState[]>(
    (data?.cards ?? []).map((c) => ({ id: c.id, title: c.title, description: c.description, price: c.price, imageUrl: c.imageUrl ?? "", imageAlt: c.imageAlt ?? "", accentColor: c.accentColor, sortOrder: c.sortOrder }))
  );

  const addCard    = () => setCards((p) => [...p, { title: "", description: "", price: "", imageUrl: "", imageAlt: "", accentColor: "#1a7fba", sortOrder: p.length }]);
  const removeCard = (i: number) => setCards((p) => p.filter((_, idx) => idx !== i));
  const updateCard = (i: number, field: keyof CardState, val: string) =>
    setCards((p) => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const handleSave = () => {
    save(() => saveServices({ sectionId: data?.id, badge, headline, subtext, cards: cards.map((c, i) => ({ ...c, sortOrder: i, imageUrl: c.imageUrl || null, imageAlt: c.imageAlt || null })) }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionDivider label="Section Header" />
      <FormGrid cols={2}>
        <FormField label="Badge">   <TextInput value={badge}    onChange={setBadge}    placeholder="What We Offer" /></FormField>
        <FormField label="Headline"><TextInput value={headline} onChange={setHeadline} placeholder="Every Fabric, Every Need" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext" hint="Short description shown below the headline on the live page.">
          <TextArea value={subtext} onChange={setSubtext} placeholder="From daily shirts to finest silk — we handle it all with care." />
        </FormField>
      </div>

      <SectionDivider label={`Service Cards (${cards.length})`} />
      <InfoBox>Each card becomes a service tile on the public site. Click a card to expand and edit it. The coloured dot shows the accent colour.</InfoBox>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
        {cards.length === 0 && (
          <p style={{ fontSize: "13px", color: "#b0bec9", fontStyle: "italic", fontWeight: 500, margin: "0 0 8px" }}>No service cards yet — add one below.</p>
        )}
        {cards.map((card, i) => (
          <ServiceCardRow
            key={i}
            card={card}
            index={i}
            onUpdate={(field, val) => updateCard(i, field, val)}
            onRemove={() => removeCard(i)}
          />
        ))}

        {/* Add button */}
        <button
          type="button"
          onClick={addCard}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "13px", borderRadius: "14px", border: "2px dashed hsl(210 25% 85%)", background: "transparent", fontSize: "13px", fontWeight: 700, color: "#8ca0b0", cursor: "pointer", transition: "all 0.15s", marginTop: "4px" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.color = "#1a7fba"; e.currentTarget.style.background = "rgba(26,127,186,0.04)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(210 25% 85%)"; e.currentTarget.style.color = "#8ca0b0"; e.currentTarget.style.background = "transparent"; }}
        >
          <Plus size={14} /> Add Service Card
        </button>
      </div>

      <SaveBar pending={pending} onSave={handleSave} />
    </div>
  );
}