// components/admin/cms/forms/CmsGalleryForm.tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter }                        from "next/navigation";
import { Search, Pencil, Trash2, X, ImageIcon, Plus } from "lucide-react";
import type { CmsGallerySection, CmsGalleryImage } from "@/lib/db/schema/cms";
import { saveGallery }  from "@/lib/actions/cms/gallery.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, SelectInput,
  SaveBar,
} from "./CmsFormPrimitives";

type GalleryData = (CmsGallerySection & { images: CmsGalleryImage[] }) | null;
type ImageState  = {
  id?: number; imageUrl: string; altText: string;
  caption: string; sizeHint: "square" | "tall" | "wide"; sortOrder: number;
};

const SIZE_OPTIONS = [
  { value: "square", label: "Square (1×1)" },
  { value: "tall",   label: "Tall — 2 rows (portrait)" },
  { value: "wide",   label: "Wide — 2 columns (landscape)" },
];

const SIZE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  square: { label: "Square", color: "#1a7fba", bg: "rgba(26,127,186,0.10)" },
  tall:   { label: "Tall",   color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  wide:   { label: "Wide",   color: "#10b981", bg: "rgba(16,185,129,0.10)" },
};

function emptyImage(sortOrder: number): ImageState {
  return { imageUrl: "", altText: "", caption: "", sizeHint: "square", sortOrder };
}

