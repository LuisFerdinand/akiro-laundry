// components/employee/order-steps/ServiceStep.tsx
import { Weight } from "lucide-react";
import { cn }    from "@/lib/utils";
import { formatUSD } from "@/lib/utils/order-form";
import type { ServicePricing } from "@/lib/db/schema";

interface ServiceStepProps {
  services: ServicePricing[];
  servicePricingId: number | null;
  weightKg: number | null;
  onChange: (servicePricingId: number | null, weightKg: number | null) => void;
  errors: Record<string, string>;
}

export function ServiceStep({ services, servicePricingId, weightKg, onChange, errors }: ServiceStepProps) {
  return (
    <div className="space-y-5">

      {/* Service cards */}
      <div className="space-y-2">
        <label className="field-label">Service Type</label>
        <div className="space-y-2.5">
          {services.map((s) => {
            const active = servicePricingId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onChange(s.id, weightKg)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                  active
                    ? "border-brand bg-brand-soft shadow-md shadow-brand/10"
                    : "border-border bg-white hover:border-brand/30",
                )}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className={cn("font-extrabold text-sm", active ? "text-brand-dark" : "text-foreground")}>
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium capitalize">
                    {s.category} · {s.pricingUnit === "per_pcs" ? "per piece" : "per kg"}
                    {s.duration && ` · ${s.duration}`}
                  </p>
                  {s.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>
                  )}
                </div>
                <div className={cn(
                  "text-right shrink-0 px-3 py-1.5 rounded-xl",
                  active ? "bg-brand text-white" : "bg-muted text-foreground",
                )}>
                  <p className="font-extrabold text-sm leading-none">
                    {formatUSD(parseFloat(s.basePricePerKg))}
                  </p>
                  <p className="text-[10px] opacity-70 mt-0.5 font-semibold">
                    {s.pricingUnit === "per_pcs" ? "/pc" : "/kg"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.service && (
          <p className="text-xs text-destructive font-semibold mt-1">{errors.service}</p>
        )}
      </div>

      {/* Weight input */}
      <div className="space-y-1.5">
        <label className="field-label" htmlFor="weight">Weight</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-brand-soft border border-brand-muted flex items-center justify-center">
            <Weight size={13} className="text-brand" />
          </div>
          <input
            id="weight"
            type="number"
            min="0.1"
            step="0.1"
            max="100"
            className="field-input pl-14 pr-12"
            placeholder="e.g. 3.5"
            value={weightKg ?? ""}
            onChange={(e) => onChange(servicePricingId, e.target.value ? parseFloat(e.target.value) : null)}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
            kg
          </span>
        </div>
        {errors.weight && (
          <p className="text-xs text-destructive font-semibold">{errors.weight}</p>
        )}
      </div>
    </div>
  );
}