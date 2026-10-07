// components/admin/ClothingItemsModal.tsx
"use client";
//
// Modal on the Services page for managing the clothing items staff count at
// drop-off: add, rename, hide, delete and drag-and-drop reorder.
// Which items each service counts is still set in the service's Edit dialog.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Shirt, Plus, GripVertical, Pencil, Trash2, Check, X, Loader2, Eye, EyeOff, AlertTriangle,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  createClothingItem, updateClothingItem, deleteClothingItem, reorderClothingItems,
  type ClothingItemWithUsage, type ClothingActionResult,
} from "@/lib/actions/clothing-items";

interface Props {
  items:   ClothingItemWithUsage[];
  onClose: () => void;
}

type RunFn = (
  id: number | "new",
  action: () => Promise<ClothingActionResult>,
  after?: () => void,
) => void;

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", padding: 0,
};

// ─── One sortable row ─────────────────────────────────────────────────────────
function ItemRow({
  item, index, busy, run,
}: { item: ClothingItemWithUsage; index: number; busy: boolean; run: RunFn }) {
  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(item.name);
  const [deleting, setDeleting] = useState(false);

  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.id, disabled: editing || deleting });

  const used = item.serviceCount;

  const startEdit = () => { setName(item.name); setDeleting(false); setEditing(true); };
  const saveEdit  = () => {
    const next = name.trim();
    if (!next || next === item.name) { setEditing(false); return; }
    run(item.id, () => updateClothingItem(item.id, { name: next }), () => setEditing(false));
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 10 : 0,
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px 9px 8px", borderRadius: 11,
        border: `1.5px solid ${deleting ? "#fda4af" : isDragging ? "#7cc4ec" : "#e8edf2"}`,
        background: deleting ? "#fff1f2" : item.isActive ? "white" : "#f8fafc",
        boxShadow: isDragging ? "0 12px 28px rgba(26,127,186,0.22)" : "0 1px 2px rgba(15,23,42,0.03)",
        opacity: busy ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Drag to reorder ${item.name}`}
        title="Drag to reorder"
        disabled={editing || deleting}
        {...attributes}
        {...listeners}
        style={{
          width: 26, height: 34, borderRadius: 7, border: "none", background: "transparent", padding: 0, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: editing || deleting ? "not-allowed" : isDragging ? "grabbing" : "grab",
          touchAction: "none", opacity: editing || deleting ? 0.3 : 1,
        }}
      >
        <GripVertical size={16} style={{ color: "#94a3b8" }} />
      </button>

      <span style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: "#edf7fd", color: "#1a7fba",
        fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {index + 1}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") { e.stopPropagation(); setEditing(false); }
            }}
            aria-label={`Rename ${item.name}`}
            style={{ width: "100%", boxSizing: "border-box", padding: "6px 10px", border: "1.5px solid #7cc4ec", borderRadius: 7, fontSize: 14, fontWeight: 700, color: "#0f172a", outline: "none", fontFamily: "inherit", background: "white" }}
          />
        ) : deleting ? (
          <>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#be123c" }}>Delete “{item.name}”?</p>
            <p style={{ fontSize: 11, color: "#9f1239", lineHeight: 1.35 }}>
              {used > 0 ? `Removed from ${used} service${used === 1 ? "" : "s"}. ` : ""}Past orders keep the name.
            </p>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <p
              onDoubleClick={startEdit}
              title="Double-click to rename"
              style={{ fontSize: 14, fontWeight: 700, color: item.isActive ? "#0f172a" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {item.name}
            </p>
            {!item.isActive && (
              <span style={{ fontSize: 9, fontWeight: 800, color: "#64748b", background: "#e2e8f0", padding: "2px 6px", borderRadius: 5, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>
                Hidden
              </span>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <>
          <button type="button" aria-label="Save name" onClick={saveEdit} style={{ ...iconBtn, borderColor: "#86efac", background: "#f0fdf4" }}>
            {busy ? <Loader2 size={13} className="animate-spin" style={{ color: "#16a34a" }} /> : <Check size={14} style={{ color: "#16a34a" }} />}
          </button>
          <button type="button" aria-label="Cancel rename" onClick={() => setEditing(false)} style={iconBtn}>
            <X size={14} style={{ color: "#64748b" }} />
          </button>
        </>
      ) : deleting ? (
        <>
          <button
            type="button"
            onClick={() => run(item.id, () => deleteClothingItem(item.id), () => setDeleting(false))}
            style={{ ...iconBtn, width: "auto", padding: "0 12px", borderColor: "#e11d48", background: "#e11d48", fontSize: 12, fontWeight: 800, color: "white", gap: 5 }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
          </button>
          <button type="button" aria-label="Keep item" onClick={() => setDeleting(false)} style={iconBtn}>
            <X size={14} style={{ color: "#64748b" }} />
          </button>
        </>
      ) : (
        <>
          <span
            title={used === 0 ? "Not counted by any service yet" : `Counted by ${used} service${used === 1 ? "" : "s"}`}
            style={{
              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap",
              color: used === 0 ? "#94a3b8" : "#047857", background: used === 0 ? "#f1f5f9" : "#ecfdf5",
              border: `1px solid ${used === 0 ? "#e2e8f0" : "#a7f3d0"}`,
            }}
          >
            {used} service{used === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            title={item.isActive ? "Hide from new counts" : "Show in new counts"}
            aria-label={item.isActive ? `Hide ${item.name}` : `Show ${item.name}`}
            onClick={() => run(item.id, () => updateClothingItem(item.id, { isActive: !item.isActive }))}
            style={iconBtn}
          >
            {item.isActive ? <Eye size={14} style={{ color: "#16a34a" }} /> : <EyeOff size={14} style={{ color: "#94a3b8" }} />}
          </button>
          <button type="button" title="Rename" aria-label={`Rename ${item.name}`} onClick={startEdit} style={iconBtn}>
            <Pencil size={13} style={{ color: "#1a7fba" }} />
          </button>
          <button
            type="button"
            title="Delete"
            aria-label={`Delete ${item.name}`}
            onClick={() => setDeleting(true)}
            style={{ ...iconBtn, borderColor: "#fecdd3" }}
          >
            <Trash2 size={13} style={{ color: "#be123c" }} />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function ClothingItemsModal({ items, onClose }: Props) {
  const router = useRouter();
  const [pending, start]    = useTransition();
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [list, setList]     = useState(items);
  const listRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(items.length);

  // Server data is the source of truth once a refresh lands.
  useEffect(() => { setList(items); }, [items]);

  // Scroll to the newly added item at the bottom.
  useEffect(() => {
    if (list.length > prevLen.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    prevLen.current = list.length;
  }, [list.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run: RunFn = (id, action, after) => {
    setError(null);
    setBusyId(id);
    start(async () => {
      const res = await action();
      setBusyId(null);
      if (res.success) { after?.(); router.refresh(); }
      else setError(res.error ?? "Something went wrong.");
    });
  };

  const add = () => {
    if (!newName.trim()) return;
    run("new", () => createClothingItem(newName), () => setNewName(""));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = list.findIndex((i) => i.id === active.id);
    const to   = list.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;

    const previous = list;
    const next     = arrayMove(list, from, to);
    setList(next); // optimistic — rows settle immediately
    setError(null);
    start(async () => {
      const res = await reorderClothingItems(next.map((i) => i.id));
      if (res.success) router.refresh();
      else { setList(previous); setError(res.error ?? "Failed to save the new order."); }
    });
  };

  const visible = list.filter((i) => i.isActive).length;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Clothes count items"
        style={{ background: "white", borderRadius: 14, border: "1.5px solid #e2e8f0", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", width: "100%", maxWidth: 580, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", padding: "18px 22px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.16)", border: "1.5px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shirt size={18} style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Clothes count</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "white", marginTop: 2 }}>Manage Items</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>

        {/* Add bar */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="New item, e.g. Kolor, Handuk…"
              aria-label="New clothing item name"
              style={{ flex: 1, minWidth: 0, padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#1e293b", outline: "none", background: "white", fontFamily: "inherit" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#b6def5")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
            <button
              type="button"
              onClick={add}
              disabled={!newName.trim() || (pending && busyId === "new")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 9, border: "none", background: newName.trim() ? "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)" : "#cbd5e1", boxShadow: newName.trim() ? "0 4px 14px rgba(26,127,186,0.3)" : "none", color: "white", fontSize: 13, fontWeight: 800, cursor: newName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
            >
              {pending && busyId === "new" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, lineHeight: 1.4 }}>
            Drag <GripVertical size={11} style={{ display: "inline", verticalAlign: "-2px" }} /> to set the order staff see. Pick which items each service counts in the service&apos;s <b>Edit</b> dialog.
          </p>
        </div>

        {error && (
          <div style={{ margin: "12px 22px 0", padding: "9px 12px", borderRadius: 9, background: "#fff1f2", border: "1.5px solid #fda4af", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <AlertTriangle size={14} style={{ color: "#be123c", flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 600, color: "#be123c" }}>{error}</p>
          </div>
        )}

        {/* List */}
        <div ref={listRef} style={{ padding: "14px 22px", overflowY: "auto", flex: 1, minHeight: 120 }}>
          {list.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <Shirt size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>No items yet — add the first one above.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {list.map((item, i) => (
                    <ItemRow key={item.id} item={item} index={i} busy={pending && busyId === item.id} run={run} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            {list.length} item{list.length === 1 ? "" : "s"} · {visible} shown to staff
          </p>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
