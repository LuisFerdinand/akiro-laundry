// components/shared/ClothesCountPanel.tsx
"use client";
//
// The order page's clothes count: how it was counted at drop-off, the pieces,
// and an editor so staff can record a count they did after drop-off (or fix
// one). Changing a count made with the customer flags the order as edited —
// that count is on the customer's receipt.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, ClipboardCheck, HelpCircle, Pencil, Loader2, Save, AlertTriangle, Printer, EyeOff } from "lucide-react";
import { ClothesCountEditor } from "@/components/shared/ClothesCountEditor";
import { saveOrderClothesCount } from "@/lib/actions/clothing-items";
import {
  clothesCountModeLabel, totalPieces,
  type ClothesCountLine, type ClothingSetup,
} from "@/lib/utils/clothes-count";
import type { OrderClothingCount } from "@/lib/db/schema";

interface Props {
  orderId:    number;
  mode:       string | null;
  counts:     OrderClothingCount[];
  setup:      ClothingSetup;
  serviceIds: number[];
}

const MODE_STYLE: Record<string, { color: string; bg: string; border: string; Icon: React.ElementType }> = {
  customer: { color: "#047857", bg: "#ecfdf5", border: "#6ee7b7", Icon: Users },
  staff:    { color: "#1a7fba", bg: "#edf7fd", border: "#b6def5", Icon: ClipboardCheck },
  none:     { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: HelpCircle },
};

export function ClothesCountPanel({ orderId, mode, counts, setup, serviceIds }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [lines,   setLines]   = useState<ClothesCountLine[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  start]      = useTransition();

  const modeStyle = MODE_STYLE[mode ?? "none"] ?? MODE_STYLE.none;
  const total = totalPieces(counts);
  const withCustomer = mode === "customer";

  const startEditing = () => {
    setLines(counts.map((c) => ({ clothingItemId: c.clothingItemId, name: c.name, quantity: c.quantity })));
    setError(null);
    setEditing(true);
  };

  const save = () => {
    setError(null);
    start(async () => {
      const res = await saveOrderClothesCount(orderId, lines);
      if (res.success) { setEditing(false); router.refresh(); }
      else setError(res.error ?? "Failed to save the count.");
    });
  };

  return (
    <div style={{ padding: "14px 0", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* How it was counted */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999,
          background: modeStyle.bg, border: `1px solid ${modeStyle.border}`, color: modeStyle.color, fontSize: 11, fontWeight: 800,
        }}>
          <modeStyle.Icon size={12} /> {clothesCountModeLabel(mode)}
        </span>
        {mode && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: withCustomer ? "#047857" : "#94a3b8" }}>
            {withCustomer ? <Printer size={11} /> : <EyeOff size={11} />}
            {withCustomer ? "Printed on the receipt" : "Not printed on the receipt"}
          </span>
        )}
      </div>

      {!editing ? (
        <>
          {counts.length > 0 ? (
            <div style={{ borderRadius: 8, background: "#f8fafc", border: "1.5px solid #e8edf2", overflow: "hidden" }}>
              {counts.map((c, i) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{c.quantity}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", borderTop: "1.5px solid #6ee7b7" }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", color: "#047857" }}>Total pieces</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#047857", fontVariantNumeric: "tabular-nums" }}>{total}</span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#94a3b8", padding: "2px 0" }}>
              {mode === "staff" ? "Not counted yet — enter the count once the clothes are counted." : "No count recorded for this order."}
            </p>
          )}

          <button
            type="button"
            onClick={startEditing}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: 10, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, fontWeight: 800,
              ...(counts.length === 0
                ? { border: "none", background: "linear-gradient(135deg,#1a7fba,#2496d6)", color: "white" }
                : { border: "1.5px dashed #b6def5", background: "#edf7fd", color: "#1a7fba" }),
            }}
          >
            <Pencil size={12} /> {counts.length === 0 ? "Enter count" : "Edit count"}
          </button>
        </>
      ) : (
        <>
          {withCustomer && (
            <div style={{ display: "flex", gap: 8, padding: "9px 12px", borderRadius: 8, background: "#fffbeb", border: "1.5px solid #fde68a" }}>
              <AlertTriangle size={13} style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.45 }}>
                This count was made with the customer and is on their receipt. Changing it marks the order as edited.
              </p>
            </div>
          )}

          <ClothesCountEditor setup={setup} serviceIds={serviceIds} lines={lines} onChange={setLines} />

          {error && <p style={{ fontSize: 11, fontWeight: 600, color: "#be123c" }}>{error}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null); }}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 700, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                flex: 2, padding: 10, borderRadius: 8, border: "none", fontFamily: "inherit",
                background: saving ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6)",
                color: "white", fontSize: 12, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save count · {totalPieces(lines)} pcs
            </button>
          </div>
        </>
      )}
    </div>
  );
}
