// app/employee/orders/new/page.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StepProgress }  from "@/components/employee/StepProgress";
import { CustomerStep }  from "@/components/employee/order-steps/CustomerStep";
import { ServiceStep }   from "@/components/employee/order-steps/ServiceStep";
import { AddonStep }     from "@/components/employee/order-steps/AddonStep";
import { ReviewStep }    from "@/components/employee/order-steps/ReviewStep";
import {
  OrderFormStep,
  OrderFormData,
  getNextStep,
  getPrevStep,
  validateCustomerStep,
  validateServiceStep,
  calculateOrderPrice,
  formatUSD,
} from "@/lib/utils/order-form";
import {
  getActiveServicePricing,
  getActiveSoaps,
  getActivePewangi,
  createOrder,
} from "@/lib/actions/orders";
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";

const EMPTY_FORM: OrderFormData = {
  customer:         { name: "", phone: "", address: "" },
  servicePricingId: null,
  weightKg:         null,
  soapId:           null,
  pewangiId:        null,
  notes:            "",
};

const STEP_TITLES: Record<OrderFormStep, { title: string; subtitle: string }> = {
  customer: { title: "Customer",         subtitle: "Find or register the customer"           },
  service:  { title: "Select Service",   subtitle: "Choose a service and enter laundry weight" },
  addons:   { title: "Detergent & Fragrance", subtitle: "Add extras to the order (optional)" },
  review:   { title: "Confirm Order",    subtitle: "Review everything before submitting"      },
};

export default function NewOrderPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step,        setStep]        = useState<OrderFormStep>("customer");
  const [formData,    setFormData]    = useState<OrderFormData>(EMPTY_FORM);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success,     setSuccess]     = useState<{ orderNumber: string; total: number } | null>(null);

  const [services,  setServices]  = useState<ServicePricing[]>([]);
  const [soaps,     setSoaps]     = useState<Soap[]>([]);
  const [pewangis,  setPewangis]  = useState<Pewangi[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getActiveServicePricing(), getActiveSoaps(), getActivePewangi()])
      .then(([s, so, p]) => { setServices(s); setSoaps(so); setPewangis(p); })
      .finally(() => setLoading(false));
  }, []);

  const selectedService = services.find((s) => s.id === formData.servicePricingId) ?? null;
  const selectedSoap    = soaps.find((s)    => s.id === formData.soapId)    ?? null;
  const selectedPewangi = pewangis.find((p) => p.id === formData.pewangiId) ?? null;
  const breakdown = calculateOrderPrice(selectedService, formData.weightKg ?? 0, selectedSoap, selectedPewangi);

  const handleNext = () => {
    let validation = { valid: true, errors: {} as Record<string, string> };
    if (step === "customer") {
      validation = validateCustomerStep(formData.customer, !!formData.customer.existingCustomerId);
    } else if (step === "service") {
      validation = validateServiceStep(formData.servicePricingId, formData.weightKg);
    }
    if (!validation.valid) { setErrors(validation.errors); return; }
    setErrors({});
    const next = getNextStep(step);
    if (next) setStep(next);
  };

  const handleBack = () => {
    const prev = getPrevStep(step);
    if (prev) { setStep(prev); setErrors({}); }
  };

  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createOrder(formData);
      if (result.success && result.orderNumber) {
        setSuccess({ orderNumber: result.orderNumber, total: breakdown.totalPrice });
      } else {
        setSubmitError(result.error ?? "Something went wrong.");
      }
    });
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full brand-gradient flex items-center justify-center shadow-lg">
          <CheckCircle2 size={32} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Order Created!</h2>
          <p className="text-muted-foreground text-sm mt-1">Order has been saved successfully.</p>
        </div>
        <div className="bg-brand-soft rounded-lg px-6 py-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Order Number</p>
          <p className="font-mono font-bold text-brand text-lg tracking-widest">{success.orderNumber}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-bold text-foreground">{formatUSD(success.total)}</span>
        </p>
        <div className="flex gap-3 w-full max-w-xs mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { setFormData(EMPTY_FORM); setStep("customer"); setSuccess(null); }}
          >
            New Order
          </Button>
          <Button className="flex-1 brand-gradient border-0" onClick={() => router.push("/employee/orders")}>
            View Orders
          </Button>
        </div>
      </div>
    );
  }

  const { title, subtitle } = STEP_TITLES[step];

  return (
    <div>
      <StepProgress current={step} />

      <div className="px-4 pb-6 space-y-5">
        {/* Page heading */}
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Step content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-brand animate-spin" />
          </div>
        ) : (
          <>
            {step === "customer" && (
              <CustomerStep
                data={formData.customer}
                onChange={(c) => setFormData((f) => ({ ...f, customer: c }))}
                errors={errors}
              />
            )}
            {step === "service" && (
              <ServiceStep
                services={services}
                servicePricingId={formData.servicePricingId}
                weightKg={formData.weightKg}
                onChange={(s, w) => setFormData((f) => ({ ...f, servicePricingId: s, weightKg: w }))}
                errors={errors}
              />
            )}
            {step === "addons" && (
              <AddonStep
                soaps={soaps}
                pewangis={pewangis}
                soapId={formData.soapId}
                pewangiId={formData.pewangiId}
                notes={formData.notes}
                onChange={(s, p, n) => setFormData((f) => ({ ...f, soapId: s, pewangiId: p, notes: n }))}
              />
            )}
            {step === "review" && (
              <ReviewStep
                formData={formData}
                services={services}
                soaps={soaps}
                pewangis={pewangis}
                breakdown={breakdown}
              />
            )}
          </>
        )}

        {/* Estimated total pill */}
        {(step === "service" || step === "addons") && breakdown.totalPrice > 0 && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-brand-soft border border-brand/10">
            <span className="text-sm text-brand/80 font-medium">Estimated Total</span>
            <span className="font-bold text-brand">{formatUSD(breakdown.totalPrice)}</span>
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-1">
          {step !== "customer" && (
            <Button variant="outline" onClick={handleBack} className="gap-1.5">
              <ChevronLeft size={16} /> Back
            </Button>
          )}
          {step !== "review" ? (
            <Button className="flex-1 brand-gradient border-0 gap-1.5" onClick={handleNext}>
              Continue <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              className="flex-1 brand-gradient border-0 gap-2"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Submitting…</>
              ) : (
                <><Check size={15} /> Confirm Order</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}