// components/employee/order-steps/AddonStep.tsx
import { Droplets, Wind, FileText, X, CheckCircle2 } from "lucide-react";
import { formatUSD } from "@/lib/utils/order-form";
import type { Soap, Pewangi } from "@/lib/db/schema";

interface AddonStepProps {
  soaps:     Soap[];
  pewangis:  Pewangi[];
  soapId:    number | null;
  pewangiId: number | null;
  notes:     string;
  onChange:  (soapId: number | null, pewangiId: number | null, notes: string) => void;
}

type AccentKey = "blue" | "purple";

const ACCENTS: Record<AccentKey, {
  border: string;
  activeBg: string;
  iconActiveBg: string;
  iconInactiveBg: string;
  iconInactiveBorder: string;
  iconActiveColor: string;
  iconInactiveColor: string;
  labelActive: string;
  priceBg: string;
  priceColor: string;
}> = {
  blue: {
    border:             "#1a7fba",
    activeBg:           "linear-gradient(135deg, #edf7fd 0%, #dff0fb 100%)",
    iconActiveBg:       "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)",
    iconInactiveBg:     "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
    iconInactiveBorder: "#b6def5",
    iconActiveColor:    "white",
    iconInactiveColor:  "#1a7fba",
    labelActive:        "#0f5a85",
    priceBg:            "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)",
    priceColor:         "white",
  },
  purple: {
    border:             "#8b5cf6",
    activeBg:           "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
    iconActiveBg:       "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    iconInactiveBg:     "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
    iconInactiveBorder: "#c4b5fd",
    iconActiveColor:    "white",
    iconInactiveColor:  "#7c3aed",
    labelActive:        "#5b21b6",
    priceBg:            "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    priceColor:         "white",
  },
};

function AddonOption({
  label,
  sublabel,
  hint,
  icon: Icon,
  active,
  onClick,
  accent = "blue",
  isNone = false,
}: {
  label:     string;
  sublabel?: string;
  hint?:     string;
  icon:      React.ElementType;
  active:    boolean;
  onClick:   () => void;
  accent?:   AccentKey;
  isNone?:   boolean;
}) {
  const a = ACCENTS[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all duration-150 active:scale-[0.99]"
      style={{
        display: "flex",
        alignItems: "stretch",
        borderRadius: "8px",
        borderWidth: "2px",
        borderStyle: active ? "solid" : isNone ? "dashed" : "solid",
        borderColor: active ? a.border : "#e2e8f0",
        background: active ? a.activeBg : "white",
        boxShadow: active ? `0 2px 12px rgba(26,127,186,0.10)` : "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = accent === "blue" ? "#b6def5" : "#c4b5fd";
          e.currentTarget.style.borderStyle = "solid";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(26,127,186,0.07)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.borderStyle = isNone ? "dashed" : "solid";
          e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
        }
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: "3px",
        flexShrink: 0,
        background: active
          ? (accent === "blue"
              ? "linear-gradient(180deg, #1a7fba 0%, #2496d6 100%)"
              : "linear-gradient(180deg, #7c3aed 0%, #8b5cf6 100%)")
          : "transparent",
        transition: "background 0.15s",
      }} />

      <div className="flex items-center gap-3 px-3.5 py-3 flex-1 min-w-0">
        {/* Icon */}
        <div
          className="shrink-0 flex items-center justify-center w-8 h-8"
          style={{
            borderRadius: "6px",
            background: active ? a.iconActiveBg : a.iconInactiveBg,
            border: active ? "none" : `1.5px solid ${a.iconInactiveBorder}`,
            boxShadow: active ? "0 2px 8px rgba(26,127,186,0.2)" : "none",
          }}
        >
          <Icon size={13} style={{ color: active ? a.iconActiveColor : a.iconInactiveColor }} />
        </div>

        {/* Label + hint */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-bold leading-tight"
            style={{ color: active ? a.labelActive : isNone ? "#94a3b8" : "#1e293b" }}
          >
            {label}
          </p>
          {hint && (
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "#94a3b8" }}>
              {hint}
            </p>
          )}
        </div>

        {/* Price badge or checkmark */}
        {sublabel ? (
          <span
            className="shrink-0 text-[11px] font-black"
            style={{
              padding: "4px 9px",
              borderRadius: "4px",
              background: active ? a.priceBg : "#f1f5f9",
              color: active ? a.priceColor : "#64748b",
              border: active ? "none" : "1.5px solid #e2e8f0",
            }}
          >
            {sublabel}
          </span>
        ) : active ? (
          <CheckCircle2
            size={16}
            style={{ color: accent === "blue" ? "#1a7fba" : "#7c3aed", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 16 }} />
        )}
      </div>
    </button>
  );
}

export function AddonStep({ soaps, pewangis, soapId, pewangiId, notes, onChange }: AddonStepProps) {
  return (
    <div className="space-y-6">

      {/* ── Detergent ──────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">
            Detergent
          </label>
          <span className="text-[10px] font-semibold text-slate-300">optional</span>
        </div>
        <div className="space-y-1.5">
          <AddonOption
            label="No detergent"
            icon={X}
            active={soapId === null}
            onClick={() => onChange(null, pewangiId, notes)}
            accent="blue"
            isNone
          />
          {soaps.map((s) => (
            <AddonOption
              key={s.id}
              label={s.name}
              sublabel={`+${formatUSD(parseFloat(s.pricePerKg))}/kg`}
              hint={s.brand ?? undefined}
              icon={Droplets}
              active={soapId === s.id}
              onClick={() => onChange(s.id, pewangiId, notes)}
              accent="blue"
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1.5px dashed #e2e8f0" }} />

      {/* ── Fragrance ──────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">
            Fragrance
          </label>
          <span className="text-[10px] font-semibold text-slate-300">optional</span>
        </div>
        <div className="space-y-1.5">
          <AddonOption
            label="No fragrance"
            icon={X}
            active={pewangiId === null}
            onClick={() => onChange(soapId, null, notes)}
            accent="purple"
            isNone
          />
          {pewangis.map((p) => (
            <AddonOption
              key={p.id}
              label={p.name}
              sublabel={`+${formatUSD(parseFloat(p.pricePerKg))}/kg`}
              hint={p.brand ?? undefined}
              icon={Wind}
              active={pewangiId === p.id}
              onClick={() => onChange(soapId, p.id, notes)}
              accent="purple"
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1.5px dashed #e2e8f0" }} />

      {/* ── Notes ──────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label
            className="block text-[11px] font-black uppercase tracking-widest text-slate-400"
            htmlFor="notes"
          >
            Notes
          </label>
          <span className="text-[10px] font-semibold text-slate-300">optional</span>
        </div>
        <div className="relative">
          <div
            className="absolute left-3.5 top-3.5 pointer-events-none flex items-center justify-center w-8 h-8"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "1.5px solid #e2e8f0",
            }}
          >
            <FileText size={13} style={{ color: "#94a3b8" }} />
          </div>
          <textarea
            id="notes"
            className="w-full pl-14 pr-4 pt-3.5 pb-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-300 placeholder:font-normal bg-white resize-none outline-none transition-all duration-150"
            style={{
              borderRadius: "8px",
              border: "2px solid #e2e8f0",
            }}
            rows={3}
            placeholder="Special instructions, stain locations…"
            value={notes}
            onChange={(e) => onChange(soapId, pewangiId, e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#1a7fba";
              e.currentTarget.style.boxShadow = "0 0 0 3.5px rgba(26,127,186,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

    </div>
  );
}