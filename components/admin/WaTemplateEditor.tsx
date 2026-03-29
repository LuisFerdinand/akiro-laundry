/* eslint-disable react-hooks/immutability */
// components/admin/WaTemplateEditor.tsx
"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import {
  Save, CheckCircle2, Loader2, MessageCircle,
  Bold, Italic, Strikethrough, Code, Variable,
  Eye, EyeOff, Smartphone, ChevronDown, Type,
  Settings, Info, Undo2, RotateCcw,
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
  { token: "{{customerName}}",    label: "Customer Name",   sample: "Maria Silva"        },
  { token: "{{orderNumber}}",     label: "Order Number",    sample: "AK-20260329-001"    },
  { token: "{{servicesSummary}}", label: "Services",        sample: "Wash & Dry, Shoes"  },
  { token: "{{statusLabel}}",     label: "Status Label",    sample: "Remata ona"         },
  { token: "{{totalPrice}}",      label: "Total Price",     sample: "$12.50"             },
  { token: "{{reviewUrl}}",       label: "Review URL",      sample: "https://akirolaundry.com/review" },
  { token: "{{businessName}}",    label: "Business Name",   sample: "Akiro Laundry"      },
  { token: "{{businessPhone}}",   label: "Business Phone",  sample: "+670 7675 8 7380"   },
  { token: "{{businessUrl}}",     label: "Business URL",    sample: "akirolaundry.com"   },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS — assemble / disassemble the full message from DB fields
   ═══════════════════════════════════════════════════════════════════════════════ */

function assembleFullMessage(
  settings: WaTemplateSettings,
  statusBody: string,
  includeNotes: boolean,
): string {
  const sep = settings.separator;
  const lines: string[] = [
    settings.greetingTemplate,
    sep,
    "",
    settings.orderDetailHeader,
    sep,
    "📌 *N.º Pedidu:*  {{orderNumber}}",
    "👕 *Servisu:*     {{servicesSummary}}",
    "📦 *Status:*      *{{statusLabel}}*",
    "💰 *Total:*       {{totalPrice}}",
    "{{paymentLine}}",
    sep,
    "",
    statusBody,
  ];

  if (includeNotes) {
    lines.push("", sep, settings.notesSectionHeader, sep, "{{notes}}");
  }

  lines.push("", sep, settings.footerTemplate, "", sep, settings.reviewCtaTemplate);

  return lines.join("\n");
}

function interpolatePreview(text: string, settings: WaTemplateSettings): string {
  let out = text;
  for (const v of VARIABLES) {
    out = out.replaceAll(v.token, v.sample);
  }
  // Payment line preview
  out = out.replaceAll(
    "{{paymentLine}}",
    settings.paymentUnpaidTemplate.replaceAll("{{totalPrice}}", "$12.50"),
  );
  out = out.replaceAll("{{notes}}", "Handle ropa ne'e ho kuidadu.");
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
   DISASSEMBLE — parse edited full message back into DB fields
   ═══════════════════════════════════════════════════════════════════════════════ */

interface DisassembledFields {
  greetingTemplate:    string;
  orderDetailHeader:   string;
  footerTemplate:      string;
  reviewCtaTemplate:   string;
  notesSectionHeader:  string;
  separator:           string;
  statusBody:          string;
}

function disassembleMessage(
  fullText: string,
  originalSettings: WaTemplateSettings,
): DisassembledFields {
  const sep = originalSettings.separator;
  const sections = fullText.split(sep);

  // Default fallback = keep original values
  const result: DisassembledFields = {
    greetingTemplate:   originalSettings.greetingTemplate,
    orderDetailHeader:  originalSettings.orderDetailHeader,
    footerTemplate:     originalSettings.footerTemplate,
    reviewCtaTemplate:  originalSettings.reviewCtaTemplate,
    notesSectionHeader: originalSettings.notesSectionHeader,
    separator:          sep,
    statusBody:         "",
  };

  if (sections.length < 4) {
    // Can't reliably parse — treat entire text as status body
    result.statusBody = fullText;
    return result;
  }

  // Section 0: greeting
  result.greetingTemplate = sections[0].trim();

  // Section 1: order detail header + detail lines + payment line
  const detailBlock = sections[1].trim();
  const detailLines = detailBlock.split("\n").filter((l) => l.trim());
  if (detailLines.length > 0) {
    // First non-empty line is the header
    result.orderDetailHeader = detailLines[0].trim();
  }

  // Section 2: status body (everything between detail block separator and notes/footer)
  result.statusBody = sections[2].trim();

  // Find notes section header if present
  const notesSectionIdx = sections.findIndex(
    (s) => s.trim().startsWith(originalSettings.notesSectionHeader.trim().substring(0, 5)),
  );

  // Last two sections: footer and review CTA
  const lastSections = sections.slice(-2);
  if (lastSections.length >= 2) {
    result.reviewCtaTemplate = lastSections[1].trim();
    result.footerTemplate = lastSections[0].trim();
  } else if (lastSections.length === 1) {
    result.footerTemplate = lastSections[0].trim();
  }

  return result;
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
        width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "6px",
        border: active ? "1.5px solid #1a7fba" : "1.5px solid transparent",
        background: active ? "#edf7fd" : "transparent",
        color: active ? "#1a7fba" : "#64748b",
        cursor: "pointer",
        transition: "all 0.12s",
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
      <Icon size={14} />
    </button>
  );
}

