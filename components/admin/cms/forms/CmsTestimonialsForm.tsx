// components/admin/cms/forms/CmsTestimonialsForm.tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter }                        from "next/navigation";
import { Search, Pencil, Trash2, X, Star, Plus, UserCircle2 } from "lucide-react";
import type { CmsTestimonialsSection, CmsTestimonial } from "@/lib/db/schema/cms";
import { saveTestimonials } from "@/lib/actions/cms/testimonials.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, ColorInput, SelectInput,
  SaveBar,
} from "./CmsFormPrimitives";

type TestimonialsData = (CmsTestimonialsSection & { testimonials: CmsTestimonial[] }) | null;
type ItemState = {
  id?: number; authorName: string; authorRole: string;
  avatarUrl: string; avatarAlt: string; initials: string;
  accentColor: string; rating: number; body: string; sortOrder: number;
};

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n !== 1 ? "s" : ""}` }));

function StarDisplay({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={11}
          style={{ color: s <= count ? "#f59e0b" : "#dde8f0" }}
          fill={s <= count ? "#f59e0b" : "#dde8f0"}
        />
      ))}
    </div>
  );
}

function emptyItem(sortOrder: number): ItemState {
  return { authorName: "", authorRole: "", avatarUrl: "", avatarAlt: "", initials: "", accentColor: "#1a7fba", rating: 5, body: "", sortOrder };
}

// ── Edit Drawer ───────────────────────────────────────────────────────────────
function EditDrawer({
  item, index, onClose, onChange,
}: {
  item: ItemState; index: number;
  onClose: () => void;
  onChange: (field: keyof ItemState, val: string | number) => void;
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
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 100vw)",
          background: "white", zIndex: 50, display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(10,31,46,0.15)",
          animation: "slideIn 0.22s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1.5px solid hsl(210 25% 91%)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Avatar preview */}
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", overflow: "hidden", background: `linear-gradient(135deg, ${item.accentColor}cc, ${item.accentColor})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {item.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "13px", fontWeight: 800, color: "white", fontFamily: "Sora, sans-serif" }}>
                  {item.initials || "?"}
                </span>
              )}
            </div>
            <div>
              <p style={{ fontFamily: "Sora, sans-serif", fontSize: "15px", fontWeight: 800, color: "#0a1f2e", margin: 0 }}>
                {item.authorName || "New Testimonial"}
              </p>
              <p style={{ fontSize: "11px", color: "#8ca0b0", fontWeight: 500, margin: "2px 0 0" }}>
                #{String(index + 1).padStart(2, "0")} · {item.authorRole || "Role"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: "34px", height: "34px", borderRadius: "10px", border: "1.5px solid hsl(210 25% 91%)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={15} style={{ color: "#607080" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <FormGrid cols={3}>
            <FormField label="Author Name" span={2}>
              <TextInput value={item.authorName} onChange={(v) => onChange("authorName", v)} placeholder="Maria Santos" />
            </FormField>
            <FormField label="Initials">
              <TextInput value={item.initials} onChange={(v) => onChange("initials", v)} placeholder="MS" />
            </FormField>
          </FormGrid>

          <FormField label="Author Role">
            <TextInput value={item.authorRole} onChange={(v) => onChange("authorRole", v)} placeholder="Restaurant Owner" />
          </FormField>

          <ImageUploadField
            label="Avatar Photo"
            value={item.avatarUrl}
            onChange={(v) => onChange("avatarUrl", v)}
            folder="akiro/testimonials"
            aspectHint="Square 1:1 recommended"
            hint="Leave blank to use the initials fallback."
          />

          <FormField label="Avatar Alt Text">
            <TextInput value={item.avatarAlt} onChange={(v) => onChange("avatarAlt", v)} placeholder="Photo of Maria Santos" />
          </FormField>

          <FormField label="Review Body">
            <TextArea value={item.body} onChange={(v) => onChange("body", v)} rows={4} placeholder="Customer's review text…" />
          </FormField>

          <FormField label="Star Rating">
            <SelectInput value={String(item.rating)} onChange={(v) => onChange("rating", Number(v))} options={RATING_OPTIONS} />
          </FormField>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px", fontFamily: "Sora, sans-serif" }}>
              Accent Colour
            </label>
            <ColorInput value={item.accentColor} onChange={(v) => onChange("accentColor", v)} />
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
export function CmsTestimonialsForm({ data }: { data: TestimonialsData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved,   setSaved]        = useState(false);
  const [search,  setSearch]       = useState("");
  const [editing, setEditing]      = useState<number | null>(null);

  const [badge,           setBadge]           = useState(data?.badge           ?? "Customer Love");
  const [headline,        setHeadline]        = useState(data?.headline        ?? "Trusted by Thousands");
  const [subtext,         setSubtext]         = useState(data?.subtext         ?? "");
  const [aggregateRating, setAggregateRating] = useState(data?.aggregateRating ?? "4.9");
  const [reviewCount,     setReviewCount]     = useState(data?.reviewCount     ?? "2,400+");

  const [items, setItems] = useState<ItemState[]>(
    (data?.testimonials ?? []).map((t) => ({
      id: t.id, authorName: t.authorName, authorRole: t.authorRole,
      avatarUrl: t.avatarUrl ?? "", avatarAlt: t.avatarAlt ?? "",
      initials: t.initials, accentColor: t.accentColor,
      rating: t.rating, body: t.body, sortOrder: t.sortOrder,
    }))
  );

  const addItem    = () => {
    const next = [...items, emptyItem(items.length)];
    setItems(next);
    setEditing(next.length - 1);
  };
  const removeItem = (i: number) => {
    setItems((p) => p.filter((_, idx) => idx !== i));
    setEditing(null);
  };
  const updateItem = (i: number, field: keyof ItemState, val: string | number) =>
    setItems((p) => p.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .map((t, i) => ({ t, i }))
      .filter(({ t }) =>
        !q ||
        t.authorName.toLowerCase().includes(q) ||
        t.authorRole.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q)
      );
  }, [items, search]);

  const handleSave = () => {
    startTransition(async () => {
      await saveTestimonials({
        sectionId: data?.id, badge, headline, subtext, aggregateRating, reviewCount,
        testimonials: items.map((t, i) => ({ ...t, sortOrder: i, avatarUrl: t.avatarUrl || null, avatarAlt: t.avatarAlt || null })),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Section header ───────────────────────────────────── */}
      <SectionDivider label="Section Header" />
      <FormGrid cols={2}>
        <FormField label="Badge">   <TextInput value={badge}    onChange={setBadge}    placeholder="Customer Love" /></FormField>
        <FormField label="Headline"><TextInput value={headline} onChange={setHeadline} placeholder="Trusted by Thousands" /></FormField>
      </FormGrid>
      <div style={{ marginTop: "14px" }}>
        <FormField label="Subtext"><TextArea value={subtext} onChange={setSubtext} placeholder="Tagline below headline…" /></FormField>
      </div>

      {/* ── Aggregate rating ─────────────────────────────────── */}
      <SectionDivider label="Aggregate Rating" />
      <FormGrid cols={2}>
        <FormField label="Rating Score (e.g. 4.9)">  <TextInput value={aggregateRating} onChange={setAggregateRating} placeholder="4.9" /></FormField>
        <FormField label="Review Count (e.g. 2,400+)"><TextInput value={reviewCount}     onChange={setReviewCount}     placeholder="2,400+" /></FormField>
      </FormGrid>

      {/* ── Table header ─────────────────────────────────────── */}
      <SectionDivider label={`Testimonials (${items.length})`} />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0bec9", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role or review text…"
            style={{
              width: "100%", padding: "9px 12px 9px 34px",
              border: "1.5px solid hsl(210 20% 88%)", borderRadius: "10px",
              fontSize: "13px", fontWeight: 500, background: "white",
              color: "hsl(215 25% 15%)", outline: "none", boxSizing: "border-box",
              fontFamily: "Nunito, sans-serif",
            }}
          />
        </div>

        {/* Add */}
        <button
          onClick={addItem}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 16px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #1a7fba, #2496d6)",
            color: "white", fontSize: "12px", fontWeight: 800,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Sora, sans-serif",
            boxShadow: "0 2px 8px rgba(26,127,186,0.25)",
          }}
        >
          <Plus size={13} /> Add Review
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div style={{ border: "1.5px solid hsl(210 25% 91%)", borderRadius: "14px", overflow: "hidden" }}>
        {/* Head */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 140px 80px 80px",
            background: "hsl(210 30% 97%)",
            borderBottom: "1.5px solid hsl(210 25% 91%)",
            padding: "0 16px",
          }}
        >
          {["", "Author", "Role", "Rating", ""].map((h, i) => (
            <div key={i} style={{ padding: "10px 8px", fontSize: "10px", fontWeight: 800, color: "#8ca0b0", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Sora, sans-serif" }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <UserCircle2 size={28} style={{ color: "#d0dce8", marginBottom: "8px" }} />
            <p style={{ fontSize: "13px", color: "#b0bec9", fontWeight: 500 }}>
              {search ? "No reviews match your search." : "No testimonials yet — click Add Review to get started."}
            </p>
          </div>
        ) : (
          filtered.map(({ t, i }, rowIdx) => {
            const isLast = rowIdx === filtered.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 140px 80px 80px",
                  alignItems: "center",
                  padding: "10px 16px",
                  borderBottom: isLast ? "none" : "1px solid hsl(210 25% 93%)",
                  background: editing === i ? "rgba(26,127,186,0.04)" : "white",
                  transition: "background 0.15s",
                  cursor: "pointer",
                }}
                onClick={() => setEditing(i)}
              >
                {/* Avatar */}
                <div>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", overflow: "hidden", background: `linear-gradient(135deg, ${t.accentColor}cc, ${t.accentColor})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {t.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "white", fontFamily: "Sora, sans-serif" }}>{t.initials || "?"}</span>
                    )}
                  </div>
                </div>

                {/* Name + body snippet */}
                <div style={{ padding: "0 8px", overflow: "hidden" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#0a1f2e", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.authorName || <span style={{ color: "#b0bec9", fontStyle: "italic", fontWeight: 400 }}>Unnamed</span>}
                  </p>
                  <p style={{ fontSize: "11px", color: "#8ca0b0", fontWeight: 500, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.body ? `"${t.body.slice(0, 60)}${t.body.length > 60 ? "…" : ""}"` : <span style={{ color: "#d0dce8", fontStyle: "italic" }}>No review text</span>}
                  </p>
                </div>

                {/* Role */}
                <div style={{ padding: "0 8px", overflow: "hidden" }}>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#607080", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.authorRole || <span style={{ color: "#d0dce8" }}>—</span>}
                  </p>
                </div>

                {/* Stars */}
                <div style={{ padding: "0 8px" }}>
                  <StarDisplay count={t.rating} />
                </div>

                {/* Actions */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setEditing(i)}
                    title="Edit"
                    style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1.5px solid hsl(210 25% 91%)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Pencil size={12} style={{ color: "#607080" }} />
                  </button>
                  <button
                    onClick={() => removeItem(i)}
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
      {editing !== null && items[editing] && (
        <EditDrawer
          item={items[editing]}
          index={editing}
          onClose={() => setEditing(null)}
          onChange={(field, val) => updateItem(editing, field, val)}
        />
      )}

      <SaveBar pending={pending} saved={saved} onSave={handleSave} />
    </div>
  );
}