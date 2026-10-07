// components/shared/EditOrderForm.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Loader2, Save, User, ShoppingBag, ClipboardList, Wallet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button }       from "@/components/ui/button";
import { StepProgress } from "@/components/employee/StepProgress";
import { CustomerStep } from "@/components/employee/order-steps/CustomerStep";
import { ServiceStep }  from "@/components/employee/order-steps/ServiceStep";
import { ReviewStep }   from "@/components/employee/order-steps/ReviewStep";
import {
  OrderFormStep,
  OrderFormData,
  OrderPriceBreakdown,
  getNextStep,
  getPrevStep,
  getStepIndex,
  validateCustomerStep,
  validateServiceItems,
  calculateOrderPrice,
  formatUSD,
} from "@/lib/utils/order-form";
import {
  getActiveServicePricing,
  getActiveSoaps,
  getActivePewangi,
  updateOrder,
} from "@/lib/actions/orders";
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape both the employee and admin order-detail queries can satisfy. */
export interface EditableOrder {
  id:              number;
  orderNumber:     string;
  customerName:    string;
  customerPhone:   string;
  customerAddress: string | null;
  notes:           string | null;
  items: {
    servicePricingId: number;
    weightKg:         string | null;
    quantity:         number | null;
    soapId:           number | null;
    pewangiId:        number | null;
  }[];
  /** Kept as-is by the edit (managed on the order page) but part of the total. */
  specialRequests: { description: string; priceAdjustment: string }[];
  /** Set when a payment (full or DP) is already on file. */
  payment: {
    status:   "partial" | "paid";
    /** Money already applied to the order (lib/utils/order-payment.ts). */
    received: number;
    method:   string | null;
  } | null;
}

interface Props {
  order:    EditableOrder;
  /** Where "Cancel" and a successful save should send the user back to. */
  backHref: string;
}

const STEP_TITLES: Record<OrderFormStep, {
  title: string; subtitle: string;
  Icon: React.ElementType; iconBg: string; iconColor: string;
}> = {
  customer: {
    title: "Customer Info",      subtitle: "Fix the customer's details",
    Icon: User,                  iconBg: "bg-blue-50 border-blue-100",    iconColor: "text-blue-500",
  },
  service: {
    title: "Services & Add-ons", subtitle: "Correct services, quantities and extras",
    Icon: ShoppingBag,           iconBg: "bg-violet-50 border-violet-100", iconColor: "text-violet-500",
  },
  review: {
    title: "Confirm Changes",    subtitle: "Review before saving",
    Icon: ClipboardList,         iconBg: "bg-amber-50 border-amber-100",  iconColor: "text-amber-500",
  },
};

// ─── Payment notice ───────────────────────────────────────────────────────────
// Shown while editing an order that already has a payment: the edit never
// touches the cash register, so it spells out what the new total means.

