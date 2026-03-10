// components/employee/order-steps/ReviewStep.tsx
import { Separator } from "@/components/ui/separator";
import { OrderFormData, PriceBreakdown, formatUSD } from "@/lib/utils/order-form";
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";

interface ReviewStepProps {
  formData:  OrderFormData;
  services:  ServicePricing[];
  soaps:     Soap[];
  pewangis:  Pewangi[];
  breakdown: PriceBreakdown;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 gap-4">
      <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
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
      <div className="rounded-lg border bg-white divide-y divide-border">
        <div className="px-4 py-2 bg-muted/50 rounded-t-lg">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Details</p>
        </div>
        <div className="px-4">
          <Row label="Customer" value={formData.customer.name} />
          <Separator className="my-0" />
          <Row label="Phone"    value={formData.customer.phone} />
          <Separator className="my-0" />
          <Row label="Address"  value={formData.customer.address || "—"} />
          <Separator className="my-0" />
          <Row label="Service"  value={service?.name ?? "—"} />
          <Separator className="my-0" />
          <Row label="Weight"   value={`${formData.weightKg} kg`} />
          <Separator className="my-0" />
          <Row label="Detergent"  value={soap?.name    ?? "None"} />
          <Separator className="my-0" />
          <Row label="Fragrance"  value={pewangi?.name ?? "None"} />
          {formData.notes && (
            <>
              <Separator className="my-0" />
              <Row label="Notes" value={formData.notes} />
            </>
          )}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-2 bg-muted/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price Breakdown</p>
        </div>
        <div className="px-4 divide-y divide-border">
          <Row label="Base service"  value={formatUSD(breakdown.baseServiceCost)} />
          {breakdown.soapCost > 0    && <Row label="Detergent"  value={`+ ${formatUSD(breakdown.soapCost)}`} />}
          {breakdown.pewangiCost > 0 && <Row label="Fragrance"  value={`+ ${formatUSD(breakdown.pewangiCost)}`} />}
        </div>
        <div className="px-4 py-3 brand-gradient flex justify-between items-center">
          <span className="text-white/80 text-sm font-medium">Total</span>
          <span className="text-white font-bold text-lg">{formatUSD(breakdown.totalPrice)}</span>
        </div>
      </div>
    </div>
  );
}