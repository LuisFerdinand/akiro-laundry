// components/employee/order-steps/ReviewStep.tsx
import { User, Phone, MapPin, Layers, Weight, Droplets, Wind, FileText, Hash } from "lucide-react";
import { OrderFormData, OrderPriceBreakdown, formatUSD } from "@/lib/utils/order-form";
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";

interface ReviewStepProps {
  formData:  OrderFormData;
  services:  ServicePricing[];
  soaps:     Soap[];
  pewangis:  Pewangi[];
  breakdown: OrderPriceBreakdown;
}

type IconTheme = "brand" | "green" | "rose" | "amber" | "purple" | "slate";
const ICON_THEMES: Record<IconTheme, { bg: string; border: string; color: string }> = {
  brand:  { bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)",  border: "#b6def5", color: "#1a7fba" },
  green:  { bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)",  border: "#86efac", color: "#16a34a" },
  rose:   { bg: "linear-gradient(135deg,#fff1f2,#ffe4e6)",  border: "#fda4af", color: "#e11d48" },
  amber:  { bg: "linear-gradient(135deg,#fffbeb,#fef3c7)",  border: "#fcd34d", color: "#d97706" },
  purple: { bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)",  border: "#c4b5fd", color: "#7c3aed" },
  slate:  { bg: "linear-gradient(135deg,#f8fafc,#f1f5f9)",  border: "#e2e8f0", color: "#64748b" },
};

function ReviewRow({ icon: Icon, label, value, theme = "brand" }: {
  icon: React.ElementType; label: string; value: string; theme?: IconTheme;
}) {
  if (!value || value === "—") return null;
  const t = ICON_THEMES[theme];
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid #f1f5f9" }}>
      <div className="flex items-center justify-center shrink-0"
        style={{ width: 28, height: 28, borderRadius: "5px", background: t.bg, border: `1.5px solid ${t.border}` }}>
        <Icon size={12} style={{ color: t.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>{label}</p>
        <p className="text-sm font-semibold mt-0.5 leading-snug" style={{ color: "#1e293b" }}>{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: "8px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", borderBottom: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: "2px", background: "linear-gradient(180deg,#1a7fba,#2496d6)", flexShrink: 0 }} />
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function PriceRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-center py-2.5" style={{ borderBottom: "1px solid #f1f5f9" }}>
      <div>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#64748b" }}>{label}</span>
        {sub && <p className="text-[10px] font-medium mt-0.5" style={{ color: "#94a3b8" }}>{sub}</p>}
      </div>
      <span className="text-sm font-bold" style={{ color: "#1e293b" }}>{value}</span>
    </div>
  );
}

export function ReviewStep({ formData, services, soaps, pewangis, breakdown }: ReviewStepProps) {
  return (
    <div className="space-y-3.5">

      {/* ── Customer card ─────────────────────────────────── */}
      <SectionCard title="Customer">
        <div style={{ padding: "0 14px" }}>
          <ReviewRow icon={User}   label="Name"    value={formData.customer.name}               theme="brand"  />
          <ReviewRow icon={Phone}  label="Phone"   value={formData.customer.phone}              theme="green"  />
          <ReviewRow icon={MapPin} label="Address" value={formData.customer.address || "—"}     theme="rose"   />
        </div>
      </SectionCard>

      {/* ── Service items ──────────────────────────────────── */}
      {formData.items.map((item, i) => {
        const service = services.find((s) => s.id === item.servicePricingId);
        const soap    = soaps.find((s)    => s.id === item.soapId);
        const pewangi = pewangis.find((p) => p.id === item.pewangiId);
        const b       = breakdown.items[i];
        const isPerPcs = service?.pricingUnit === "per_pcs";

        return (
          <SectionCard key={i} title={`Service ${i + 1}${service ? ` — ${service.name}` : ""}`}>
            <div style={{ padding: "0 14px" }}>
              <ReviewRow icon={Layers} label="Service" value={service?.name ?? "—"} theme="brand" />
              {isPerPcs
                ? <ReviewRow icon={Hash}   label="Quantity" value={item.quantity != null ? `${item.quantity} pcs` : "—"} theme="amber" />
                : <ReviewRow icon={Weight} label="Weight"   value={item.weightKg  != null ? `${item.weightKg} kg`  : "—"} theme="amber" />
              }
              {!isPerPcs && (
                <>
                  <ReviewRow icon={Droplets} label="Detergent" value={soap?.name    ?? "None"} theme="brand"  />
                  <ReviewRow icon={Wind}     label="Fragrance" value={pewangi?.name ?? "None"} theme="purple" />
                </>
              )}
            </div>

            {/* Per-item price mini-breakdown */}
            {b && (
              <div style={{ padding: "0 14px 12px" }}>
                <div style={{ marginTop: 8, borderRadius: "6px", background: "#f8fafc", border: "1.5px solid #e8edf2", overflow: "hidden" }}>
                  {b.baseServiceCost > 0 && (
                    <div className="flex justify-between items-center px-3 py-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Base</span>
                      <span className="text-xs font-bold" style={{ color: "#1e293b" }}>{formatUSD(b.baseServiceCost)}</span>
                    </div>
                  )}
                  {b.soapCost > 0 && (
                    <div className="flex justify-between items-center px-3 py-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Detergent</span>
                      <span className="text-xs font-bold" style={{ color: "#1e293b" }}>+ {formatUSD(b.soapCost)}</span>
                    </div>
                  )}
                  {b.pewangiCost > 0 && (
                    <div className="flex justify-between items-center px-3 py-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Fragrance</span>
                      <span className="text-xs font-bold" style={{ color: "#1e293b" }}>+ {formatUSD(b.pewangiCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-3 py-2">
                    <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: "#1a7fba" }}>Subtotal</span>
                    <span className="text-sm font-black" style={{ color: "#1a7fba" }}>{formatUSD(b.subtotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        );
      })}

      {/* ── Notes ──────────────────────────────────────────── */}
      {formData.notes && (
        <SectionCard title="Notes">
          <div style={{ padding: "0 14px" }}>
            <ReviewRow icon={FileText} label="Instructions" value={formData.notes} theme="slate" />
          </div>
        </SectionCard>
      )}

      {/* ── Total footer ───────────────────────────────────── */}
      <div style={{
        borderRadius: "9px",
        background: "linear-gradient(135deg,#1a7fba 0%,#2496d6 55%,#0f5a85 100%)",
        boxShadow: "0 4px 16px rgba(26,127,186,0.30)",
        padding: "14px 18px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
            Order Total
          </p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            {formData.items.length} service{formData.items.length > 1 ? "s" : ""} · incl. all add-ons
          </p>
        </div>
        <span className="font-black text-2xl tracking-tight" style={{ color: "white" }}>
          {formatUSD(breakdown.totalPrice)}
        </span>
      </div>

    </div>
  );
}