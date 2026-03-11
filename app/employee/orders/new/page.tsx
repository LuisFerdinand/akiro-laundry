// app/employee/orders/new/page.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check, Loader2, CheckCircle2, Sparkles } from "lucide-react";
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

const STEP_TITLES: Record<OrderFormStep, { title: string; subtitle: string; emoji: string }> = {
  customer: { title: "Customer Info",        subtitle: "Find or register the customer",            emoji: "👤" },
  service:  { title: "Pick a Service",       subtitle: "Choose a service and enter laundry weight", emoji: "🧺" },
  addons:   { title: "Extras",               subtitle: "Add detergent or fragrance (optional)",     emoji: "✨" },
  review:   { title: "Confirm Order",        subtitle: "Review everything before submitting",        emoji: "📋" },
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

  // ── Success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center gap-5">
        {/* Confetti-like icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-[32px] flex items-center justify-center shadow-xl shadow-brand/25"
            style={{ background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)" }}>
            <CheckCircle2 size={44} className="text-white" />
          </div>
          <span className="absolute -top-2 -right-2 text-2xl">🎉</span>
        </div>

        <div>
          <h2 className="font-extrabold text-2xl text-foreground" style={{ fontFamily: "Sora, sans-serif" }}>
            Order Created!
          </h2>
          <p className="text-muted-foreground text-sm mt-1.5 font-medium">
            The order has been saved successfully.
          </p>
        </div>

        {/* Order number pill */}
        <div className="bg-brand-soft border-2 border-brand-muted rounded-3xl px-8 py-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand/50 mb-1">Order Number</p>
          <p className="font-mono font-extrabold text-brand text-2xl tracking-widest">{success.orderNumber}</p>
        </div>

        <p className="text-sm text-muted-foreground font-medium">
          Total:{" "}
          <span className="font-extrabold text-foreground text-base">{formatUSD(success.total)}</span>
        </p>

        <div className="flex gap-3 w-full max-w-xs mt-1">
          <button
            className="flex-1 py-3 rounded-2xl border-2 border-border text-sm font-bold text-foreground bg-white hover:border-brand/30 transition-colors"
            onClick={() => { setFormData(EMPTY_FORM); setStep("customer"); setSuccess(null); }}
          >
            New Order
          </button>
          <button
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-brand/30 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 55%, #0f5a85 100%)" }}
            onClick={() => router.push("/employee/orders")}
          >
            View Orders
          </button>
        </div>
      </div>
    );
  }

  const { title, subtitle, emoji } = STEP_TITLES[step];

  return (
    <div>
      <StepProgress current={step} />

      {/* Scrollable content — extra bottom padding for the floating bar */}
      <div className="px-4 pb-36 space-y-5">

        {/* Page heading */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-soft border border-brand-muted flex items-center justify-center text-xl shrink-0">
            {emoji}
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-foreground leading-tight" style={{ fontFamily: "Sora, sans-serif" }}>
              {title}
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="text-brand animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Loading…</p>
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

        {submitError && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertDescription className="font-medium">{submitError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Floating action bar ──────────────────────────────────
          Sits above the bottom nav (bottom nav is 80px tall,
          we add 8px gap so: bottom-[88px])                    */}
      <div className="akiro-floating-bar">

        {/* Estimated total — show on service & addons steps */}
        {(step === "service" || step === "addons") && breakdown.totalPrice > 0 && (
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-xs font-bold text-muted-foreground">Estimated Total</span>
            <span className="font-extrabold text-brand text-sm" style={{ fontFamily: "Sora, sans-serif" }}>
              {formatUSD(breakdown.totalPrice)}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          {step !== "customer" && (
            <button
              onClick={handleBack}
              className="akiro-back-btn"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {step !== "review" ? (
            <button
              className="akiro-continue-btn"
              onClick={handleNext}
            >
              Continue
              <ChevronRight size={17} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              className="akiro-continue-btn"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              ) : (
                <><Sparkles size={16} /> Confirm Order</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}