// components/admin/cms/forms/CmsFormPrimitives.tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { uploadImage } from "@/lib/actions/cms/upload.actions";

// ─── Shared style base ────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid hsl(210 20% 88%)", borderRadius: "10px",
  fontSize: "13px", fontWeight: 500, background: "white",
  color: "hsl(215 25% 15%)", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: "Nunito, sans-serif",
};

function focusStyle(el: HTMLElement) {
  el.style.borderColor = "#1a7fba";
  el.style.boxShadow   = "0 0 0 3px rgba(26,127,186,0.12)";
}
function blurStyle(el: HTMLElement) {
  el.style.borderColor = "hsl(210 20% 88%)";
  el.style.boxShadow   = "none";
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px", fontFamily: "Sora, sans-serif" }}>
      {children}
    </label>
  );
}

// ─── TextInput ────────────────────────────────────────────────────────────────

export function TextInput({ value, onChange, placeholder, hint, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <div>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={inputBase}
        onFocus={(e) => focusStyle(e.target)} onBlur={(e) => blurStyle(e.target)}
      />
      {hint && <p style={{ fontSize: "11px", color: "#8ca0b0", marginTop: "4px", fontWeight: 500 }}>{hint}</p>}
    </div>
  );
}

// ─── TextArea ─────────────────────────────────────────────────────────────────

export function TextArea({ value, onChange, placeholder, rows = 3, hint }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ ...inputBase, resize: "vertical", lineHeight: 1.6 }}
        onFocus={(e) => focusStyle(e.target)} onBlur={(e) => blurStyle(e.target)}
      />
      {hint && <p style={{ fontSize: "11px", color: "#8ca0b0", marginTop: "4px", fontWeight: 500 }}>{hint}</p>}
    </div>
  );
}

// ─── ColorInput — swatch picker + hex field ───────────────────────────────────

const BRAND_SWATCHES = [
  "#1a7fba", "#2496d6", "#0f5a85",
  "#3ecb9a", "#10b981", "#0d9488",
  "#8b5cf6", "#6366f1", "#a855f7",
  "#ec4899", "#f59e0b", "#d97706",
  "#ef4444", "#0a1f2e", "#ffffff",
];

export function ColorInput({ value, onChange, label }: {
  value: string; onChange: (v: string) => void; label?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Swatch row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {BRAND_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            title={swatch}
            style={{
              width: "26px", height: "26px", borderRadius: "8px",
              background: swatch, border: "none", cursor: "pointer", padding: 0,
              outline: value === swatch ? "2.5px solid #1a7fba" : "2px solid transparent",
              outlineOffset: "2px",
              boxShadow: swatch === "#ffffff" ? "inset 0 0 0 1px hsl(210 20% 88%)" : undefined,
              transition: "outline 0.1s, transform 0.1s",
              transform: value === swatch ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Hex input + native colour picker */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "38px", height: "38px", padding: "3px",
            border: "1.5px solid hsl(210 20% 88%)", borderRadius: "10px",
            cursor: "pointer", background: "white", flexShrink: 0,
          }}
        />
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="#1a7fba" maxLength={7}
          style={{ ...inputBase, width: "120px", fontFamily: "monospace", fontSize: "13px" }}
          onFocus={(e) => focusStyle(e.target)} onBlur={(e) => blurStyle(e.target)}
        />
        {/* Live preview chip */}
        <div style={{
          flex: 1, height: "38px", borderRadius: "10px",
          background: value, border: "1.5px solid hsl(210 20% 88%)",
          boxShadow: value === "#ffffff" ? "inset 0 0 0 1px hsl(210 20% 85%)" : undefined,
        }} />
        {label && <span style={{ fontSize: "12px", color: "#8ca0b0", fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>}
      </div>
    </div>
  );
}

// ─── SelectInput ──────────────────────────────────────────────────────────────

export function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inputBase, cursor: "pointer" }}
      onFocus={(e) => focusStyle(e.target)} onBlur={(e) => blurStyle(e.target)}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── ImageUploadField — drag-drop + click, uploads to Cloudinary ──────────────

export function ImageUploadField({
  value,
  onChange,
  folder,
  label = "Image",
  hint,
  aspectHint,
}: {
  value:       string;
  onChange:    (url: string) => void;
  folder:      string;
  label?:      string;
  hint?:       string;
  aspectHint?: string; // e.g. "16:9 recommended"
}) {
  const inputRef            = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 8 * 1024 * 1024)    { setError("File must be under 8 MB."); return; }

    setError(null);
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload  = () => res(reader.result as string);
        reader.onerror = () => rej(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const result = await uploadImage(base64, folder);
      onChange(result.url);
    } catch (err) {
      setError("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }, [folder, onChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <FieldLabel>{label}</FieldLabel>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          position:       "relative",
          border:         `2px dashed ${dragging ? "#1a7fba" : value ? "#1a7fba44" : "hsl(210 20% 85%)"}`,
          borderRadius:   "16px",
          background:     dragging ? "rgba(26,127,186,0.06)" : value ? "hsl(210 30% 98%)" : "hsl(210 30% 99%)",
          cursor:         uploading ? "wait" : "pointer",
          overflow:       "hidden",
          transition:     "border-color 0.2s, background 0.2s",
          minHeight:      value ? "auto" : "120px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        {value ? (
          /* ── Preview ─────────────────────────────────── */
          <div style={{ position: "relative", width: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded"
              style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "14px", display: "block" }}
            />
            {/* Overlay on hover */}
            <div
              style={{
                position: "absolute", inset: 0, borderRadius: "14px",
                background: "rgba(10,31,46,0.55)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "6px", opacity: uploading ? 1 : 0, transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.opacity = "0"; }}
            >
              {uploading ? (
                <Loader2 size={24} style={{ color: "white", animation: "spin 1s linear infinite" }} />
              ) : (
                <>
                  <Upload size={20} style={{ color: "white" }} />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>Replace image</span>
                </>
              )}
            </div>
            {/* Remove button */}
            {!uploading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                style={{
                  position: "absolute", top: "8px", right: "8px",
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "rgba(10,31,46,0.7)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={13} style={{ color: "white" }} />
              </button>
            )}
          </div>
        ) : (
          /* ── Empty state ─────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "28px 20px" }}>
            {uploading ? (
              <>
                <Loader2 size={28} style={{ color: "#1a7fba", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#607080" }}>Uploading…</span>
              </>
            ) : (
              <>
                <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(26,127,186,0.10)", border: "1.5px solid rgba(26,127,186,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={20} style={{ color: "#1a7fba" }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#0a1f2e", margin: "0 0 2px" }}>
                    Drop image here or <span style={{ color: "#1a7fba" }}>browse</span>
                  </p>
                  <p style={{ fontSize: "11px", color: "#8ca0b0", fontWeight: 500, margin: 0 }}>
                    PNG, JPG, WebP — max 8 MB{aspectHint ? ` · ${aspectHint}` : ""}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
      </div>

      {/* URL fallback input */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ flex: 1, height: "1px", background: "hsl(210 25% 91%)" }} />
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#b0bec9", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>or paste URL</span>
        <div style={{ flex: 1, height: "1px", background: "hsl(210 25% 91%)" }} />
      </div>
      <TextInput
        value={value}
        onChange={onChange}
        placeholder="https://res.cloudinary.com/…"
        hint={hint}
      />

      {error && (
        <p style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600, margin: 0 }}>⚠ {error}</p>
      )}
    </div>
  );
}

