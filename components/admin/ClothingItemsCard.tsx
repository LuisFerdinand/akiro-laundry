// components/admin/ClothingItemsCard.tsx
"use client";
//
// Admin list of the clothing items staff count at drop-off (Services page).
// Which items each service counts is set in the service's Edit dialog.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Shirt, Plus, ArrowUp, ArrowDown, Pencil, Trash2, Check, X, Loader2, Eye, EyeOff,
} from "lucide-react";
import {
  createClothingItem, updateClothingItem, deleteClothingItem, moveClothingItem,
  type ClothingItemWithUsage,
} from "@/lib/actions/clothing-items";

interface Props {
  items: ClothingItemWithUsage[];
}

const iconBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  border: "1px solid #e2e8f0", background: "white", cursor: "pointer", padding: 0,
};

export function ClothingItemsCard({ items }: Props) {
  const router = useRouter();
  const [pending, start]    = useTransition();
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editId,  setEditId]  = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const run = (id: number | "new", action: () => Promise<{ success: boolean; error?: string }>, after?: () => void) => {
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

  const saveRename = (id: number) =>
    run(id, () => updateClothingItem(id, { name: editName }), () => setEditId(null));

  return (
    <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "1.5px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shirt size={16} style={{ color: "#047857" }} />
          </div>
          <div>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: 14, color: "#0f172a" }}>Clothes Count Items</p>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
              What staff count at drop-off. Pick which ones each service counts in the service&apos;s <b>Edit</b> dialog.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="New item, e.g. Handuk"
            aria-label="New clothing item name"
            style={{ width: 190, padding: "8px 11px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1e293b", outline: "none", background: "#f8fafc", fontFamily: "inherit" }}
          />
          <button
            type="button"
            onClick={add}
            disabled={!newName.trim() || (pending && busyId === "new")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: newName.trim() ? "linear-gradient(135deg,#047857,#10b981)" : "#cbd5e1", color: "white", fontSize: 12, fontWeight: 800, cursor: newName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
          >
            {pending && busyId === "new" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
          </button>
        </div>
      </div>

      {error && (
        <div style={{ margin: "12px 18px 0", padding: "8px 12px", borderRadius: 8, background: "#fff1f2", border: "1.5px solid #fda4af" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#be123c" }}>{error}</p>
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ padding: 28, textAlign: "center", fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
          No clothing items yet — add the first one above.
        </p>
      ) : (
        <div style={{ padding: "12px 18px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 8 }}>
          {items.map((item, i) => {
            const busy = pending && busyId === item.id;
            const used = item.serviceCount;
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9,
                border: "1.5px solid #e8edf2", background: item.isActive ? "white" : "#f8fafc",
                opacity: busy ? 0.6 : 1,
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button type="button" aria-label={`Move ${item.name} up`} disabled={i === 0 || busy}
                    onClick={() => run(item.id, () => moveClothingItem(item.id, "up"))}
                    style={{ ...iconBtn, width: 20, height: 14, borderRadius: 4, opacity: i === 0 ? 0.35 : 1 }}>
                    <ArrowUp size={10} style={{ color: "#64748b" }} />
                  </button>
                  <button type="button" aria-label={`Move ${item.name} down`} disabled={i === items.length - 1 || busy}
                    onClick={() => run(item.id, () => moveClothingItem(item.id, "down"))}
                    style={{ ...iconBtn, width: 20, height: 14, borderRadius: 4, opacity: i === items.length - 1 ? 0.35 : 1 }}>
                    <ArrowDown size={10} style={{ color: "#64748b" }} />
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editId === item.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveRename(item.id); if (e.key === "Escape") setEditId(null); }}
                      aria-label={`Rename ${item.name}`}
                      style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", border: "1.5px solid #b6def5", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                    />
                  ) : (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 800, color: item.isActive ? "#0f172a" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: 10, color: "#94a3b8" }}>
                        {item.isActive ? `${used} service${used === 1 ? "" : "s"}` : "Hidden from new counts"}
                      </p>
                    </>
                  )}
                </div>

                {editId === item.id ? (
                  <>
                    <button type="button" aria-label="Save name" onClick={() => saveRename(item.id)} style={{ ...iconBtn, borderColor: "#86efac", background: "#f0fdf4" }}>
                      {busy ? <Loader2 size={12} className="animate-spin" style={{ color: "#16a34a" }} /> : <Check size={12} style={{ color: "#16a34a" }} />}
                    </button>
                    <button type="button" aria-label="Cancel rename" onClick={() => setEditId(null)} style={iconBtn}>
                      <X size={12} style={{ color: "#64748b" }} />
                    </button>
                  </>
                ) : confirmDelete === item.id ? (
                  <>
                    <button type="button" onClick={() => run(item.id, () => deleteClothingItem(item.id), () => setConfirmDelete(null))}
                      style={{ ...iconBtn, width: "auto", padding: "0 8px", borderColor: "#fda4af", background: "#fff1f2", fontSize: 10, fontWeight: 800, color: "#be123c" }}>
                      {busy ? <Loader2 size={11} className="animate-spin" /> : "Delete"}
                    </button>
                    <button type="button" aria-label="Keep item" onClick={() => setConfirmDelete(null)} style={iconBtn}>
                      <X size={12} style={{ color: "#64748b" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" title={item.isActive ? "Hide from new counts" : "Show in new counts"}
                      aria-label={item.isActive ? `Hide ${item.name}` : `Show ${item.name}`}
                      onClick={() => run(item.id, () => updateClothingItem(item.id, { isActive: !item.isActive }))}
                      style={iconBtn}>
                      {item.isActive ? <Eye size={12} style={{ color: "#16a34a" }} /> : <EyeOff size={12} style={{ color: "#94a3b8" }} />}
                    </button>
                    <button type="button" title="Rename" aria-label={`Rename ${item.name}`}
                      onClick={() => { setEditId(item.id); setEditName(item.name); setConfirmDelete(null); }}
                      style={iconBtn}>
                      <Pencil size={11} style={{ color: "#1a7fba" }} />
                    </button>
                    <button type="button" title="Delete — past orders keep the name" aria-label={`Delete ${item.name}`}
                      onClick={() => { setConfirmDelete(item.id); setEditId(null); }}
                      style={{ ...iconBtn, borderColor: "#fecdd3" }}>
                      <Trash2 size={11} style={{ color: "#be123c" }} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
