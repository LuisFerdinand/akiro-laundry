// components/employee/order-steps/ServiceStep.tsx
import { Weight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="space-y-1.5">
        <Label>Service Type</Label>
        <div className="space-y-2">
          {services.map((s) => {
            const active = servicePricingId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onChange(s.id, weightKg)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border-2 text-left transition-all",
                  active
                    ? "border-brand bg-brand-soft/40"
                    : "border-border bg-white hover:border-brand/30",
                )}
              >
                <div>
                  <p className={cn("font-semibold text-sm", active ? "text-brand" : "text-foreground")}>
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {s.category} · {s.pricingUnit === "per_pcs" ? "per piece" : "per kg"}
                    {s.duration && ` · ${s.duration}`}
                  </p>
                  {s.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={cn("font-bold text-sm", active ? "text-brand" : "text-foreground")}>
                    {formatUSD(parseFloat(s.basePricePerKg))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.pricingUnit === "per_pcs" ? "/pc" : "/kg"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.service && <p className="text-xs text-destructive">{errors.service}</p>}
      </div>

      {/* Weight input */}
      <div className="space-y-1.5">
        <Label htmlFor="weight">Weight (kg)</Label>
        <div className="relative">
          <Weight size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="weight"
            type="number"
            min="0.1"
            step="0.1"
            max="100"
            className="pl-9 pr-10"
            placeholder="e.g. 3.5"
            value={weightKg ?? ""}
            onChange={(e) => onChange(servicePricingId, e.target.value ? parseFloat(e.target.value) : null)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">kg</span>
        </div>
        {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
      </div>
    </div>
  );
}