// ─── SectionDivider ───────────────────────────────────────────────────────────

export function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "24px 0 16px" }}>
      <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8ca0b0", whiteSpace: "nowrap", fontFamily: "Sora, sans-serif", margin: 0 }}>
        {label}
      </p>
      <div style={{ flex: 1, height: "1px", background: "hsl(210 25% 91%)" }} />
    </div>
  );
}

// ─── FormGrid ─────────────────────────────────────────────────────────────────

export function FormGrid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "16px" }}>
      {children}
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────

export function FormField({ label, children, span, hint }: {
  label: string; children: React.ReactNode; span?: number; hint?: string;
}) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && (
        <p style={{ fontSize: "11px", color: "#8ca0b0", marginTop: "5px", fontWeight: 500 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

export function ItemCard({ children, onDelete, deleteLabel = "Remove" }: {
  children: React.ReactNode; onDelete: () => void; deleteLabel?: string;
}) {
  return (
    <div style={{ background: "hsl(210 30% 98%)", border: "1.5px solid hsl(210 25% 91%)", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {children}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onDelete}
          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", border: "1.5px solid rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)", borderRadius: "8px", fontSize: "11px", fontWeight: 700, color: "#ef4444", cursor: "pointer" }}
        >
          {deleteLabel}
        </button>
      </div>
    </div>
  );
}

// ─── AddButton ────────────────────────────────────────────────────────────────

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "1.5px dashed hsl(210 25% 85%)", background: "transparent", fontSize: "12px", fontWeight: 700, color: "#8ca0b0", cursor: "pointer", transition: "border-color 0.15s, color 0.15s", alignSelf: "flex-start" }}
      onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = "#1a7fba"; el.style.color = "#1a7fba"; }}
      onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = "hsl(210 25% 85%)"; el.style.color = "#8ca0b0"; }}
    >
      + {label}
    </button>
  );
}

// ─── SaveBar ──────────────────────────────────────────────────────────────────

export function SaveBar({ pending, onSave }: {
  pending: boolean; onSave: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", marginTop: "32px", paddingTop: "20px", borderTop: "1.5px solid hsl(210 25% 91%)" }}>
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 22px", borderRadius: "12px", border: "none", background: pending ? "rgba(26,127,186,0.45)" : "linear-gradient(135deg, #1a7fba, #2496d6)", color: "white", fontSize: "13px", fontWeight: 800, cursor: pending ? "not-allowed" : "pointer", boxShadow: pending ? "none" : "0 4px 14px rgba(26,127,186,0.30)", fontFamily: "Sora, sans-serif" }}
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}