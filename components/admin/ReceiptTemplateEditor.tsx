// components/admin/ReceiptTemplateEditor.tsx
"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import {
  Save, CheckCircle2, Loader2, Receipt,
  Settings, ChevronDown, Bold, Variable, Eye, EyeOff,
} from "lucide-react";
import { updateReceiptSettings } from "@/lib/actions/receipt-settings";
import { buildReceiptContent, charsPerLineFor, type ReceiptData, type ReceiptLine } from "@/lib/utils/receipt-lines";
import type { ReceiptSettings } from "@/lib/db/schema/receipt";

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const PAPER_WIDTHS = [
  { value: "58mm", label: "58 mm  (standard)" },
  { value: "80mm", label: "80 mm  (wide)" },
];

const FONT_SIZES = [
  { value: "normal", label: "Normal" },
  { value: "large",  label: "Large (double width & height)" },
];

const DIVIDER_CHARS = [
  { value: "-", label: "- (dashes)" },
  { value: "=", label: "= (double line)" },
  { value: "*", label: "* (stars)" },
  { value: "~", label: "~ (wavy)" },
  { value: "_", label: "_ (underline)" },
];

const MAIN_VARIABLES: { token: string; label: string }[] = [
  { token: "{{shopName}}",        label: "Shop Name" },
  { token: "{{shopTagline}}",     label: "Shop Tagline" },
  { token: "{{orderNumber}}",     label: "Order Number" },
  { token: "{{date}}",            label: "Date" },
  { token: "{{customerName}}",    label: "Customer Name" },
  { token: "{{customerPhone}}",   label: "Customer Phone" },
  { token: "{{customerAddress}}", label: "Customer Address" },
  { token: "{{items}}",           label: "Items (auto-built list)" },
  { token: "{{totalPrice}}",      label: "Total Price" },
  { token: "{{paymentLine}}",     label: "Payment Line (paid/unpaid)" },
  { token: "{{paymentMethod}}",   label: "Payment Method" },
  { token: "{{amountPaid}}",      label: "Amount Paid" },
  { token: "{{change}}",          label: "Change" },
  { token: "{{notes}}",           label: "Order Notes" },
  { token: "{{footerContact}}",   label: "Footer Contact" },
  { token: "{{divider}}",         label: "Divider Line" },
];

const PAID_LINE_VARIABLES = [
  { token: "{{paymentMethod}}", label: "Payment Method" },
  { token: "{{amountPaid}}",    label: "Amount Paid" },
  { token: "{{change}}",        label: "Change" },
];

