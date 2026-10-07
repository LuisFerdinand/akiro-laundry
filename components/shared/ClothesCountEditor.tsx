// components/shared/ClothesCountEditor.tsx
"use client";
//
// Per-item piece steppers for the clothes count. Items mapped to the order's
// services come first; every other active item is one tap away under "More
// items". Lines for items that were since renamed away / deleted stay editable.

import { useState } from "react";
import { Minus, Plus, ChevronDown, ChevronUp, Shirt } from "lucide-react";
import {
  splitClothingItems, totalPieces,
  type ClothesCountLine, type ClothingItemOption, type ClothingSetup,
} from "@/lib/utils/clothes-count";

interface Props {
  setup:      ClothingSetup;
  serviceIds: (number | null)[];
  lines:      ClothesCountLine[];
  onChange:   (lines: ClothesCountLine[]) => void;
}

const MAX = 9999;

/** Keeps lines in the admin's item order (unknown items last) so receipts read consistently. */
function sortLines(lines: ClothesCountLine[], items: ClothingItemOption[]): ClothesCountLine[] {
  const rank = new Map(items.map((i) => [i.id, i.sortOrder]));
  const r = (l: ClothesCountLine) => (l.clothingItemId != null ? rank.get(l.clothingItemId) : undefined) ?? Number.MAX_SAFE_INTEGER;
  return [...lines].sort((a, b) => r(a) - r(b) || a.name.localeCompare(b.name));
}

export function ClothesCountEditor({ setup, serviceIds, lines, onChange }: Props) {
  const { suggested, others } = splitClothingItems(setup, serviceIds);
  const knownIds = new Set(setup.items.map((i) => i.id));
  // Counted lines whose item is no longer offered (deleted / deactivated).
  const orphans  = lines.filter((l) => l.clothingItemId == null || !knownIds.has(l.clothingItemId));

  const qtyOf = (id: number) => lines.find((l) => l.clothingItemId === id)?.quantity ?? 0;
  const [showOthers, setShowOthers] = useState(
    () => suggested.length === 0 || others.some((o) => qtyOf(o.id) > 0),
  );

  const setQty = (item: { id: number | null; name: string }, raw: number) => {
    const qty  = Math.max(0, Math.min(MAX, Math.floor(Number.isFinite(raw) ? raw : 0)));
    const same = (l: ClothesCountLine) =>
      item.id != null ? l.clothingItemId === item.id : l.clothingItemId == null && l.name === item.name;
    const rest = lines.filter((l) => !same(l));
    onChange(sortLines(qty > 0 ? [...rest, { clothingItemId: item.id, name: item.name, quantity: qty }] : rest, setup.items));
  };

  const total = totalPieces(lines);

  if (setup.items.length === 0 && orphans.length === 0) {
    return (
      <div style={{ padding: "14px", borderRadius: 10, background: "#f8fafc", border: "1.5px dashed #e2e8f0", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
          No clothing items set up yet — an admin can add them on the Services page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", overflow: "hidden" }}>
        {(suggested.length > 0 ? suggested : others).map((item, i) => (
          <StepperRow key={item.id} name={item.name} qty={qtyOf(item.id)} first={i === 0}
            onSet={(q) => setQty(item, q)} />
        ))}
        {orphans.map((l, i) => (
          <StepperRow key={`orphan-${l.clothingItemId ?? l.name}`} name={l.name} qty={l.quantity}
            first={suggested.length === 0 && others.length === 0 && i === 0}
            note="no longer in the list"
            onSet={(q) => setQty({ id: l.clothingItemId, name: l.name }, q)} />
        ))}
      </div>

      {suggested.length > 0 && others.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowOthers((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center",
              padding: "8px 10px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "#f8fafc",
              color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {showOthers ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showOthers ? "Hide other items" : `More items (${others.length})`}
          </button>
          {showOthers && (
            <div style={{ marginTop: 8, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", overflow: "hidden" }}>
              {others.map((item, i) => (
                <StepperRow key={item.id} name={item.name} qty={qtyOf(item.id)} first={i === 0}
                  onSet={(q) => setQty(item, q)} />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 10,
        background: total > 0 ? "linear-gradient(135deg,#ecfdf5,#d1fae5)" : "#f8fafc",
        border: `1.5px solid ${total > 0 ? "#6ee7b7" : "#e2e8f0"}`,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: total > 0 ? "#065f46" : "#94a3b8" }}>
          <Shirt size={14} /> Total pieces
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: total > 0 ? "#065f46" : "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>
          {total}
        </span>
      </div>
    </div>
  );
}

function StepperRow({ name, qty, first, note, onSet }: {
  name: string; qty: number; first: boolean; note?: string; onSet: (qty: number) => void;
}) {
  const btn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontFamily: "inherit",
  };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 14px",
      borderTop: first ? "none" : "1px solid #f1f5f9",
      background: qty > 0 ? "#f0fdf4" : "white", transition: "background 0.15s",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: qty > 0 ? 800 : 600, color: qty > 0 ? "#065f46" : "#1e293b" }}>{name}</p>
        {note && <p style={{ fontSize: 10, color: "#94a3b8" }}>{note}</p>}
      </div>
      <button type="button" aria-label={`One less ${name}`} disabled={qty <= 0} onClick={() => onSet(qty - 1)}
        style={{ ...btn, border: "1.5px solid #e2e8f0", background: qty > 0 ? "white" : "#f8fafc", color: qty > 0 ? "#334155" : "#cbd5e1", cursor: qty > 0 ? "pointer" : "not-allowed" }}>
        <Minus size={15} strokeWidth={2.5} />
      </button>
      <input
        type="number" inputMode="numeric" min={0} max={MAX} step={1}
        aria-label={`${name} pieces`}
        value={qty === 0 ? "" : qty}
        placeholder="0"
        onChange={(e) => onSet(e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          width: 52, height: 34, boxSizing: "border-box", textAlign: "center",
          border: "1.5px solid #e2e8f0", borderRadius: 9, background: "white",
          fontSize: 15, fontWeight: 800, color: "#0f172a", outline: "none", fontFamily: "inherit",
          fontVariantNumeric: "tabular-nums",
        }}
      />
      <button type="button" aria-label={`One more ${name}`} onClick={() => onSet(qty + 1)}
        style={{ ...btn, border: "none", background: "linear-gradient(135deg,#1a7fba,#2496d6)", color: "white", boxShadow: "0 2px 8px rgba(26,127,186,0.25)" }}>
        <Plus size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}