/** Divider line in toolbar */
function ToolDivider() {
  return <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 2px" }} />;
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

  // ── Settings state (for business info & payment templates) ────────────────
  const [settings, setSettings] = useState<WaTemplateSettings>({ ...initialSettings });

  // ── Status body templates ─────────────────────────────────────────────────
  const [statusBodies, setStatusBodies] = useState<Record<StatusValue, string>>(() => {
    const map = {} as Record<StatusValue, string>;
    for (const t of initialStatusTemplates) {
      map[t.status] = t.bodyTemplate;
    }
    return map;
  });

  // ── Full message text per status ──────────────────────────────────────────
  const [messageTexts, setMessageTexts] = useState<Record<StatusValue, string>>(() => {
    const map = {} as Record<StatusValue, string>;
    for (const t of initialStatusTemplates) {
      map[t.status] = assembleFullMessage(settings, t.bodyTemplate, true);
    }
    return map;
  });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showPreview, setShowPreview]     = useState(true);
  const [showVarMenu, setShowVarMenu]     = useState(false);
  const [showBizPanel, setShowBizPanel]   = useState(false);
  const [isPending, startTransition]      = useTransition();
  const [saved, setSaved]                 = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const varMenuRef  = useRef<HTMLDivElement>(null);

  // Current message text
  const currentText = messageTexts[activeStatus] ?? "";

  // ── Close variable menu on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (varMenuRef.current && !varMenuRef.current.contains(e.target as Node)) {
        setShowVarMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Text manipulation helpers ─────────────────────────────────────────────
  const wrapSelection = useCallback((before: string, after: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const text  = ta.value;
    const selected = text.substring(start, end);

    // If already wrapped, unwrap
    const beforeMatch = text.substring(Math.max(0, start - before.length), start);
    const afterMatch  = text.substring(end, end + after.length);
    if (beforeMatch === before && afterMatch === after) {
      const newText = text.substring(0, start - before.length) + selected + text.substring(end + after.length);
      updateCurrentText(newText);
      requestAnimationFrame(() => {
        ta.selectionStart = start - before.length;
        ta.selectionEnd   = end - before.length;
        ta.focus();
      });
      return;
    }

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    updateCurrentText(newText);
    requestAnimationFrame(() => {
      ta.selectionStart = start + before.length;
      ta.selectionEnd   = end + before.length;
      ta.focus();
    });
  }, [activeStatus]);

  const insertAtCursor = useCallback((insert: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start   = ta.selectionStart;
    const text    = ta.value;
    const newText = text.substring(0, start) + insert + text.substring(start);
    updateCurrentText(newText);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + insert.length;
      ta.focus();
    });
  }, [activeStatus]);

  const updateCurrentText = (newText: string) => {
    setMessageTexts((prev) => ({ ...prev, [activeStatus]: newText }));
    setSaved(false);
  };

  const updateSetting = <K extends keyof WaTemplateSettings>(key: K, value: WaTemplateSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // ── Reset current status template ─────────────────────────────────────────
  const handleReset = () => {
    const originalBody = initialStatusTemplates.find((t) => t.status === activeStatus)?.bodyTemplate ?? "";
    const fullMsg = assembleFullMessage(initialSettings, originalBody, true);
    setMessageTexts((prev) => ({ ...prev, [activeStatus]: fullMsg }));
    setSaved(false);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      wrapSelection("*", "*");
    } else if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      wrapSelection("_", "_");
    } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      // Disassemble each status message back into fields
      // We use the first status' disassembly for shared fields (greeting, footer, etc.)
      const firstStatus = STATUS_TABS[0].value;
      const firstDisassembled = disassembleMessage(messageTexts[firstStatus], initialSettings);

      // Update settings
      const settingsResult = await updateWaTemplateSettings(settings.id, {
        businessName:        settings.businessName,
        businessPhone:       settings.businessPhone,
        businessUrl:         settings.businessUrl,
        greetingTemplate:    firstDisassembled.greetingTemplate,
        orderDetailHeader:   firstDisassembled.orderDetailHeader,
        footerTemplate:      firstDisassembled.footerTemplate,
        reviewCtaTemplate:   firstDisassembled.reviewCtaTemplate,
        notesSectionHeader:  firstDisassembled.notesSectionHeader,
        separator:           firstDisassembled.separator,
        paymentPaidTemplate:   settings.paymentPaidTemplate,
        paymentUnpaidTemplate: settings.paymentUnpaidTemplate,
      });

      if (!settingsResult.success) {
        setError(settingsResult.error ?? "Failed to save settings.");
        return;
      }

      // Update each status body
      for (const t of initialStatusTemplates) {
        const disassembled = disassembleMessage(messageTexts[t.status], initialSettings);
        const body = disassembled.statusBody;
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

  // ── Preview HTML ──────────────────────────────────────────────────────────
  const previewHtml = waToHtml(interpolatePreview(currentText, settings));

  return (
    <div className="space-y-3">
      {/* ── Business info collapsible ─────────────────────────────────────── */}
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          border: "1.5px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setShowBizPanel(!showBizPanel)}
          style={{
            width: "100%",
            padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Settings size={13} style={{ color: "#1a7fba" }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
            Business Info & Payment Templates
          </span>
          <ChevronDown
            size={13}
            style={{
              color: "#94a3b8",
              marginLeft: "auto",
              transform: showBizPanel ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>

        {showBizPanel && (
          <div style={{ padding: 16, borderTop: "1.5px solid #e2e8f0" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
              {([
                ["paymentPaidTemplate",   "Payment Paid Text"],
                ["paymentUnpaidTemplate", "Payment Unpaid Text"],
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
                      border: "1.5px solid #e2e8f0", fontSize: "12px", fontWeight: 600,
                      fontFamily: "monospace",
                      color: "#1e293b", background: "#f8fafc", outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Status tabs ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", gap: 4,
          background: "#f1f5f9",
          borderRadius: "8px",
          padding: 4,
        }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              style={{
                flex: 1,
                padding: "8px 4px",
                borderRadius: "6px",
                border: "none",
                background: isActive ? "white" : "transparent",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: "13px" }}>{tab.emoji}</span>
              <span
                className="text-[10px] font-black uppercase tracking-wide"
                style={{ color: isActive ? "#1e293b" : "#94a3b8" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Editor + Preview layout ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* ── Editor panel ─────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: "white",
            borderRadius: "8px",
            border: "1.5px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 2,
              padding: "6px 10px",
              borderBottom: "1.5px solid #e2e8f0",
              background: "#fafbfc",
              flexWrap: "wrap",
            }}
          >
            <ToolBtn icon={Bold}          label="Bold (*text*) — Ctrl+B" onClick={() => wrapSelection("*", "*")} />
            <ToolBtn icon={Italic}        label="Italic (_text_) — Ctrl+I" onClick={() => wrapSelection("_", "_")} />
            <ToolBtn icon={Strikethrough} label="Strikethrough (~text~)" onClick={() => wrapSelection("~", "~")} />
            <ToolBtn icon={Code}          label="Monospace (`text`)" onClick={() => wrapSelection("`", "`")} />

            <ToolDivider />

            {/* Variable dropdown */}
            <div style={{ position: "relative" }} ref={varMenuRef}>
              <button
                type="button"
                onClick={() => setShowVarMenu(!showVarMenu)}
                style={{
                  height: 32, padding: "0 10px",
                  display: "flex", alignItems: "center", gap: 4,
                  borderRadius: "6px",
                  border: showVarMenu ? "1.5px solid #1a7fba" : "1.5px solid transparent",
                  background: showVarMenu ? "#edf7fd" : "transparent",
                  color: showVarMenu ? "#1a7fba" : "#64748b",
                  fontSize: "11px", fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                <Variable size={13} />
                Insert Variable
                <ChevronDown size={11} style={{ transform: showVarMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>

              {showVarMenu && (
                <div
                  style={{
                    position: "absolute", top: "100%", left: 0, zIndex: 50,
                    marginTop: 4, minWidth: 260,
                    background: "white",
                    borderRadius: "8px",
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                  }}
                >
                  {VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => {
                        insertAtCursor(v.token);
                        setShowVarMenu(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        border: "none",
                        background: "white",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>{v.label}</span>
                      <code style={{
                        fontSize: "10px", fontWeight: 700, color: "#1a7fba",
                        background: "#edf7fd", padding: "2px 6px", borderRadius: "4px",
                      }}>
                        {v.token}
                      </code>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ToolDivider />

            <ToolBtn
              icon={RotateCcw}
              label="Reset to default"
              onClick={handleReset}
            />

            {/* Preview toggle — push right */}
            <div style={{ marginLeft: "auto" }}>
              <ToolBtn
                icon={showPreview ? EyeOff : Eye}
                label={showPreview ? "Hide preview" : "Show preview"}
                onClick={() => setShowPreview(!showPreview)}
                active={showPreview}
              />
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={(e) => updateCurrentText(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 480,
              padding: "16px",
              border: "none",
              outline: "none",
              resize: "vertical",
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: "12.5px",
              lineHeight: "1.7",
              color: "#1e293b",
              background: "white",
            }}
          />

          {/* Footer hint */}
          <div
            style={{
              padding: "6px 12px",
              borderTop: "1.5px solid #f1f5f9",
              background: "#fafbfc",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>
              WhatsApp formatting: *bold* · _italic_ · ~strike~ · `mono` · Ctrl+B / Ctrl+I / Ctrl+S
            </span>
            <span style={{ fontSize: "10px", color: "#cbd5e1", fontWeight: 600 }}>
              {currentText.length} chars
            </span>
          </div>
        </div>

        {/* ── Phone preview ────────────────────────────────────────────────── */}
        {showPreview && (
          <div
            style={{
              width: 320,
              flexShrink: 0,
              position: "sticky",
              top: 16,
            }}
          >
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
                <div style={{
                  width: 80, height: 6, borderRadius: 3,
                  background: "#334155",
                }} />
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
                  maxHeight: 520,
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
                  <p style={{
                    fontSize: "9px", color: "#7a8e7a",
                    textAlign: "right", marginTop: 4,
                  }}>
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
          <><Save size={14} /> Save All Templates</>
        )}
      </button>
    </div>
  );
}