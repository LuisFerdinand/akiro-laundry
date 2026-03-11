// components/employee/order-steps/ReviewStep.tsx
import { User, Phone, MapPin, Layers, Weight, Droplets, Wind, FileText } from "lucide-react";
import { OrderFormData, PriceBreakdown, formatUSD } from "@/lib/utils/order-form";
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";

interface ReviewStepProps {
  formData:  OrderFormData;
  services:  ServicePricing[];
  soaps:     Soap[];
  pewangis:  Pewangi[];
  breakdown: PriceBreakdown;
}

type IconTheme = "brand" | "green" | "rose" | "amber" | "purple" | "slate";

const ICON_THEMES: Record<IconTheme, { bg: string; border: string; color: string }> = {
  brand:  { bg: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)", border: "#b6def5",  color: "#1a7fba" },
  green:  { bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#86efac",  color: "#16a34a" },
  rose:   { bg: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", border: "#fda4af",  color: "#e11d48" },
  amber:  { bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "#fcd34d",  color: "#d97706" },
  purple: { bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "#c4b5fd",  color: "#7c3aed" },
  slate:  { bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "#e2e8f0",  color: "#64748b" },
};

function ReviewRow({
  icon: Icon,
  label,
  value,
  theme = "brand",
}: {
  icon:   React.ElementType;
  label:  string;
  value:  string;
  theme?: IconTheme;
}) {
  if (!value || value === "—") return null;
  const t = ICON_THEMES[theme];
  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: "1px solid #f1f5f9" }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: "6px",
          background: t.bg,
          border: `1.5px solid ${t.border}`,
        }}
      >
        <Icon size={13} style={{ color: t.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>
          {label}
        </p>
        <p className="text-sm font-semibold mt-0.5 leading-snug" style={{ color: "#1e293b" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function ReviewStep({ formData, services, soaps, pewangis, breakdown }: ReviewStepProps) {
  const service = services.find((s) => s.id === formData.servicePricingId);
  const soap    = soaps.find((s)    => s.id === formData.soapId);
  const pewangi = pewangis.find((p) => p.id === formData.pewangiId);

  return (
    <div className="space-y-4">

      {/* ── Order details card ─────────────────────────────── */}
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <div
          style={{
            padding: "9px 16px",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderBottom: "1.5px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 4,
              height: 16,
              borderRadius: "2px",
              background: "linear-gradient(180deg, #1a7fba 0%, #2496d6 100%)",
              flexShrink: 0,
            }}
          />
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
            Order Details
          </p>
        </div>

        <div style={{ padding: "0 16px" }}>
          <ReviewRow icon={User}     label="Customer"  value={formData.customer.name}            theme="brand"  />
          <ReviewRow icon={Phone}    label="Phone"     value={formData.customer.phone}            theme="green"  />
          <ReviewRow icon={MapPin}   label="Address"   value={formData.customer.address || "—"}  theme="rose"   />
          <ReviewRow icon={Layers}   label="Service"   value={service?.name ?? "—"}              theme="brand"  />
          <ReviewRow icon={Weight}   label="Weight"    value={`${formData.weightKg} kg`}         theme="amber"  />
          <ReviewRow icon={Droplets} label="Detergent" value={soap?.name ?? "None"}              theme="brand"  />
          <ReviewRow icon={Wind}     label="Fragrance" value={pewangi?.name ?? "None"}           theme="purple" />
          {formData.notes && (
            <ReviewRow icon={FileText} label="Notes"  value={formData.notes}                    theme="slate"  />
          )}
        </div>
      </div>

      {/* ── Price breakdown card ───────────────────────────── */}
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <div
          style={{
            padding: "9px 16px",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderBottom: "1.5px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 4,
              height: 16,
              borderRadius: "2px",
              background: "linear-gradient(180deg, #1a7fba 0%, #2496d6 100%)",
              flexShrink: 0,
            }}
          />
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>
            Price Breakdown
          </p>
        </div>

        {/* Line items */}
        <div style={{ padding: "0 16px" }}>
          <div
            className="flex justify-between items-center py-3"
            style={{ borderBottom: "1px solid #f1f5f9" }}
          >
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#64748b" }}>
              Base service
            </span>
            <span className="text-sm font-bold" style={{ color: "#1e293b" }}>
              {formatUSD(breakdown.baseServiceCost)}
            </span>
          </div>

          {breakdown.soapCost > 0 && (
            <div
              className="flex justify-between items-center py-3"
              style={{ borderBottom: "1px solid #f1f5f9" }}
            >
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Detergent
              </span>
              <span className="text-sm font-bold" style={{ color: "#1e293b" }}>
                + {formatUSD(breakdown.soapCost)}
              </span>
            </div>
          )}

          {breakdown.pewangiCost > 0 && (
            <div
              className="flex justify-between items-center py-3"
              style={{ borderBottom: "1px solid #f1f5f9" }}
            >
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Fragrance
              </span>
              <span className="text-sm font-bold" style={{ color: "#1e293b" }}>
                + {formatUSD(breakdown.pewangiCost)}
              </span>
            </div>
          )}
        </div>

        {/* Total footer */}
        <div style={{ padding: "12px 16px 16px" }}>
          <div
            style={{
              borderRadius: "8px",
              background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)",
              boxShadow: "0 4px 16px rgba(26,127,186,0.30)",
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Total
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                incl. all add-ons
              </p>
            </div>
            <span
              className="font-black text-2xl tracking-tight"
              style={{ color: "white" }}
            >
              {formatUSD(breakdown.totalPrice)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}