function PaymentNotice({ payment, newTotal }: {
  payment:  NonNullable<EditableOrder["payment"]>;
  newTotal: number;
}) {
  const diff = Math.round((newTotal - payment.received) * 100) / 100;
  const tone =
    diff > 0 ? {
      color: "#92400e", bg: "#fffbeb", border: "#fde68a",
      text: `New total ${formatUSD(newTotal)} — ${formatUSD(diff)} will be due. Collect it with the Pay button after saving.`,
    }
    : diff < 0 ? {
      color: "#9f1239", bg: "#fff1f2", border: "#fecdd3",
      text: `New total ${formatUSD(newTotal)} — the customer overpaid ${formatUSD(-diff)}. If you refund it from the drawer, record the cash out in Buku Kecil so the count stays right.`,
    }
    : {
      color: "#166534", bg: "#f0fdf4", border: "#bbf7d0",
      text: payment.status === "paid"
        ? "The new total matches what was received — the order stays paid."
        : "The new total matches what was received — the order will be marked paid.",
    };

  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: "8px", background: tone.bg, border: `1.5px solid ${tone.border}` }}>
      <Wallet size={15} style={{ color: tone.color, flexShrink: 0, marginTop: 1 }} />
      <div className="min-w-0">
        <p className="text-xs font-black" style={{ color: tone.color }}>
          {payment.status === "paid" ? "Already paid" : "DP on file"} — {formatUSD(payment.received)} received
          {payment.method ? ` (${payment.method.toUpperCase()})` : ""}
        </p>
        <p className="text-[11px] font-medium mt-0.5 leading-snug" style={{ color: tone.color, opacity: 0.85 }}>
          Saving won&apos;t touch the cash register. {tone.text}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditOrderForm({ order, backHref }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialFormData: OrderFormData = {
    customer: {
      name:    order.customerName,
      phone:   order.customerPhone,
      address: order.customerAddress ?? "",
    },
    items: order.items.map((it) => ({
      servicePricingId: it.servicePricingId,
      weightKg:         it.weightKg != null ? parseFloat(it.weightKg) : null,
      quantity:         it.quantity,
      soapId:            it.soapId,
      pewangiId:         it.pewangiId,
    })),
    notes: order.notes ?? "",
    // Shown in the review and counted in the total; the server keeps the
    // order's special requests as they are.
    specialRequests: order.specialRequests.map((r) => ({
      description:     r.description,
      priceAdjustment: parseFloat(r.priceAdjustment),
    })),
  };

  const [step,        setStep]        = useState<OrderFormStep>("service");
  const [formData,    setFormData]    = useState<OrderFormData>(initialFormData);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [services, setServices] = useState<ServicePricing[]>([]);
  const [soaps,    setSoaps]    = useState<Soap[]>([]);
  const [pewangis, setPewangis] = useState<Pewangi[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getActiveServicePricing(), getActiveSoaps(), getActivePewangi()])
      .then(([s, so, p]) => {
        setServices(s);
        setSoaps(so);
        setPewangis(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const breakdown: OrderPriceBreakdown = calculateOrderPrice(
    formData.items,
    formData.items.map((it) => services.find((s) => s.id === it.servicePricingId) ?? null),
    formData.items.map((it) => soaps.find((s) => s.id === it.soapId) ?? null),
    formData.items.map((it) => pewangis.find((p) => p.id === it.pewangiId) ?? null),
    formData.specialRequests,
  );

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

  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await updateOrder(order.id, formData);
      if (result.success) {
        const p = result.payment;
        if (p && p.balanceDue > 0) {
          toast.warning(`Order ${order.orderNumber} updated — ${formatUSD(p.balanceDue)} is now due`);
        } else if (p && p.overpaid > 0) {
          toast.warning(`Order ${order.orderNumber} updated — customer overpaid ${formatUSD(p.overpaid)}`);
        } else {
          toast.success(`Order ${order.orderNumber} updated`);
        }
        router.push(backHref);
        router.refresh();
      } else {
        setSubmitError(result.error ?? "Something went wrong.");
      }
    });
  };

  const { title, subtitle, Icon, iconBg, iconColor } = STEP_TITLES[step];

  return (
    <div>
      <StepProgress current={step} />

      <div className="px-2 pb-36 space-y-5">

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

        {order.payment && !loading && (
          <PaymentNotice payment={order.payment} newTotal={breakdown.totalPrice} />
        )}

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
      <div className="fixed bottom-22 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-120 sm:max-w-2xl lg:max-w-3xl z-40"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1.5px solid hsl(210 25% 91%)", borderRadius: "14px", padding: "12px 14px", boxShadow: "0 -2px 20px rgba(26,127,186,0.07),0 8px 32px rgba(0,0,0,0.10)" }}>

        {step === "service" && breakdown.totalPrice > 0 && (
          <div className="flex items-center justify-between px-1 mb-3 pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400">
              New Total · {formData.items.length} service{formData.items.length > 1 ? "s" : ""}
            </span>
            <span className="font-black text-sm" style={{ color: "#1a7fba" }}>{formatUSD(breakdown.totalPrice)}</span>
          </div>
        )}

        <div className="flex gap-2.5">
          {getStepIndex(step) > 0 ? (
            <Button variant="outline" size="icon" className="shrink-0 rounded-md border-2" style={{ width: 46, height: 46 }} onClick={handleBack}>
              <ChevronLeft size={18} />
            </Button>
          ) : (
            <Button variant="outline" className="shrink-0 rounded-md border-2 h-11.5 font-bold" onClick={() => router.push(backHref)}>
              Cancel
            </Button>
          )}

          {step !== "review" ? (
            <Button variant="default" className="flex-1 h-11.5 rounded-md font-black text-sm gap-1.5"
              style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", boxShadow: "0 4px 16px rgba(26,127,186,0.35)" }}
              onClick={handleNext}>
              Continue <ChevronRight size={15} strokeWidth={3} />
            </Button>
          ) : (
            <Button variant="default" className="flex-1 h-11.5 rounded-md font-black text-sm gap-1.5"
              style={{ background: isPending ? "linear-gradient(135deg,#1a7fba,#2496d6)" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", boxShadow: "0 4px 16px rgba(26,127,186,0.35)" }}
              onClick={handleSubmit} disabled={isPending}>
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
