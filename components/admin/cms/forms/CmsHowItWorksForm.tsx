// components/admin/cms/forms/CmsHowItWorksForm.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CmsHowItWorksSection, CmsHowItWorksStep } from "@/lib/db/schema/cms";
import { saveHowItWorks }          from "@/lib/actions/cms/how-it-works.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, ColorInput, SaveBar,
} from "./CmsFormPrimitives";
import { useCmsSave } from "@/hooks/useCmsSave";

type HowData   = (CmsHowItWorksSection & { steps: CmsHowItWorksStep[] }) | null;
type StepState = { id?: number; stepNumber: string; title: string; description: string; imageUrl: string; imageAlt: string; accentColor: string; sortOrder: number };

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(26,127,186,0.05)", border: "1.5px solid rgba(26,127,186,0.12)", fontSize: "12px", fontWeight: 500, color: "#607080", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

// ── Accordion step row ─────────────────────────────────────────────────────────
function StepRow({
  step, index, onUpdate, onRemove,
}: {
  step: StepState; index: number;
  onUpdate: (field: keyof StepState, val: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div style={{ border: "1.5px solid hsl(210 25% 91%)", borderRadius: "16px", overflow: "hidden", background: "white" }}>
      {/* Header — div not button to avoid nested-button violation */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 16px", cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Step number badge */}
        <div style={{
          width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0,
          background: step.accentColor ? `${step.accentColor}18` : "hsl(210 30% 95%)",
          border: `1.5px solid ${step.accentColor || "#c8e9f8"}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Sora, sans-serif", fontSize: "12px", fontWeight: 800,
          color: step.accentColor || "#1a7fba",
        }}>
          {step.stepNumber || String(index + 1).padStart(2, "0")}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "14px", fontWeight: 800, color: step.title ? "#0a1f2e" : "#b0bec9", margin: 0, fontFamily: "Sora, sans-serif", fontStyle: step.title ? "normal" : "italic" }}>
            {step.title || `Step ${index + 1}`}
          </p>
        </div>

        {/* Actions — stop propagation */}
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

      {/* Body */}
      {open && (
        <div style={{ padding: "0 16px 20px", borderTop: "1px solid hsl(210 25% 93%)", display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
          <FormGrid cols={3}>
            <FormField label="Step Number" hint="e.g. 01">
              <TextInput value={step.stepNumber} onChange={(v) => onUpdate("stepNumber", v)} placeholder="01" />
            </FormField>
            <FormField label="Step Title" span={2}>
              <TextInput value={step.title} onChange={(v) => onUpdate("title", v)} placeholder="Place Your Order" />
            </FormField>
          </FormGrid>

          <FormField label="Description" hint="1–2 sentences explaining what happens in this step.">
            <TextArea value={step.description} onChange={(v) => onUpdate("description", v)} rows={2} placeholder="Use our app or call us. Choose your service and pickup time." />
          </FormField>

          <ImageUploadField
            label="Step Image"
            value={step.imageUrl}
            onChange={(v) => onUpdate("imageUrl", v)}
            folder="akiro/how-it-works"
            aspectHint="Landscape 3:2 or 16:9"
            hint="Shows on the left or right of the step card on the live site."
          />

          <FormField label="Image Alt Text">
            <TextInput value={step.imageAlt} onChange={(v) => onUpdate("imageAlt", v)} placeholder="Person placing a laundry order on their phone" />
          </FormField>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px", fontFamily: "Sora, sans-serif" }}>
              Accent Colour
            </label>
            <ColorInput value={step.accentColor} onChange={(v) => onUpdate("accentColor", v)} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onRemove}
              style={{ padding: "7px 16px", borderRadius: "9px", border: "1.5px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)", fontSize: "12px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}
            >
              Remove this step
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CmsHowItWorksForm({ data }: { data: HowData }) {
  const { save, pending } = useCmsSave();

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
    save(() => saveHowItWorks({ sectionId: data?.id, badge, headline, subtext, steps: steps.map((s, i) => ({ ...s, sortOrder: i, imageUrl: s.imageUrl || null, imageAlt: s.imageAlt || null })) }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionDivider label="Section Header" />
      <FormGrid cols={2}>
        <FormField label="Badge">   <TextInput value={badge}    onChange={setBadge}    placeholder="Simple Process" /></FormField>
        <FormField label="Headline"><TextInput value={headline} onChange={setHeadline} placeholder="Laundry Done in 4 Easy Steps" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext" hint="Short sentence shown below the headline.">
          <TextArea value={subtext} onChange={setSubtext} placeholder="We handle everything from collection to delivery so your day stays free." />
        </FormField>
      </div>

      <SectionDivider label={`Steps (${steps.length})`} />
      <InfoBox>Each step appears as an alternating image-and-text row on the live site. Steps alternate left/right automatically. Click a step to expand it.</InfoBox>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
        {steps.length === 0 && (
          <p style={{ fontSize: "13px", color: "#b0bec9", fontStyle: "italic", fontWeight: 500, margin: "0 0 8px" }}>No steps yet — add one below.</p>
        )}
        {steps.map((step, i) => (
          <StepRow
            key={i}
            step={step}
            index={i}
            onUpdate={(field, val) => updateStep(i, field, val)}
            onRemove={() => removeStep(i)}
          />
        ))}

        <button
          type="button"
          onClick={addStep}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "13px", borderRadius: "14px", border: "2px dashed hsl(210 25% 85%)", background: "transparent", fontSize: "13px", fontWeight: 700, color: "#8ca0b0", cursor: "pointer", transition: "all 0.15s", marginTop: "4px" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.color = "#1a7fba"; e.currentTarget.style.background = "rgba(26,127,186,0.04)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(210 25% 85%)"; e.currentTarget.style.color = "#8ca0b0"; e.currentTarget.style.background = "transparent"; }}
        >
          <Plus size={14} /> Add Step
        </button>
      </div>

      <SaveBar pending={pending} onSave={handleSave} />
    </div>
  );
}