// components/admin/cms/forms/CmsServicesForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { CmsServicesSection, CmsServiceCard } from "@/lib/db/schema/cms";
import { saveServices }            from "@/lib/actions/cms/services.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, ColorInput,
  ItemCard, AddButton, SaveBar,
} from "./CmsFormPrimitives";

type ServicesData = (CmsServicesSection & { cards: CmsServiceCard[] }) | null;
type CardState = { id?: number; title: string; description: string; price: string; imageUrl: string; imageAlt: string; accentColor: string; sortOrder: number };

export function CmsServicesForm({ data }: { data: ServicesData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

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
    startTransition(async () => {
      await saveServices({ sectionId: data?.id, badge, headline, subtext, cards: cards.map((c, i) => ({ ...c, sortOrder: i, imageUrl: c.imageUrl || null, imageAlt: c.imageAlt || null })) });
      setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionDivider label="Section Header" />
      <FormGrid cols={2}>
        <FormField label="Badge">   <TextInput value={badge}    onChange={setBadge}    placeholder="What We Offer" /></FormField>
        <FormField label="Headline"><TextInput value={headline} onChange={setHeadline} placeholder="Every Fabric, Every Need" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext"><TextArea value={subtext} onChange={setSubtext} placeholder="Short description…" /></FormField>
      </div>

      <SectionDivider label="Service Cards" />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {cards.map((card, i) => (
          <ItemCard key={i} onDelete={() => removeCard(i)} deleteLabel="Remove card">
            <FormGrid cols={2}>
              <FormField label="Title"><TextInput value={card.title} onChange={(v) => updateCard(i, "title", v)} placeholder="Regular Wash" /></FormField>
              <FormField label="Price"><TextInput value={card.price} onChange={(v) => updateCard(i, "price", v)} placeholder="From $2/kg" /></FormField>
            </FormGrid>
            <FormField label="Description">
              <TextArea value={card.description} onChange={(v) => updateCard(i, "description", v)} rows={2} placeholder="Card description…" />
            </FormField>
            <ImageUploadField
              label="Card Image"
              value={card.imageUrl}
              onChange={(v) => updateCard(i, "imageUrl", v)}
              folder="akiro/services"
              aspectHint="Square or 4:3"
            />
            <FormField label="Image Alt Text">
              <TextInput value={card.imageAlt} onChange={(v) => updateCard(i, "imageAlt", v)} placeholder="Alt text for accessibility" />
            </FormField>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px", fontFamily: "Sora, sans-serif" }}>
                Accent Colour
              </label>
              <ColorInput value={card.accentColor} onChange={(v) => updateCard(i, "accentColor", v)} />
            </div>
          </ItemCard>
        ))}
        <AddButton onClick={addCard} label="Add service card" />
      </div>

      <SaveBar pending={pending} saved={saved} onSave={handleSave} />
    </div>
  );
}