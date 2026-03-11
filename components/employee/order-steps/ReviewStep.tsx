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

function ReviewRow({
  icon: Icon,
  label,
  value,
  iconBg = "bg-brand-soft",
  iconColor = "text-brand",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconBg?: string;
  iconColor?: string;
}) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div className={`w-8 h-8 rounded-2xl ${iconBg} border border-border/60 flex items-center justify-center shrink-0`}>
        <Icon size={14} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">{value}</p>
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

      {/* Customer & order details */}
      <div className="akiro-section-card">
        <div className="akiro-section-header">
          <p>Order Details</p>
        </div>
        <div className="px-4">
          <ReviewRow icon={User}     label="Customer"  value={formData.customer.name} />
          <ReviewRow icon={Phone}    label="Phone"     value={formData.customer.phone} />
          <ReviewRow icon={MapPin}   label="Address"   value={formData.customer.address || "—"} iconBg="bg-rose-50" iconColor="text-rose-400" />
          <ReviewRow icon={Layers}   label="Service"   value={service?.name ?? "—"} iconBg="bg-blue-50" iconColor="text-blue-400" />
          <ReviewRow icon={Weight}   label="Weight"    value={`${formData.weightKg} kg`} iconBg="bg-amber-50" iconColor="text-amber-400" />
          <ReviewRow icon={Droplets} label="Detergent" value={soap?.name ?? "None"} iconBg="bg-blue-50" iconColor="text-blue-400" />
          <ReviewRow icon={Wind}     label="Fragrance" value={pewangi?.name ?? "None"} iconBg="bg-purple-50" iconColor="text-purple-400" />
          {formData.notes && (
            <ReviewRow icon={FileText} label="Notes" value={formData.notes} iconBg="bg-slate-50" iconColor="text-slate-400" />
          )}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="akiro-section-card overflow-hidden">
        <div className="akiro-section-header">
          <p>Price Breakdown</p>
        </div>
        <div className="px-4 divide-y divide-border/40">
          <div className="flex justify-between items-center py-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Base service</span>
            <span className="text-sm font-bold">{formatUSD(breakdown.baseServiceCost)}</span>
          </div>
          {breakdown.soapCost > 0 && (
            <div className="flex justify-between items-center py-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Detergent</span>
              <span className="text-sm font-bold">+ {formatUSD(breakdown.soapCost)}</span>
            </div>
          )}
          {breakdown.pewangiCost > 0 && (
            <div className="flex justify-between items-center py-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Fragrance</span>
              <span className="text-sm font-bold">+ {formatUSD(breakdown.pewangiCost)}</span>
            </div>
          )}
        </div>
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)" }}>
          <div className="flex justify-between items-center px-5 py-4">
            <span className="text-white/75 text-sm font-bold">Total</span>
            <span className="text-white font-extrabold text-xl" style={{ fontFamily: "Sora, sans-serif" }}>
              {formatUSD(breakdown.totalPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}