const UNPAID_LINE_VARIABLES = [
  { token: "{{totalPrice}}", label: "Total Price" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   SAMPLE DATA — live preview runs through the EXACT same buildReceiptContent()
   used by the real ESC/POS print path, so this preview can never again show
   something different from what actually prints.
   ═══════════════════════════════════════════════════════════════════════════════ */

const SAMPLE_RECEIPT_DATA: Omit<ReceiptData, "settings"> = {
  orderNumber: "AK-20260406-042",
  createdAt:   new Date("2026-04-06T14:32:00"),
  formData: {
    customer: { name: "Maria Silva", phone: "+670 7712 3456", address: "Rua Formosa, Dili" },
    items: [
      { servicePricingId: 1, weightKg: 3.5,  quantity: null, soapId: 1,    pewangiId: 1 },
      { servicePricingId: 2, weightKg: null, quantity: 2,    soapId: null, pewangiId: null },
    ],
    notes: "Handle the silk shirt with extra care please.",
  },
  services: [
    { id: 1, name: "Wash & Dry — Regular", basePricePerKg: "3.00", category: "package", pricingUnit: "per_kg",  minimumKg: null, duration: null, notes: null, isActive: true, createdAt: new Date() },
    { id: 2, name: "Shoes — Sneakers",     basePricePerKg: "4.00", category: "package", pricingUnit: "per_pcs", minimumKg: null, duration: null, notes: null, isActive: true, createdAt: new Date() },
  ],
  soaps:    [{ id: 1, name: "Rinso Colour", brand: null, pricePerKg: "0.30", isActive: true, createdAt: new Date() }],
  pewangis: [{ id: 1, name: "Molto Pink",   brand: null, pricePerKg: "0.20", isActive: true, createdAt: new Date() }],
  breakdown: {
    items: [
      { baseServiceCost: 10.50, soapCost: 1.05, pewangiCost: 0.70, subtotal: 12.25 },
      { baseServiceCost: 8.00,  soapCost: 0,    pewangiCost: 0,    subtotal: 8.00 },
    ],
    totalPrice: 20.25,
  },
  paymentMethod: "cash",
  amountPaid:    25.00,
  changeGiven:   4.75,
};

function buildPreviewLines(s: ReceiptSettings): ReceiptLine[] {
  const charsPerLine = charsPerLineFor(s.paperWidth);
  return buildReceiptContent({ ...SAMPLE_RECEIPT_DATA, settings: s }, charsPerLine);
}

function ReceiptLinesPreview({ lines, fontSize }: { lines: ReceiptLine[]; fontSize: string }) {
  return (
    <div
      style={{
        fontFamily: "'Courier New', monospace",
        fontSize: fontSize === "large" ? 20 : 12,
        fontWeight: fontSize === "large" ? 700 : 400,
        lineHeight: 1.55,
        color: "#000",
        background: "white",
        padding: "14px 10px",
      }}
    >
      {lines.map((segments, i) => (
        <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {segments.every((seg) => !seg.text)
            ? " "
            : segments.map((seg, j) => (
                <span key={j} style={{ fontWeight: seg.bold ? 700 : 400 }}>{seg.text}</span>
              ))}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function SectionHeader({
  icon: Icon, label, open, onToggle,
}: {
  icon: React.ElementType; label: string; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%", padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 8,
        background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
        border: "none", cursor: "pointer",
        borderBottom: open ? "1.5px solid #e2e8f0" : "none",
      }}
    >
      <Icon size={13} style={{ color: "#1a7fba" }} />
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
        {label}
      </span>
      <ChevronDown
        size={13}
        style={{
          color: "#94a3b8", marginLeft: "auto",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: "#94a3b8" }}>
      {children}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "7px 10px", borderRadius: "6px",
        border: "1.5px solid #e2e8f0", fontSize: "12px", fontWeight: 600,
        color: "#1e293b", background: "#f8fafc", outline: "none",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
    />
  );
}

function SelectInput({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "7px 10px", borderRadius: "6px",
        border: "1.5px solid #e2e8f0", fontSize: "12px", fontWeight: 600,
        color: "#1e293b", background: "#f8fafc", outline: "none", cursor: "pointer",
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Small icon button — mirrors the WA template editor's toolbar button. */
function ToolBtn({
  icon: Icon, label, onClick, active = false,
}: {
  icon: React.ElementType; label: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      style={{
        width: 26, height: 26,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "6px",
        border: active ? "1.5px solid #1a7fba" : "1.5px solid transparent",
        background: active ? "#edf7fd" : "transparent",
        color: active ? "#1a7fba" : "#64748b",
        cursor: "pointer", transition: "all 0.12s", flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#334155"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; } }}
    >
      <Icon size={12} />
    </button>
  );
}

/**
 * A multi-line template field with a Bold toolbar (the only formatting a
 * thermal printer can render) and an "Insert Variable" dropdown — mirrors
 * the WA template editor's FormattableField exactly.
 */
function FormattableField({
  label, value, onChange, rows = 4, placeholder, variables,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  variables: { token: string; label: string }[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const varMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (varMenuRef.current && !varMenuRef.current.contains(e.target as Node)) setShowVarMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const wrapSelection = (before: string, after: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const text  = ta.value;
    const selected = text.substring(start, end);

    const beforeMatch = text.substring(Math.max(0, start - before.length), start);
    const afterMatch  = text.substring(end, end + after.length);
    if (beforeMatch === before && afterMatch === after) {
      const newText = text.substring(0, start - before.length) + selected + text.substring(end + after.length);
      onChange(newText);
      requestAnimationFrame(() => {
        ta.selectionStart = start - before.length;
        ta.selectionEnd   = end - before.length;
        ta.focus();
      });
      return;
    }

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    onChange(newText);
    requestAnimationFrame(() => {
      ta.selectionStart = start + before.length;
      ta.selectionEnd   = end + before.length;
      ta.focus();
    });
  };

  const insertAtCursor = (insert: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start   = ta.selectionStart;
    const text    = ta.value;
    const newText = text.substring(0, start) + insert + text.substring(start);
    onChange(newText);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + insert.length;
      ta.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSelection("*", "*"); }
  };

  return (
    <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 10px", borderBottom: "1.5px solid #f1f5f9", background: "#fafbfc",
          flexWrap: "wrap", gap: 4,
        }}
      >
        <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ToolBtn icon={Bold} label="Bold (*text*) — Ctrl+B" onClick={() => wrapSelection("*", "*")} />
          <div style={{ position: "relative" }} ref={varMenuRef}>
            <ToolBtn icon={Variable} label="Insert variable" active={showVarMenu} onClick={() => setShowVarMenu((v) => !v)} />
            {showVarMenu && (
              <div
                style={{
                  position: "absolute", top: "100%", right: 0, zIndex: 50, marginTop: 4,
                  minWidth: 230, background: "white", borderRadius: 8,
                  border: "1.5px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  overflow: "hidden", maxHeight: 300, overflowY: "auto",
                }}
              >
                {variables.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => { insertAtCursor(v.token); setShowVarMenu(false); }}
                    style={{
                      width: "100%", padding: "7px 10px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      border: "none", background: "white", cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155" }}>{v.label}</span>
                    <code style={{ fontSize: "9px", fontWeight: 700, color: "#1a7fba", background: "#edf7fd", padding: "2px 5px", borderRadius: 4 }}>
                      {v.token}
                    </code>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 12px", border: "none", outline: "none", resize: "vertical",
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontSize: "12.5px", lineHeight: "1.6", color: "#1e293b", background: "white",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

interface ReceiptTemplateEditorProps {
  settings: ReceiptSettings;
}

export function ReceiptTemplateEditor({ settings: initial }: ReceiptTemplateEditorProps) {
  const [s, setS] = useState<ReceiptSettings>({ ...initial });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showBizPanel, setShowBizPanel] = useState(false);

  const update = useCallback(<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateReceiptSettings(s.id, {
        paperWidth:            s.paperWidth,
        fontSize:              s.fontSize,
        dividerChar:           s.dividerChar,
        shopName:              s.shopName,
        shopTagline:           s.shopTagline,
        footerContact:         s.footerContact,
        paymentPaidTemplate:   s.paymentPaidTemplate,
        unpaidMessageTemplate: s.unpaidMessageTemplate,
        receiptTemplate:       s.receiptTemplate,
        printDelayMs:          s.printDelayMs,
      });
      if (!result.success) setError(result.error ?? "Failed to save.");
      else setSaved(true);
    });
  };

  const previewLines = buildPreviewLines(s);

  return (
    <div className="flex flex-col xl:flex-row" style={{ gap: 20, alignItems: "flex-start" }}>

      {/* ════════════════════ LEFT — Controls ════════════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>

        <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, padding: "12px 14px" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#1e3a8a" }}>Edit the receipt template</p>
          <p style={{ fontSize: 11, lineHeight: 1.6, color: "#475569", marginTop: 3 }}>
            One freeform template — same as WhatsApp messages. Delete a line and it&apos;s gone from the
            printed receipt; insert a variable and it fills in with the real order&apos;s data.
          </p>
        </div>

        {/* Print formatting — all three genuinely affect the real thermal output */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Paper Width</FieldLabel>
              <SelectInput value={s.paperWidth} onChange={(v) => update("paperWidth", v)} options={PAPER_WIDTHS} />
            </div>
            <div>
              <FieldLabel>Font Size</FieldLabel>
              <SelectInput value={s.fontSize} onChange={(v) => update("fontSize", v)} options={FONT_SIZES} />
            </div>
            <div>
              <FieldLabel>Divider Character</FieldLabel>
              <SelectInput value={s.dividerChar} onChange={(v) => update("dividerChar", v)} options={DIVIDER_CHARS} />
            </div>
          </div>
          <p style={{ fontSize: "10px", color: "#94a3b8" }}>
            Paper width controls how many characters fit per line. Divider character fills the {"{{divider}}"} variable.
            Large font prints the whole receipt bigger — best paired with 80mm paper, since text may wrap awkwardly on 58mm.
          </p>
        </div>

        {/* Preview toggle */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: "6px",
              border: showPreview ? "1.5px solid #1a7fba" : "1.5px solid #e2e8f0",
              background: showPreview ? "#edf7fd" : "white",
              color: showPreview ? "#1a7fba" : "#64748b",
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
            }}
          >
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>

        {/* The ONE receipt template — exactly what prints, verbatim */}
        <FormattableField
          label="Receipt Template"
          value={s.receiptTemplate}
          onChange={(v) => update("receiptTemplate", v)}
          rows={16}
          placeholder="Type the exact receipt content. Leave empty to print nothing."
          variables={MAIN_VARIABLES}
        />

        {/* Business info / payment line templates — optional, only appear if referenced */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <SectionHeader icon={Settings} label="Business info & payment lines" open={showBizPanel} onToggle={() => setShowBizPanel(!showBizPanel)} />
          {showBizPanel && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>
                These feed the {"{{shopName}}"}, {"{{shopTagline}}"}, {"{{footerContact}}"} and {"{{paymentLine}}"} variables
                above — they don&apos;t print anywhere unless you insert their token into the template.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Shop Name</FieldLabel>
                  <TextInput value={s.shopName} onChange={(v) => update("shopName", v)} />
                </div>
                <div>
                  <FieldLabel>Shop Tagline</FieldLabel>
                  <TextInput value={s.shopTagline} onChange={(v) => update("shopTagline", v)} />
                </div>
              </div>
              <div>
                <FieldLabel>Footer Contact</FieldLabel>
                <TextInput
                  value={s.footerContact}
                  onChange={(v) => update("footerContact", v)}
                  placeholder="📞 +670 7675 8 7380  ·  akirolaundry.com"
                />
              </div>
              <FormattableField
                label="Payment Line — Paid"
                value={s.paymentPaidTemplate}
                onChange={(v) => update("paymentPaidTemplate", v)}
                rows={3}
                variables={PAID_LINE_VARIABLES}
              />
              <FormattableField
                label="Payment Line — Unpaid"
                value={s.unpaidMessageTemplate}
                onChange={(v) => update("unpaidMessageTemplate", v)}
                rows={2}
                variables={UNPAID_LINE_VARIABLES}
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "6px", padding: "8px 12px" }}>
            <p className="text-xs font-semibold" style={{ color: "#be123c" }}>{error}</p>
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 font-black text-sm text-white transition-all duration-150 active:scale-[0.97]"
          style={{
            height: 48, borderRadius: "7px",
            background: isPending ? "#94a3b8" : "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.35)",
            border: "none", cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={14} /> Saved!</>
          ) : (
            <><Save size={14} /> Save changes</>
          )}
        </button>
      </div>

      {/* ════════════════════ RIGHT — Live preview ════════════════════ */}
      {showPreview && (
        <div style={{ width: "min(340px, 100%)", flexShrink: 0, position: "sticky", top: 16 }}>
          <div
            style={{
              background: "white", borderRadius: "8px 8px 0 0",
              border: "1.5px solid #e2e8f0", borderBottom: "none",
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <Receipt size={13} style={{ color: "#1a7fba" }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
              Print preview
            </span>
            <span
              style={{
                marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "#94a3b8",
                background: "#f1f5f9", padding: "2px 8px", borderRadius: 20,
              }}
            >
              {s.paperWidth}
            </span>
          </div>

          <div
            style={{
              background: "#e8e8e8", border: "1.5px solid #e2e8f0", borderTop: "none",
              borderRadius: "0 0 8px 8px", padding: "20px 0",
              display: "flex", justifyContent: "center", minHeight: 500, overflowY: "auto",
            }}
          >
            <div style={{ position: "relative", width: "fit-content" }}>
              <div
                style={{
                  position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                  width: 60, height: 16, background: "rgba(200,200,180,0.7)", borderRadius: 2, zIndex: 1,
                }}
              />
              <div
                style={{
                  position: "absolute", bottom: -6, left: 4, right: -4, height: "100%",
                  background: "rgba(0,0,0,0.12)", borderRadius: 2, filter: "blur(4px)",
                }}
              />
              <div style={{ width: s.paperWidth, minHeight: 200, background: "white", position: "relative", zIndex: 0 }}>
                <ReceiptLinesPreview lines={previewLines} fontSize={s.fontSize} />
              </div>
              <div style={{ height: 12, background: "white", position: "relative", overflow: "hidden" }}>
                <svg viewBox="0 0 200 12" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
                  <path
                    d="M0,0 L10,10 L20,2 L30,9 L40,3 L50,11 L60,4 L70,10 L80,2 L90,8 L100,1 L110,9 L120,3 L130,11 L140,5 L150,10 L160,2 L170,8 L180,4 L190,11 L200,0 Z"
                    fill="#e8e8e8"
                  />
                </svg>
              </div>
            </div>
          </div>

          <p className="text-center mt-2" style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>
            Example details are replaced automatically with the real order when printing.
          </p>
        </div>
      )}
    </div>
  );
}
