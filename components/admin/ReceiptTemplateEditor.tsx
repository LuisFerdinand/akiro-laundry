// components/admin/ReceiptTemplateEditor.tsx
"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Save, CheckCircle2, Loader2, Receipt,
  Settings, ChevronDown, ToggleLeft, ToggleRight,
  Type, Palette, Layout, Eye, Printer,
} from "lucide-react";
import { updateReceiptSettings } from "@/lib/actions/receipt-settings";
import type { ReceiptSettings } from "@/lib/db/schema/receipt";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const PAPER_WIDTHS = [
  { value: "58mm",  label: "58 mm  (standard)" },
  { value: "80mm",  label: "80 mm  (wide)" },
  { value: "72mm",  label: "72 mm  (custom)" },
  { value: "48mm",  label: "48 mm  (narrow)" },
];

const FONT_OPTIONS = [
  { value: "'IBM Plex Mono', 'Courier New', monospace", label: "IBM Plex Mono", importUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" },
  { value: "'Courier Prime', 'Courier New', monospace", label: "Courier Prime",  importUrl: "https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" },
  { value: "'Space Mono', monospace",                   label: "Space Mono",     importUrl: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" },
  { value: "'Roboto Mono', monospace",                  label: "Roboto Mono",    importUrl: "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;600;700&display=swap" },
  { value: "'Courier New', monospace",                  label: "Courier New (system)", importUrl: "" },
];

const SECTION_TOGGLES: { key: keyof ReceiptSettings; label: string; description: string }[] = [
  { key: "showLogo",            label: "Logo",             description: "Print shop logo image" },
  { key: "showShopName",        label: "Shop Name",        description: "Shop name text header" },
  { key: "showTagline",         label: "Tagline",          description: "Subtitle below shop name" },
  { key: "showOrderNumber",     label: "Order Number",     description: "Order number badge" },
  { key: "showCustomerAddress", label: "Customer Address", description: "Address line in customer info" },
  { key: "showPaymentMethod",   label: "Payment Method",   description: "Cash / Transfer / QRIS label" },
  { key: "showAmountPaid",      label: "Amount Paid",      description: "How much the customer paid" },
  { key: "showChangeGiven",     label: "Change Given",     description: "Change returned to customer" },
  { key: "showNotes",           label: "Order Notes",      description: "Special instruction block" },
  { key: "showFooter",          label: "Footer",           description: "Thank-you + contact line" },
];

const COLOR_FIELDS: { key: keyof ReceiptSettings; label: string }[] = [
  { key: "accentColor",       label: "Accent (order #, totals)" },
  { key: "accentBgColor",     label: "Order # badge background" },
  { key: "accentBorderColor", label: "Order # badge border" },
  { key: "metaLabelColor",    label: "Meta labels (Date, Phone…)" },
  { key: "notesBgColor",      label: "Notes background" },
  { key: "notesBorderColor",  label: "Notes border" },
  { key: "notesAccentColor",  label: "Notes left accent bar" },
  { key: "notesTextColor",    label: "Notes text" },
  { key: "changeColor",       label: "Change amount" },
  { key: "unpaidColor",       label: "Unpaid warning" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   LIVE RECEIPT PREVIEW (pure HTML string → srcdoc iframe)
   ═══════════════════════════════════════════════════════════════════════════════ */

function buildPreviewHtml(s: ReceiptSettings): string {
  const base = s.baseFontSizePx;
  const sm   = base - 1;
  const xs   = base - 2;
  const lg   = base + 2;
  const xl   = base + 3;

  const fontImport = s.fontImportUrl
    ? `@import url('${s.fontImportUrl}');`
    : "";

  const footerText = s.footerThankYou.replace("{{shopName}}", s.shopName);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  ${fontImport}
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    font-family:${s.fontFamily};
    font-size:${base}px;
    color:#111;
    background:white;
    width:${s.paperWidth};
    padding:${s.paperPadding};
  }
  .dashed{border:none;border-top:1px dashed #aaa;margin:5px 0;}
  .double{border:none;border-top:3px double #333;margin:5px 0;}

  .shop-name{text-align:center;font-size:${lg}px;font-weight:700;letter-spacing:0.08em;margin-bottom:1px;}
  .shop-tagline{text-align:center;font-size:${xs}px;color:${s.metaLabelColor};letter-spacing:0.06em;margin-bottom:4px;}

  .order-num-label{font-size:${xs}px;letter-spacing:0.18em;text-transform:uppercase;color:${s.metaLabelColor};text-align:center;margin-bottom:2px;}
  .order-num{text-align:center;font-size:${lg}px;font-weight:700;letter-spacing:0.12em;padding:4px 0;background:${s.accentBgColor};border:1px solid ${s.accentBorderColor};border-radius:4px;color:${s.accentColor};margin-bottom:4px;}

  .meta{width:100%;border-collapse:collapse;margin-bottom:3px;}
  .meta td{padding:1px 0;font-size:${sm}px;vertical-align:top;}
  .meta .label{color:${s.metaLabelColor};width:34%;}
  .meta .colon{width:5%;}
  .meta .value{font-weight:600;word-break:break-word;}

  table.items{width:100%;border-collapse:collapse;}
  .item-name{font-weight:700;font-size:${base}px;padding:2px 0 1px;}
  .item-detail{font-size:${sm}px;color:#334155;padding:0 0 1px 4px;}
  .item-detail.addon{color:${s.metaLabelColor};}
  .item-price{font-size:${sm}px;text-align:right;color:#334155;vertical-align:top;padding:0 0 1px;white-space:nowrap;}
  .subtotal-label{font-size:${sm}px;font-weight:600;padding:1px 0 3px 4px;color:${s.accentColor};}
  .subtotal-value{font-size:${sm}px;font-weight:700;text-align:right;color:${s.accentColor};padding:1px 0 3px;white-space:nowrap;}

  .total-row{width:100%;border-collapse:collapse;}
  .total-row td{padding:2px 0;}
  .total-label{font-size:${lg}px;font-weight:700;}
  .total-value{font-size:${xl}px;font-weight:700;text-align:right;color:${s.accentColor};white-space:nowrap;}

  .payment-row td{font-size:${sm}px;padding:1px 0;}
  .payment-row .right{text-align:right;font-weight:600;white-space:nowrap;}
  .change td{color:${s.changeColor};font-weight:700;}
  .unpaid td{color:${s.unpaidColor};font-weight:700;font-size:${base}px;}

  .notes-section{margin:2px 0;}
  .notes-header{display:flex;align-items:center;gap:4px;margin-bottom:3px;}
  .notes-icon{font-size:${base + 1}px;line-height:1;}
  .notes-label{font-size:${xs}px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#475569;}
  .notes-box{background:${s.notesBgColor};border:1px solid ${s.notesBorderColor};border-left:3px solid ${s.notesAccentColor};border-radius:3px;padding:4px 6px;font-size:${sm}px;color:${s.notesTextColor};line-height:1.5;word-break:break-word;white-space:pre-wrap;}

  .receipt-footer{text-align:center;margin-top:2px;}
  .footer-thankyou{font-size:${sm}px;font-weight:700;margin-bottom:2px;}
  .footer-contact{font-size:${xs}px;color:${s.metaLabelColor};}
</style>
</head>
<body>

${s.showLogo && s.logoUrl ? `<div style="text-align:center;margin-bottom:4px;"><img src="${s.logoUrl}" alt="${s.logoAlt}" style="max-height:${s.logoMaxHeight};width:auto;display:inline-block;" /></div>` : ""}
${s.showShopName ? `<div class="shop-name">${s.shopName}</div>` : ""}
${s.showTagline  ? `<div class="shop-tagline">${s.shopTagline}</div>` : ""}

<hr class="dashed"/>

${s.showOrderNumber ? `<div class="order-num-label">Order Number</div><div class="order-num">AK-20260406-042</div>` : ""}

<table class="meta">
  <tr><td class="label">Date</td><td class="colon">:</td><td class="value">06 April 2026, 14:32</td></tr>
  <tr><td class="label">Customer</td><td class="colon">:</td><td class="value">Maria Silva</td></tr>
  <tr><td class="label">Phone</td><td class="colon">:</td><td class="value">+670 7712 3456</td></tr>
  ${s.showCustomerAddress ? `<tr><td class="label">Address</td><td class="colon">:</td><td class="value">Rua Formosa, Dili</td></tr>` : ""}
</table>

<hr class="dashed"/>

<table class="items">
  <tr><td colspan="2" class="item-name">Wash & Dry — Regular</td></tr>
  <tr><td class="item-detail">3.5 kg × $3.00/kg</td><td class="item-price">$10.50</td></tr>
  <tr><td class="item-detail addon">+ Soap: Rinso Colour</td><td class="item-price">$1.05</td></tr>
  <tr><td class="item-detail addon">+ Fragrance: Molto Pink</td><td class="item-price">$0.70</td></tr>
  <tr><td class="subtotal-label">Subtotal</td><td class="subtotal-value">$12.25</td></tr>
  <tr><td colspan="2" class="item-divider"></td></tr>

  <tr><td colspan="2" class="item-name">Shoes — Sneakers</td></tr>
  <tr><td class="item-detail">2 pcs × $4.00/pcs</td><td class="item-price">$8.00</td></tr>
  <tr><td class="subtotal-label">Subtotal</td><td class="subtotal-value">$8.00</td></tr>
  <tr><td colspan="2" class="item-divider"></td></tr>
</table>

<hr class="double"/>

<table class="total-row">
  <tr><td class="total-label">TOTAL</td><td class="total-value">$20.25</td></tr>
</table>

<hr class="dashed"/>

<table class="items">
  ${s.showPaymentMethod ? `<tr class="payment-row"><td>Payment Method</td><td class="right">Cash</td></tr>` : ""}
  ${s.showAmountPaid    ? `<tr class="payment-row"><td>Amount Paid</td><td class="right">$25.00</td></tr>` : ""}
  ${s.showChangeGiven   ? `<tr class="payment-row change"><td>Change</td><td class="right">$4.75</td></tr>` : ""}
</table>

${s.showNotes ? `
<hr class="dashed"/>
<div class="notes-section">
  <div class="notes-header">
    <span class="notes-icon">📝</span>
    <span class="notes-label">Special Instructions</span>
  </div>
  <div class="notes-box">Handle the silk shirt with extra care please.</div>
</div>` : ""}

${s.showFooter ? `
<hr class="dashed"/>
<div class="receipt-footer">
  <div class="footer-thankyou">${footerText}</div>
  ${s.footerContact ? `<div class="footer-contact">${s.footerContact}</div>` : ""}
</div>` : ""}

</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function SectionHeader({
  icon: Icon,
  label,
  open,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
        border: "none",
        cursor: "pointer",
        borderBottom: open ? "1.5px solid #e2e8f0" : "none",
      }}
    >
      <Icon size={13} style={{ color: "#1a7fba" }} />
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "#64748b" }}
      >
        {label}
      </span>
      <ChevronDown
        size={13}
        style={{
          color: "#94a3b8",
          marginLeft: "auto",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="text-[10px] font-black uppercase tracking-widest block mb-1"
      style={{ color: "#94a3b8" }}
    >
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  mono = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "7px 10px",
        borderRadius: "6px",
        border: "1.5px solid #e2e8f0",
        fontSize: "12px",
        fontWeight: 600,
        fontFamily: mono ? "'SF Mono','Fira Code',monospace" : "inherit",
        color: "#1e293b",
        background: "#f8fafc",
        outline: "none",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: 72,
          padding: "7px 10px",
          borderRadius: "6px",
          border: "1.5px solid #e2e8f0",
          fontSize: "12px",
          fontWeight: 700,
          color: "#1e293b",
          background: "#f8fafc",
          outline: "none",
          textAlign: "center",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
      />
      {suffix && (
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "7px 10px",
        borderRadius: "6px",
        border: "1.5px solid #e2e8f0",
        fontSize: "12px",
        fontWeight: 600,
        color: "#1e293b",
        background: "#f8fafc",
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: "7px",
        border: `1.5px solid ${checked ? "#b6def5" : "#e2e8f0"}`,
        background: checked ? "#f0f7fd" : "#fafafa",
        cursor: "pointer",
        transition: "all 0.15s",
        textAlign: "left",
      }}
    >
      <div>
        <p style={{ fontSize: "12px", fontWeight: 700, color: checked ? "#0f5a85" : "#475569" }}>
          {label}
        </p>
        <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: 1 }}>
          {description}
        </p>
      </div>
      {checked
        ? <ToggleRight size={20} style={{ color: "#1a7fba", flexShrink: 0 }} />
        : <ToggleLeft  size={20} style={{ color: "#cbd5e1", flexShrink: 0 }} />
      }
    </button>
  );
}

function ColorSwatch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label
        style={{
          position: "relative",
          width: 28,
          height: 28,
          borderRadius: "6px",
          border: "1.5px solid #e2e8f0",
          overflow: "hidden",
          cursor: "pointer",
          flexShrink: 0,
          background: value,
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: "200%",
            height: "200%",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </p>
        <code style={{ fontSize: "9px", color: "#94a3b8" }}>{value}</code>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        style={{
          width: 72,
          padding: "4px 6px",
          borderRadius: "5px",
          border: "1.5px solid #e2e8f0",
          fontSize: "10px",
          fontFamily: "monospace",
          fontWeight: 700,
          color: "#1e293b",
          background: "#f8fafc",
          outline: "none",
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

  // Section collapse state
  const [openSections, setOpenSections] = useState({
    paper: true,
    typography: true,
    header: true,
    colors: false,
    toggles: true,
    footer: true,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Generic field updater
  const update = useCallback(<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  // Font picker — also syncs the importUrl
  const handleFontChange = (fontValue: string) => {
    const opt = FONT_OPTIONS.find((f) => f.value === fontValue);
    setS((prev) => ({
      ...prev,
      fontFamily:    fontValue,
      fontImportUrl: opt?.importUrl ?? "",
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const { id, updatedAt, isActive, ...rest } = s;
      const result = await updateReceiptSettings(id, rest);
      if (!result.success) {
        setError(result.error ?? "Failed to save.");
      } else {
        setSaved(true);
      }
    });
  };

  const previewHtml = buildPreviewHtml(s);

  // ── Paper width numeric stepper (mm) ──────────────────────────────────────
  const paperMm = parseInt(s.paperWidth) || 58;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

      {/* ════════════════════════════════════════════════════════════════════
          LEFT — Controls
          ════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>

        {/* ── Paper ──────────────────────────────────────────────────────── */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <SectionHeader icon={Printer} label="Paper & Layout" open={openSections.paper} onToggle={() => toggleSection("paper")} />
          {openSections.paper && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Paper Width</FieldLabel>
                  <SelectInput
                    value={s.paperWidth}
                    onChange={(v) => update("paperWidth", v)}
                    options={PAPER_WIDTHS}
                  />
                </div>
                <div>
                  <FieldLabel>Custom Width (mm)</FieldLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      value={paperMm}
                      min={40}
                      max={120}
                      onChange={(e) => update("paperWidth", `${e.target.value}mm`)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "1.5px solid #e2e8f0",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        background: "#f8fafc",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>mm</span>
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>Padding (CSS shorthand)</FieldLabel>
                <TextInput
                  value={s.paperPadding}
                  onChange={(v) => update("paperPadding", v)}
                  mono
                  placeholder="3mm 4mm 8mm"
                />
                <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: 3 }}>
                  top · left/right · bottom  —  or all four sides separately
                </p>
              </div>
              <div>
                <FieldLabel>Print Delay (ms)</FieldLabel>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range"
                    min={200}
                    max={3000}
                    step={100}
                    value={s.printDelayMs}
                    onChange={(e) => update("printDelayMs", Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", width: 50, textAlign: "right" }}>
                    {s.printDelayMs} ms
                  </span>
                </div>
                <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: 3 }}>
                  Increase if fonts load slowly on the receipt printer device
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Typography ─────────────────────────────────────────────────── */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <SectionHeader icon={Type} label="Typography" open={openSections.typography} onToggle={() => toggleSection("typography")} />
          {openSections.typography && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <FieldLabel>Font Family</FieldLabel>
                <SelectInput
                  value={s.fontFamily}
                  onChange={handleFontChange}
                  options={FONT_OPTIONS}
                />
              </div>
              <div>
                <FieldLabel>Base Font Size</FieldLabel>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range"
                    min={7}
                    max={14}
                    step={1}
                    value={s.baseFontSizePx}
                    onChange={(e) => update("baseFontSizePx", Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", width: 40, textAlign: "right" }}>
                    {s.baseFontSizePx}px
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  {[7,8,9,10,11,12,13,14].map((n) => (
                    <span
                      key={n}
                      style={{
                        fontSize: "9px",
                        fontWeight: s.baseFontSizePx === n ? 900 : 400,
                        color: s.baseFontSizePx === n ? "#1a7fba" : "#cbd5e1",
                        cursor: "pointer",
                      }}
                      onClick={() => update("baseFontSizePx", n)}
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: 4 }}>
                  All other text sizes scale proportionally from this value
                </p>
              </div>
              <div>
                <FieldLabel>Font Import URL (Google Fonts)</FieldLabel>
                <TextInput
                  value={s.fontImportUrl}
                  onChange={(v) => update("fontImportUrl", v)}
                  mono
                  placeholder="https://fonts.googleapis.com/css2?family=…"
                />
                <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: 3 }}>
                  Auto-filled when using the font picker above. Leave empty for system fonts.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <SectionHeader icon={Receipt} label="Header & Branding" open={openSections.header} onToggle={() => toggleSection("header")} />
          {openSections.header && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Shop Name</FieldLabel>
                  <TextInput value={s.shopName} onChange={(v) => update("shopName", v)} />
                </div>
                <div>
                  <FieldLabel>Tagline</FieldLabel>
                  <TextInput value={s.shopTagline} onChange={(v) => update("shopTagline", v)} />
                </div>
              </div>
              <div>
                <FieldLabel>Logo URL</FieldLabel>
                <TextInput
                  value={s.logoUrl}
                  onChange={(v) => update("logoUrl", v)}
                  mono
                  placeholder="https://res.cloudinary.com/…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Logo Alt Text</FieldLabel>
                  <TextInput value={s.logoAlt} onChange={(v) => update("logoAlt", v)} />
                </div>
                <div>
                  <FieldLabel>Logo Max Height</FieldLabel>
                  <TextInput value={s.logoMaxHeight} onChange={(v) => update("logoMaxHeight", v)} mono placeholder="32px" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Colors ─────────────────────────────────────────────────────── */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <SectionHeader icon={Palette} label="Colors" open={openSections.colors} onToggle={() => toggleSection("colors")} />
          {openSections.colors && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {COLOR_FIELDS.map(({ key, label }) => (
                <ColorSwatch
                  key={key}
                  value={s[key] as string}
                  onChange={(v) => update(key, v)}
                  label={label}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Section Toggles ────────────────────────────────────────────── */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <SectionHeader icon={Layout} label="Show / Hide Sections" open={openSections.toggles} onToggle={() => toggleSection("toggles")} />
          {openSections.toggles && (
            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {SECTION_TOGGLES.map(({ key, label, description }) => (
                <Toggle
                  key={key}
                  checked={s[key] as boolean}
                  onChange={(v) => update(key, v)}
                  label={label}
                  description={description}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <SectionHeader icon={Settings} label="Footer Text" open={openSections.footer} onToggle={() => toggleSection("footer")} />
          {openSections.footer && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <FieldLabel>Thank-you Line</FieldLabel>
                <TextInput
                  value={s.footerThankYou}
                  onChange={(v) => update("footerThankYou", v)}
                  placeholder="Thank you for choosing {{shopName}}!"
                />
                <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: 3 }}>
                  Supports <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 3 }}>{"{{shopName}}"}</code> placeholder
                </p>
              </div>
              <div>
                <FieldLabel>Contact Line</FieldLabel>
                <TextInput
                  value={s.footerContact}
                  onChange={(v) => update("footerContact", v)}
                  placeholder="📞 +670 7675 8 7380  ·  akirolaundry.com"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "6px", padding: "8px 12px" }}>
            <p className="text-xs font-semibold" style={{ color: "#be123c" }}>{error}</p>
          </div>
        )}

        {/* ── Save button ────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 font-black text-sm text-white transition-all duration-150 active:scale-[0.97]"
          style={{
            height: 48,
            borderRadius: "7px",
            background: isPending
              ? "#94a3b8"
              : "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.35)",
            border: "none",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={14} /> Saved!</>
          ) : (
            <><Save size={14} /> Save Receipt Settings</>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT — Live thermal receipt preview
          ════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          position: "sticky",
          top: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "white",
            borderRadius: "8px 8px 0 0",
            border: "1.5px solid #e2e8f0",
            borderBottom: "none",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Eye size={13} style={{ color: "#1a7fba" }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
            Live Preview
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "10px",
              fontWeight: 700,
              color: "#94a3b8",
              background: "#f1f5f9",
              padding: "2px 8px",
              borderRadius: 20,
            }}
          >
            {s.paperWidth} · {s.baseFontSizePx}px
          </span>
        </div>

        {/* Receipt paper environment */}
        <div
          style={{
            background: "#e8e8e8",
            border: "1.5px solid #e2e8f0",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: "20px 0",
            display: "flex",
            justifyContent: "center",
            minHeight: 500,
            overflowY: "auto",
          }}
        >
          {/* Tape effect at top */}
          <div style={{ position: "relative", width: "fit-content" }}>
            <div
              style={{
                position: "absolute",
                top: -8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 60,
                height: 16,
                background: "rgba(200,200,180,0.7)",
                borderRadius: 2,
                zIndex: 1,
              }}
            />

            {/* Shadow under paper */}
            <div
              style={{
                position: "absolute",
                bottom: -6,
                left: 4,
                right: -4,
                height: "100%",
                background: "rgba(0,0,0,0.12)",
                borderRadius: 2,
                filter: "blur(4px)",
              }}
            />

            {/* The receipt paper itself — iframe for live HTML */}
            <iframe
              key={previewHtml}          // re-mount on change so srcdoc updates reliably
              srcDoc={previewHtml}
              title="Receipt Preview"
              sandbox="allow-same-origin"
              scrolling="no"
              style={{
                border: "none",
                display: "block",
                width: s.paperWidth,
                minHeight: 200,
                height: "auto",
                background: "white",
                position: "relative",
                zIndex: 0,
              }}
              onLoad={(e) => {
                // Auto-resize iframe to content height
                const iframe = e.currentTarget;
                try {
                  const body = iframe.contentDocument?.body;
                  if (body) {
                    iframe.style.height = body.scrollHeight + "px";
                  }
                } catch {}
              }}
            />

            {/* Tear edge at bottom */}
            <div
              style={{
                height: 12,
                background: "white",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <svg
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%", display: "block" }}
              >
                <path
                  d="M0,0 L10,10 L20,2 L30,9 L40,3 L50,11 L60,4 L70,10 L80,2 L90,8 L100,1 L110,9 L120,3 L130,11 L140,5 L150,10 L160,2 L170,8 L180,4 L190,11 L200,0 Z"
                  fill="#e8e8e8"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Info pill */}
        <p
          className="text-center mt-2"
          style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}
        >
          Preview updates live as you edit
        </p>
      </div>
    </div>
  );
}