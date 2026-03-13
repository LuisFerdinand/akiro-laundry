// app/employee/orders/new/page.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Loader2, CheckCircle2,
  Sparkles, User, ShoppingBag, ClipboardList, CreditCard,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button }        from "@/components/ui/button";
import { StepProgress }  from "@/components/employee/StepProgress";
import { CustomerStep }  from "@/components/employee/order-steps/CustomerStep";
import { ServiceStep }   from "@/components/employee/order-steps/ServiceStep";
import { ReviewStep }    from "@/components/employee/order-steps/ReviewStep";
import { PaymentModal }  from "@/components/employee/PaymentModal";
import {
  OrderFormStep,
  OrderFormData,
  OrderItemFormData,
  OrderPriceBreakdown,
  EMPTY_ORDER_ITEM,
  getNextStep,
  getPrevStep,
  validateCustomerStep,
  validateServiceItems,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: OrderFormData = {
  customer: { name: "", phone: "", address: "" },
  items:    [{ ...EMPTY_ORDER_ITEM }],
  notes:    "",
};

const STEP_TITLES: Record<OrderFormStep, {
  title: string; subtitle: string;
  Icon: React.ElementType; iconBg: string; iconColor: string;
}> = {
  customer: {
    title: "Customer Info",      subtitle: "Find or register the customer",
    Icon: User,                  iconBg: "bg-blue-50 border-blue-100",   iconColor: "text-blue-500",
  },
  service: {
    title: "Services & Add-ons", subtitle: "Choose services, quantities and extras",
    Icon: ShoppingBag,           iconBg: "bg-violet-50 border-violet-100", iconColor: "text-violet-500",
  },
  review: {
    title: "Confirm Order",      subtitle: "Review everything before submitting",
    Icon: ClipboardList,         iconBg: "bg-amber-50 border-amber-100", iconColor: "text-amber-500",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewOrderPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step,        setStep]        = useState<OrderFormStep>("customer");
  const [formData,    setFormData]    = useState<OrderFormData>(EMPTY_FORM);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    orderId: number; orderNumber: string; total: number; customerName: string;
  } | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentDone,  setPaymentDone]  = useState(false);
  const [changeGiven,  setChangeGiven]  = useState<number | null>(null);

  const [services, setServices] = useState<ServicePricing[]>([]);
  const [soaps,    setSoaps]    = useState<Soap[]>([]);
  const [pewangis, setPewangis] = useState<Pewangi[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getActiveServicePricing(), getActiveSoaps(), getActivePewangi()])
      .then(([s, so, p]) => { setServices(s); setSoaps(so); setPewangis(p); })
      .finally(() => setLoading(false));
  }, []);

  // ── Derived breakdown ──────────────────────────────────────────────────────

  const breakdown: OrderPriceBreakdown = calculateOrderPrice(
    formData.items,
    formData.items.map((it) => services.find((s) => s.id === it.servicePricingId) ?? null),
    formData.items.map((it) => soaps.find((s) => s.id === it.soapId) ?? null),
    formData.items.map((it) => pewangis.find((p) => p.id === it.pewangiId) ?? null),
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleNext = () => {
    let validation = { valid: true, errors: {} as Record<string, string> };

    if (step === "customer") {
      validation = validateCustomerStep(formData.customer, !!formData.customer.existingCustomerId);
    } else if (step === "service") {
      const resolvedServices = formData.items.map((it) => services.find((s) => s.id === it.servicePricingId) ?? null);
      validation = validateServiceItems(formData.items, resolvedServices);
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

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createOrder(formData);
      if (result.success && result.orderNumber && result.orderId) {
        setSuccess({
          orderId:      result.orderId,
          orderNumber:  result.orderNumber,
          total:        breakdown.totalPrice,
          customerName: formData.customer.name,
        });
      } else {
        setSubmitError(result.error ?? "Something went wrong.");
      }
    });
  };

  const handlePaymentSuccess = (change: number) => {
    setPaymentDone(true);
    setChangeGiven(change);
    setShowPayModal(false);
  };

  const handleNewOrder = () => {
    setFormData(EMPTY_FORM);
    setStep("customer");
    setSuccess(null);
    setPaymentDone(false);
    setChangeGiven(null);
  };

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <>
        {showPayModal && (
          <PaymentModal
            orderId={success.orderId}
            orderNumber={success.orderNumber}
            customerName={success.customerName}
            totalPrice={success.total}
            onClose={() => setShowPayModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}

        <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 flex items-center justify-center"
              style={{ borderRadius: "14px", background: "linear-gradient(135deg,#1a7fba,#2496d6)", boxShadow: "0 8px 32px rgba(26,127,186,0.35)" }}>
              <CheckCircle2 size={38} className="text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 border-2 border-white flex items-center justify-center text-xs shadow-md"
              style={{ borderRadius: "8px", background: "#ffcc00" }}>🎉</div>
          </div>

          <div className="space-y-1">
            <h2 className="font-black text-xl text-slate-800 tracking-tight">Order Created!</h2>
            <p className="text-slate-400 text-sm font-medium">The order has been saved successfully.</p>
          </div>

          <div className="px-8 py-5 text-center w-full max-w-xs"
            style={{ background: "linear-gradient(135deg,#edf7fd,#dff0fb)", border: "1.5px solid #b6def5", borderRadius: "10px" }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#1a7fba" }}>Order Number</p>
            <p className="font-mono font-black text-xl tracking-widest" style={{ color: "#0f5a85" }}>{success.orderNumber}</p>
          </div>

          <div className="w-full max-w-xs space-y-2">
            <p className="text-sm text-slate-400 font-medium">
              Total: <span className="font-black text-slate-800 text-base">{formatUSD(success.total)}</span>
            </p>

            {paymentDone ? (
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-md w-full"
                style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1.5px solid #86efac" }}>
                <CheckCircle2 size={15} style={{ color: "#16a34a" }} />
                <span className="text-sm font-bold" style={{ color: "#14532d" }}>
                  Payment received
                  {changeGiven != null && changeGiven > 0 && (
                    <> · Change: <span className="font-black">{formatUSD(changeGiven)}</span></>
                  )}
                </span>
              </div>
            ) : (
              <button type="button" onClick={() => setShowPayModal(true)}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-md font-black text-sm transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#16a34a,#22c55e,#15803d)", boxShadow: "0 4px 16px rgba(22,163,74,0.30)", color: "white", border: "none" }}>
                <CreditCard size={15} />
                Pay Now
              </button>
            )}
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <Button variant="outline" size="lg" className="flex-1 h-11 rounded-md font-bold" onClick={handleNewOrder}>
              New Order
            </Button>
            <Button variant="default" size="lg" className="flex-1 h-11 rounded-md font-bold"
              style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6,#0f5a85)", boxShadow: "0 4px 16px rgba(26,127,186,0.35)" }}
              onClick={() => router.push("/employee/orders")}>
              View Orders
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  const { title, subtitle, Icon, iconBg, iconColor } = STEP_TITLES[step];

  return (
    <div>
      <StepProgress current={step} />

      <div className="px-2 pb-36 space-y-5">

        {/* Page heading */}
        <div className="flex items-center gap-3 pt-1">
          <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${iconBg}`}
            style={{ borderRadius: "8px" }}>
            <Icon size={18} className={iconColor} />
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-800 leading-tight tracking-tight">{title}</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: "#1a7fba" }} />
            <p className="text-sm text-slate-400 font-medium">Loading…</p>
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
                soaps={soaps}
                pewangis={pewangis}
                items={formData.items}
                notes={formData.notes}
                onChange={(items, notes) => setFormData((f) => ({ ...f, items, notes }))}
                errors={errors}
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
          <Alert variant="destructive" className="rounded-md border-red-200 bg-red-50">
            <AlertDescription className="font-medium text-red-700">{submitError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Floating action bar ──────────────────────────────────────────── */}
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[calc(512px-32px)] z-40"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1.5px solid hsl(210 25% 91%)", borderRadius: "14px", padding: "12px 14px", boxShadow: "0 -2px 20px rgba(26,127,186,0.07),0 8px 32px rgba(0,0,0,0.10)" }}>

        {/* Live total preview on service step */}
        {step === "service" && breakdown.totalPrice > 0 && (
          <div className="flex items-center justify-between px-1 mb-3 pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400">
              Estimated Total · {formData.items.length} service{formData.items.length > 1 ? "s" : ""}
            </span>
            <span className="font-black text-sm" style={{ color: "#1a7fba" }}>{formatUSD(breakdown.totalPrice)}</span>
          </div>
        )}

        <div className="flex gap-2.5">
          {step !== "customer" && (
            <Button variant="outline" size="icon" className="shrink-0 rounded-md border-2" style={{ width: 46, height: 46 }} onClick={handleBack}>
              <ChevronLeft size={18} />
            </Button>
          )}

          {step !== "review" ? (
            <Button variant="default" className="flex-1 h-[46px] rounded-md font-black text-sm gap-1.5"
              style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", boxShadow: "0 4px 16px rgba(26,127,186,0.35)" }}
              onClick={handleNext}>
              Continue <ChevronRight size={15} strokeWidth={3} />
            </Button>
          ) : (
            <Button variant="default" className="flex-1 h-[46px] rounded-md font-black text-sm gap-1.5"
              style={{ background: isPending ? "linear-gradient(135deg,#1a7fba,#2496d6)" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", boxShadow: "0 4px 16px rgba(26,127,186,0.35)" }}
              onClick={handleSubmit} disabled={isPending}>
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Sparkles size={14} /> Confirm Order</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}