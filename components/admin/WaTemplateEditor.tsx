// components/admin/WaTemplateEditor.tsx
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Save, CheckCircle2, Loader2,
  Bold, Italic, Strikethrough, Code, Variable,
  Eye, EyeOff, ChevronDown,
  Settings, RotateCcw,
} from "lucide-react";
import {
  updateWaTemplateSettings,
  updateWaStatusTemplate,
} from "@/lib/actions/wa-templates";
import type {
  WaTemplateSettings,
  WaStatusTemplate,
} from "@/lib/db/schema/whatsapp";
import type { Order } from "@/lib/db/schema";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

type StatusValue = Order["status"];

const STATUS_TABS: { value: StatusValue; label: string; emoji: string }[] = [
  { value: "pending",    label: "Pending",    emoji: "📋" },
  { value: "processing", label: "Processing", emoji: "🫧" },
  { value: "done",       label: "Done",       emoji: "✅" },
  { value: "picked_up",  label: "Picked Up",  emoji: "🎉" },
];

const VARIABLES: { token: string; label: string; sample: string }[] = [
  { token: "{{greeting}}",        label: "Time-of-day Greeting", sample: "Bondia"        },
  { token: "{{customerName}}",    label: "Customer Name",   sample: "Maria Silva"        },
  { token: "{{orderNumber}}",     label: "Order Number",    sample: "AK-20260329-001"    },
  { token: "{{servicesSummary}}", label: "Services",        sample: "Wash & Dry, Shoes"  },
  { token: "{{statusLabel}}",     label: "Status Label",    sample: "Remata ona"         },
  { token: "{{totalPrice}}",      label: "Total Price",     sample: "$12.50"             },
  { token: "{{paymentLine}}",     label: "Payment Line",    sample: "✅ *Pagamentu:* Kompletu ona" },
  { token: "{{notes}}",           label: "Order Notes",     sample: "Handle ropa ne'e ho kuidadu." },
  { token: "{{reviewUrl}}",       label: "Review URL",      sample: "https://akirolaundry.com/review" },
  { token: "{{businessName}}",    label: "Business Name",   sample: "Akiro Laundry"      },
  { token: "{{businessPhone}}",   label: "Business Phone",  sample: "+670 7675 8 7380"   },
  { token: "{{businessUrl}}",     label: "Business URL",    sample: "akirolaundry.com"   },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Substitutes every known token with a representative sample value, for the live preview only. */
function interpolatePreview(text: string, settings: WaTemplateSettings): string {
  let out = text;
  for (const v of VARIABLES) {
    if (v.token === "{{paymentLine}}") continue; // handled below (depends on settings)
    out = out.replaceAll(v.token, v.sample);
  }
  out = out.replaceAll(
    "{{paymentLine}}",
    settings.paymentUnpaidTemplate.replaceAll("{{totalPrice}}", "$12.50"),
  );
  return out;
}

/** Convert WhatsApp markdown to HTML for preview */
function waToHtml(text: string): string {
  return text
    // Bold: *text*
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    // Italic: _text_
    .replace(/_(.*?)_/g, "<em>$1</em>")
    // Strikethrough: ~text~
    .replace(/~(.*?)~/g, "<del>$1</del>")
    // Monospace: `text`
    .replace(/`(.*?)`/g, '<code style="background:#e2e8f0;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
    // Newlines
    .replace(/\n/g, "<br/>");
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Toolbar button */
function ToolBtn({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      style={{
        width: 28, height: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "6px",
        border: active ? "1.5px solid #1a7fba" : "1.5px solid transparent",
        background: active ? "#edf7fd" : "transparent",
        color: active ? "#1a7fba" : "#64748b",
        cursor: "pointer",
        transition: "all 0.12s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#f1f5f9";
          e.currentTarget.style.color = "#334155";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#64748b";
        }
      }}
    >
      <Icon size={13} />
    </button>
  );
}

/**
 * A single editable template field — its own Bold/Italic/Strike/Mono formatting
 * toolbar + variable inserter, bound directly to one DB field. No assembling or
 * parsing: what you type here is exactly what gets saved.
 */
function FormattableField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  extra,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  /** Extra node rendered in the field header, right-aligned before the toolbar (e.g. a Reset button). */
  extra?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const varMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (varMenuRef.current && !varMenuRef.current.contains(e.target as Node)) {
        setShowVarMenu(false);
      }
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
    else if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSelection("_", "_"); }
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
          {extra}
          <ToolBtn icon={Bold}          label="Bold (*text*) — Ctrl+B"   onClick={() => wrapSelection("*", "*")} />
          <ToolBtn icon={Italic}        label="Italic (_text_) — Ctrl+I" onClick={() => wrapSelection("_", "_")} />
          <ToolBtn icon={Strikethrough} label="Strikethrough (~text~)"   onClick={() => wrapSelection("~", "~")} />
          <ToolBtn icon={Code}          label="Monospace (`text`)"       onClick={() => wrapSelection("`", "`")} />
          <div style={{ position: "relative" }} ref={varMenuRef}>
            <ToolBtn icon={Variable} label="Insert variable" active={showVarMenu} onClick={() => setShowVarMenu((v) => !v)} />
            {showVarMenu && (
              <div
                style={{
                  position: "absolute", top: "100%", right: 0, zIndex: 50,
                  marginTop: 4, minWidth: 230,
                  background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden",
                  maxHeight: 300, overflowY: "auto",
                }}
              >
                {VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => { insertAtCursor(v.token); setShowVarMenu(false); }}
                    style={{
                      width: "100%", padding: "7px 10px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      border: "none", background: "white", cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9", transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155" }}>{v.label}</span>
                    <code style={{ fontSize: "9px", fontWeight: 700, color: "#1a7fba", background: "#edf7fd", padding: "2px 5px", borderRadius: "4px" }}>
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

interface WaTemplateEditorProps {
  settings:        WaTemplateSettings;
  statusTemplates: WaStatusTemplate[];
}

export function WaTemplateEditor({
  settings: initialSettings,
  statusTemplates: initialStatusTemplates,
}: WaTemplateEditorProps) {
  // ── Active status tab ─────────────────────────────────────────────────────
  const [activeStatus, setActiveStatus] = useState<StatusValue>("pending");

  // ── Settings state — only business info + payment-line variables live here ─
  const [settings, setSettings] = useState<WaTemplateSettings>({ ...initialSettings });

  // ── Status body templates — ONE plain message per status, nothing else ────
  const [statusBodies, setStatusBodies] = useState<Record<StatusValue, string>>(() => {
    const map = {} as Record<StatusValue, string>;
    for (const t of initialStatusTemplates) {
      map[t.status] = t.bodyTemplate;
    }
    return map;
  });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showPreview, setShowPreview]     = useState(true);
  const [showBizPanel, setShowBizPanel]   = useState(false);
  const [isPending, startTransition]      = useTransition();
  const [saved, setSaved]                 = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const updateSetting = <K extends keyof WaTemplateSettings>(key: K, value: WaTemplateSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateStatusBody = (value: string) => {
    setStatusBodies((prev) => ({ ...prev, [activeStatus]: value }));
    setSaved(false);
  };

  // ── Reset current status message back to what's saved in the DB ───────────
  const handleResetStatusBody = () => {
    const originalBody = initialStatusTemplates.find((t) => t.status === activeStatus)?.bodyTemplate ?? "";
    setStatusBodies((prev) => ({ ...prev, [activeStatus]: originalBody }));
    setSaved(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const settingsResult = await updateWaTemplateSettings(settings.id, {
        businessName:          settings.businessName,
        businessPhone:         settings.businessPhone,
        businessUrl:           settings.businessUrl,
        paymentPaidTemplate:   settings.paymentPaidTemplate,
        paymentUnpaidTemplate: settings.paymentUnpaidTemplate,
        greetingMorning:       settings.greetingMorning,
        greetingAfternoon:     settings.greetingAfternoon,
        greetingEvening:       settings.greetingEvening,
      });

      if (!settingsResult.success) {
        setError(settingsResult.error ?? "Failed to save settings.");
        return;
      }

      for (const t of initialStatusTemplates) {
        const body = statusBodies[t.status] ?? "";
        if (body !== t.bodyTemplate) {
          const result = await updateWaStatusTemplate(t.id, body);
          if (!result.success) {
            setError(result.error ?? `Failed to save ${t.status} template.`);
            return;
          }
        }
      }

      setSaved(true);
    });
  };

  // ── Preview — exactly what gets sent, nothing else attached ───────────────
  const previewText = interpolatePreview(statusBodies[activeStatus] ?? "", settings);
  const previewHtml = waToHtml(previewText || "( empty message )");

  return (
    <div className="space-y-3">
      {/* ── Business info / variables collapsible ──────────────────────────── */}
      <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setShowBizPanel(!showBizPanel)}
          style={{
            width: "100%", padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            border: "none", cursor: "pointer",
          }}
        >
          <Settings size={13} style={{ color: "#1a7fba" }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
            Optional Variables (business info & payment line)
          </span>
          <ChevronDown
            size={13}
            style={{
              color: "#94a3b8", marginLeft: "auto",
              transform: showBizPanel ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>

        {showBizPanel && (
          <div style={{ padding: 16, borderTop: "1.5px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>
              These aren&apos;t appended to any message automatically — they only appear if you insert
              their variable token (e.g. <code>{"{{businessName}}"}</code>) into a status message yourself.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ["businessName",  "Business Name"],
                ["businessPhone", "Phone"],
                ["businessUrl",   "Website"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: "#94a3b8" }}>
                    {label}
                  </label>
                  <input
                    value={settings[key]}
                    onChange={(e) => updateSetting(key, e.target.value)}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: "6px",
                      border: "1.5px solid #e2e8f0", fontSize: "13px", fontWeight: 600,
                      color: "#1e293b", background: "#f8fafc", outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormattableField
                label="Payment Line — Paid"
                value={settings.paymentPaidTemplate}
                onChange={(v) => updateSetting("paymentPaidTemplate", v)}
                rows={2}
              />
              <FormattableField
                label="Payment Line — Unpaid"
                value={settings.paymentUnpaidTemplate}
                onChange={(v) => updateSetting("paymentUnpaidTemplate", v)}
                rows={2}
              />
            </div>

            <div>
              <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "10px" }}>
                <code style={{ fontSize: "10px" }}>{"{{greeting}}"}</code> is auto-picked at send time based
                on the employee&apos;s local clock — morning 05:00–11:59, afternoon 12:00–17:59, evening 18:00–04:59.
                Customise the text for each below.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  ["greetingMorning",   "Morning (05:00–11:59)"],
                  ["greetingAfternoon", "Afternoon (12:00–17:59)"],
                  ["greetingEvening",   "Evening (18:00–04:59)"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: "#94a3b8" }}>
                      {label}
                    </label>
                    <input
                      value={settings[key]}
                      onChange={(e) => updateSetting(key, e.target.value)}
                      style={{
                        width: "100%", padding: "7px 10px", borderRadius: "6px",
                        border: "1.5px solid #e2e8f0", fontSize: "13px", fontWeight: 600,
                        color: "#1e293b", background: "#f8fafc", outline: "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Editor + Preview layout ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* ── Editor panel ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>

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

          {/* ── Status tabs ───────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: "8px", padding: 4 }}>
            {STATUS_TABS.map((tab) => {
              const isActive = activeStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveStatus(tab.value)}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: "6px", border: "none",
                    background: isActive ? "white" : "transparent",
                    boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}
                >
                  <span style={{ fontSize: "13px" }}>{tab.emoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: isActive ? "#1e293b" : "#94a3b8" }}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* The ONE message for this status — exactly what gets sent, verbatim */}
          <FormattableField
            key={activeStatus}
            label={`Message — ${STATUS_TABS.find((t) => t.value === activeStatus)?.label}`}
            value={statusBodies[activeStatus] ?? ""}
            onChange={updateStatusBody}
            rows={10}
            placeholder="Type the exact message customers will receive for this status. Leave empty to send nothing."
            extra={
              <ToolBtn icon={RotateCcw} label="Reset to saved value" onClick={handleResetStatusBody} />
            }
          />

          <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>
            This is the entire message — nothing is added before or after it. WhatsApp formatting:
            *bold* · _italic_ · ~strike~ · `mono` · Ctrl+B / Ctrl+I.
          </p>
        </div>

        {/* ── Phone preview ────────────────────────────────────────────────── */}
        {showPreview && (
          <div style={{ width: 320, flexShrink: 0, position: "sticky", top: 16 }}>
            {/* Phone frame */}
            <div
              style={{
                borderRadius: "24px",
                background: "#1e293b",
                padding: "12px 8px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              {/* Notch */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <div style={{ width: 80, height: 6, borderRadius: 3, background: "#334155" }} />
              </div>

              {/* WhatsApp header */}
              <div
                style={{
                  background: "#075e54",
                  borderRadius: "12px 12px 0 0",
                  padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "#128c7e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 800, color: "white",
                  }}
                >
                  M
                </div>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>Maria Silva</p>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)" }}>online</p>
                </div>
              </div>

              {/* Chat area */}
              <div
                style={{
                  background: "#ece5dd",
                  minHeight: 400,
                  maxHeight: 620,
                  overflowY: "auto",
                  padding: "12px 8px",
                  borderRadius: "0 0 12px 12px",
                }}
              >
                {/* Message bubble */}
                <div
                  style={{
                    background: "#dcf8c6",
                    borderRadius: "0 8px 8px 8px",
                    padding: "8px 10px",
                    maxWidth: "92%",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12.5px",
                      lineHeight: "1.55",
                      color: "#1a1a1a",
                      wordBreak: "break-word",
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                  <p style={{ fontSize: "9px", color: "#7a8e7a", textAlign: "right", marginTop: 4 }}>
                    14:32 ✓✓
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center mt-2" style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>
              Live Preview
            </p>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "6px", padding: "8px 12px" }}>
          <p className="text-xs font-semibold" style={{ color: "#be123c" }}>{error}</p>
        </div>
      )}

      {/* ── Save button ───────────────────────────────────────────────────── */}
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
          boxShadow: isPending
            ? "none"
            : "0 4px 14px rgba(26,127,186,0.35)",
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
          <><Save size={14} /> Save All Messages</>
        )}
      </button>
    </div>
  );
}
