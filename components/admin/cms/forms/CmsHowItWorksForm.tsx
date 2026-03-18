// components/admin/cms/forms/CmsHowItWorksForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { CmsHowItWorksSection, CmsHowItWorksStep } from "@/lib/db/schema/cms";
import { saveHowItWorks }          from "@/lib/actions/cms/how-it-works.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, ColorInput,
  ItemCard, AddButton, SaveBar,
} from "./CmsFormPrimitives";

type HowData  = (CmsHowItWorksSection & { steps: CmsHowItWorksStep[] }) | null;
type StepState = { id?: number; stepNumber: string; title: string; description: string; imageUrl: string; imageAlt: string; accentColor: string; sortOrder: number };

export function CmsHowItWorksForm({ data }: { data: HowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [badge,    setBadge]    = useState(data?.badge    ?? "Simple Process");
  const [headline, setHeadline] = useState(data?.headline ?? "Laundry Done in 4 Easy Steps");
  const [subtext,  setSubtext]  = useState(data?.subtext  ?? "");

  const [steps, setSteps] = useState<StepState[]>(
    (data?.steps ?? []).map((s) => ({ id: s.id, stepNumber: s.stepNumber, title: s.title, description: s.description, imageUrl: s.imageUrl ?? "", imageAlt: s.imageAlt ?? "", accentColor: s.accentColor, sortOrder: s.sortOrder }))
  );

  const addStep    = () => setSteps((p) => [...p, { stepNumber: String(p.length + 1).padStart(2, "0"), title: "", description: "", imageUrl: "", imageAlt: "", accentColor: "#1a7fba", sortOrder: p.length }]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: keyof StepState, val: string) =>
    setSteps((p) => p.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const handleSave = () => {
    startTransition(async () => {
      await saveHowItWorks({ sectionId: data?.id, badge, headline, subtext, steps: steps.map((s, i) => ({ ...s, sortOrder: i, imageUrl: s.imageUrl || null, imageAlt: s.imageAlt || null })) });
      setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionDivider label="Section Header" />
      <FormGrid cols={2}>
        <FormField label="Badge">   <TextInput value={badge}    onChange={setBadge}    placeholder="Simple Process" /></FormField>
        <FormField label="Headline"><TextInput value={headline} onChange={setHeadline} placeholder="Laundry Done in 4 Easy Steps" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext"><TextArea value={subtext} onChange={setSubtext} placeholder="Short description…" /></FormField>
      </div>

      <SectionDivider label="Steps" />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {steps.map((step, i) => (
          <ItemCard key={i} onDelete={() => removeStep(i)} deleteLabel="Remove step">
            <FormGrid cols={3}>
              <FormField label="Step Number"><TextInput value={step.stepNumber} onChange={(v) => updateStep(i, "stepNumber", v)} placeholder="01" /></FormField>
              <FormField label="Title" span={2}><TextInput value={step.title} onChange={(v) => updateStep(i, "title", v)} placeholder="Place Your Order" /></FormField>
            </FormGrid>
            <FormField label="Description">
              <TextArea value={step.description} onChange={(v) => updateStep(i, "description", v)} rows={2} placeholder="Step description…" />
            </FormField>
            <ImageUploadField
              label="Step Image"
              value={step.imageUrl}
              onChange={(v) => updateStep(i, "imageUrl", v)}
              folder="akiro/how-it-works"
              aspectHint="Landscape 3:2 or 16:9"
            />
            <FormField label="Image Alt Text">
              <TextInput value={step.imageAlt} onChange={(v) => updateStep(i, "imageAlt", v)} placeholder="Alt text" />
            </FormField>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px", fontFamily: "Sora, sans-serif" }}>
                Accent Colour
              </label>
              <ColorInput value={step.accentColor} onChange={(v) => updateStep(i, "accentColor", v)} />
            </div>
          </ItemCard>
        ))}
        <AddButton onClick={addStep} label="Add step" />
      </div>

      <SaveBar pending={pending} saved={saved} onSave={handleSave} />
    </div>
  );
}