// ── Edit Drawer ───────────────────────────────────────────────────────────────
function EditDrawer({
  image, index, onClose, onChange,
}: {
  image: ImageState; index: number;
  onClose: () => void;
  onChange: (field: keyof ImageState, val: string) => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(10,31,46,0.35)",
          backdropFilter: "blur(3px)", zIndex: 40,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 100vw)",
          background: "white", zIndex: 50, display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(10,31,46,0.15)",
          animation: "slideIn 0.22s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1.5px solid hsl(210 25% 91%)", flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "Sora, sans-serif", fontSize: "15px", fontWeight: 800, color: "#0a1f2e", margin: 0 }}>
              Edit Image
            </p>
            <p style={{ fontSize: "11px", color: "#8ca0b0", fontWeight: 500, margin: "2px 0 0" }}>
              #{String(index + 1).padStart(2, "0")}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: "34px", height: "34px", borderRadius: "10px", border: "1.5px solid hsl(210 25% 91%)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={15} style={{ color: "#607080" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <ImageUploadField
            label="Photo"
            value={image.imageUrl}
            onChange={(v) => onChange("imageUrl", v)}
            folder="akiro/gallery"
            aspectHint={image.sizeHint === "tall" ? "Portrait 2:3" : image.sizeHint === "wide" ? "Landscape 16:9" : "Square 1:1"}
          />
          <div style={{ marginTop: "16px" }}>
            <FormField label="Alt Text">
              <TextInput value={image.altText} onChange={(v) => onChange("altText", v)} placeholder="Photo description for accessibility" />
            </FormField>
          </div>
          <div style={{ marginTop: "14px" }}>
            <FormField label="Caption (shown on hover)">
              <TextInput value={image.caption} onChange={(v) => onChange("caption", v)} placeholder="e.g. Commercial-grade washers" />
            </FormField>
          </div>
          <div style={{ marginTop: "14px" }}>
            <FormField label="Grid Size">
              <SelectInput value={image.sizeHint} onChange={(v) => onChange("sizeHint", v)} options={SIZE_OPTIONS} />
            </FormField>
          </div>
          <div style={{ marginTop: "12px", padding: "12px", background: "hsl(210 30% 97%)", borderRadius: "10px", border: "1.5px solid hsl(210 25% 91%)" }}>
            <p style={{ fontSize: "11px", color: "#8ca0b0", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: "#607080" }}>Tall</strong> items span 2 rows (portrait photos). <strong style={{ color: "#607080" }}>Wide</strong> items span 2 columns (landscape panoramas). Mix with <strong style={{ color: "#607080" }}>Square</strong> for a natural masonry look.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1.5px solid hsl(210 25% 91%)", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ width: "100%", padding: "11px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #1a7fba, #2496d6)", color: "white", fontSize: "13px", fontWeight: 800, cursor: "pointer", fontFamily: "Sora, sans-serif" }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export function CmsGalleryForm({ data }: { data: GalleryData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);
  const [search,  setSearch]       = useState("");
  const [editing, setEditing]      = useState<number | null>(null);

  const [badge,    setBadge]    = useState(data?.badge    ?? "Our Facility");
  const [headline, setHeadline] = useState(data?.headline ?? "A Glimpse Inside Akiro");
  const [subtext,  setSubtext]  = useState(data?.subtext  ?? "");

  const [images, setImages] = useState<ImageState[]>(
    (data?.images ?? []).map((img) => ({
      id: img.id, imageUrl: img.imageUrl, altText: img.altText,
      caption: img.caption ?? "", sizeHint: img.sizeHint as ImageState["sizeHint"],
      sortOrder: img.sortOrder,
    }))
  );

  const addImage    = () => {
    const next = [...images, emptyImage(images.length)];
    setImages(next);
    setEditing(next.length - 1);
  };
  const removeImage = (i: number) => {
    setImages((p) => p.filter((_, idx) => idx !== i));
    setEditing(null);
  };
  const updateImage = (i: number, field: keyof ImageState, val: string) =>
    setImages((p) => p.map((img, idx) => idx === i ? { ...img, [field]: val } : img));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return images
      .map((img, i) => ({ img, i }))
      .filter(({ img }) =>
        !q ||
        img.altText.toLowerCase().includes(q) ||
        img.caption.toLowerCase().includes(q) ||
        img.sizeHint.includes(q)
      );
  }, [images, search]);

  const handleSave = () => {
    startTransition(async () => {
      await saveGallery({
        sectionId: data?.id, badge, headline, subtext,
        images: images.map((img, i) => ({ ...img, sortOrder: i, caption: img.caption || null })),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Section header fields ────────────────────────────── */}
      <SectionDivider label="Section Header" />
      <FormGrid cols={2}>
        <FormField label="Badge">   <TextInput value={badge}    onChange={setBadge}    placeholder="Our Facility" /></FormField>
        <FormField label="Headline"><TextInput value={headline} onChange={setHeadline} placeholder="A Glimpse Inside Akiro" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext"><TextArea value={subtext} onChange={setSubtext} placeholder="Short description…" /></FormField>
      </div>

      {/* ── Table header ─────────────────────────────────────── */}
      <SectionDivider label={`Gallery Images (${images.length})`} />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0bec9", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by alt text, caption or size…"
            style={{
              width: "100%", padding: "9px 12px 9px 34px",
              border: "1.5px solid hsl(210 20% 88%)", borderRadius: "10px",
              fontSize: "13px", fontWeight: 500, background: "white",
              color: "hsl(215 25% 15%)", outline: "none", boxSizing: "border-box",
              fontFamily: "Nunito, sans-serif",
            }}
          />
        </div>

        {/* Add button */}
        <button
          onClick={addImage}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 16px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #1a7fba, #2496d6)",
            color: "white", fontSize: "12px", fontWeight: 800,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Sora, sans-serif",
            boxShadow: "0 2px 8px rgba(26,127,186,0.25)",
          }}
        >
          <Plus size={13} /> Add Image
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div style={{ border: "1.5px solid hsl(210 25% 91%)", borderRadius: "14px", overflow: "hidden" }}>
        {/* Table head */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr 1fr 90px 80px",
            gap: "0",
            background: "hsl(210 30% 97%)",
            borderBottom: "1.5px solid hsl(210 25% 91%)",
            padding: "0 16px",
          }}
        >
          {["Photo", "Alt Text", "Caption", "Size", ""].map((h, i) => (
            <div key={i} style={{ padding: "10px 8px", fontSize: "10px", fontWeight: 800, color: "#8ca0b0", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Sora, sans-serif" }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <ImageIcon size={28} style={{ color: "#d0dce8", marginBottom: "8px" }} />
            <p style={{ fontSize: "13px", color: "#b0bec9", fontWeight: 500 }}>
              {search ? "No images match your search." : "No images yet — click Add Image to get started."}
            </p>
          </div>
        ) : (
          filtered.map(({ img, i }, rowIdx) => {
            const badge = SIZE_BADGE[img.sizeHint];
            const isLast = rowIdx === filtered.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr 1fr 90px 80px",
                  alignItems: "center",
                  gap: "0",
                  padding: "10px 16px",
                  borderBottom: isLast ? "none" : "1px solid hsl(210 25% 93%)",
                  background: editing === i ? "rgba(26,127,186,0.04)" : "white",
                  transition: "background 0.15s",
                }}
              >
                {/* Thumbnail */}
                <div style={{ paddingRight: "8px" }}>
                  {img.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.imageUrl}
                      alt={img.altText || ""}
                      style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "8px", border: "1.5px solid hsl(210 25% 91%)", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "40px", height: "40px", borderRadius: "8px", border: "1.5px dashed hsl(210 25% 88%)", background: "hsl(210 30% 97%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImageIcon size={14} style={{ color: "#b0bec9" }} />
                    </div>
                  )}
                </div>

                {/* Alt text */}
                <div style={{ padding: "0 8px", overflow: "hidden" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0a1f2e", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {img.altText || <span style={{ color: "#b0bec9", fontWeight: 400, fontStyle: "italic" }}>No alt text</span>}
                  </p>
                </div>

                {/* Caption */}
                <div style={{ padding: "0 8px", overflow: "hidden" }}>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#607080", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {img.caption || <span style={{ color: "#d0dce8" }}>—</span>}
                  </p>
                </div>

                {/* Size badge */}
                <div style={{ padding: "0 8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: "6px", padding: "3px 8px", display: "inline-block" }}>
                    {badge.label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setEditing(i)}
                    title="Edit"
                    style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1.5px solid hsl(210 25% 91%)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Pencil size={12} style={{ color: "#607080" }} />
                  </button>
                  <button
                    onClick={() => removeImage(i)}
                    title="Delete"
                    style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1.5px solid rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Trash2 size={12} style={{ color: "#ef4444" }} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Edit drawer ──────────────────────────────────────── */}
      {editing !== null && images[editing] && (
        <EditDrawer
          image={images[editing]}
          index={editing}
          onClose={() => setEditing(null)}
          onChange={(field, val) => updateImage(editing, field, val)}
        />
      )}

      <SaveBar pending={pending} saved={saved} onSave={handleSave} />
    </div>
  );
}