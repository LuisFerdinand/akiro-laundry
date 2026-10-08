// components/employee/order-steps/ClothesCountStep.tsx
"use client";
//
// New-order step: does the customer want to count the clothes together now?
//   • With customer → count every piece; it's printed on the receipt.
//   • Staff later   → nothing to count now; not on the first receipt, but the
//                     count prints once recorded and the receipt is reprinted.

import { Users, ClipboardCheck, Printer, EyeOff, Info } from "lucide-react";
import { ClothesCountEditor } from "@/components/shared/ClothesCountEditor";
import type { ClothesCountFormData, ClothesCountMode, ClothingSetup } from "@/lib/utils/clothes-count";

interface Props {
  setup:      ClothingSetup;
  serviceIds: (number | null)[];
  value:      ClothesCountFormData;
  onChange:   (value: ClothesCountFormData) => void;
  errors:     Record<string, string>;
}

const MODES: {
  mode: ClothesCountMode; title: string; text: string;
  Icon: React.ElementType; ReceiptIcon: React.ElementType; receipt: string;
  color: string; bg: string; border: string;
}[] = [
  {
    mode: "customer", title: "Count with customer",
    text: "Count every piece together, in front of the customer.",
    Icon: Users, ReceiptIcon: Printer, receipt: "Printed on the receipt",
    color: "#047857", bg: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "#34d399",
  },
  {
    mode: "staff", title: "Staff count later",
    text: "The customer leaves the clothes with us — staff count them afterwards.",
    Icon: ClipboardCheck, ReceiptIcon: EyeOff, receipt: "Not on the first receipt — prints on a reprint",
    color: "#1a7fba", bg: "linear-gradient(135deg,#edf7fd,#dbeefa)", border: "#7cc4ec",
  },
];

export function ClothesCountStep({ setup, serviceIds, value, onChange, errors }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600">
        Does the customer want to count the clothes together with us?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="How are the clothes counted?">
        {MODES.map((m) => {
          const active = value.mode === m.mode;
          return (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ ...value, mode: m.mode })}
              style={{
                textAlign: "left", padding: "14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                border: `2px solid ${active ? m.border : "#e2e8f0"}`,
                background: active ? m.bg : "white",
                boxShadow: active ? `0 4px 14px ${m.border}40` : "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active ? "white" : "#f8fafc", border: `1.5px solid ${active ? m.border : "#e2e8f0"}`,
                }}>
                  <m.Icon size={17} style={{ color: active ? m.color : "#94a3b8" }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 900, color: active ? m.color : "#1e293b" }}>{m.title}</p>
                <span style={{
                  marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${active ? m.color : "#cbd5e1"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {active && <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#475569", marginTop: 8, lineHeight: 1.45 }}>{m.text}</p>
              <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: active ? m.color : "#94a3b8", marginTop: 6 }}>
                <m.ReceiptIcon size={12} /> {m.receipt}
              </p>
            </button>
          );
        })}
      </div>

      {errors.clothesCountMode && (
        <p className="text-xs font-semibold text-rose-600">{errors.clothesCountMode}</p>
      )}

      {value.mode === "customer" && (
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Pieces counted with the customer
          </label>
          <ClothesCountEditor
            setup={setup}
            serviceIds={serviceIds}
            lines={value.lines}
            onChange={(lines) => onChange({ ...value, lines })}
          />
          {errors.clothesCountLines && (
            <p className="text-xs font-semibold text-rose-600">{errors.clothesCountLines}</p>
          )}
        </div>
      )}

      {value.mode === "staff" && (
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
          <Info size={15} style={{ color: "#64748b", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
            Nothing to count now. Once the clothes are counted, record the count on the order page
            (<b>Clothes Count</b>). It isn&apos;t on this first receipt, but it prints when the receipt is reprinted.
          </p>
        </div>
      )}
    </div>
  );
}
