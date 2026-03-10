// components/orders/NewOrderForm.tsx
"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Soap,
  Pewangi,
  ServicePricing,
  Customer,
} from "@/lib/db/schema";
import {
  OrderFormData,
  CustomerFormData,
  OrderFormStep,
  ORDER_FORM_STEPS,
  getStepIndex,
  getNextStep,
  getPrevStep,
  calculateOrderPrice,
  formatRupiah,
  formatWeight,
  validateCustomerStep,
  validateServiceStep,
} from "@/lib/utils/order-form";
import { createOrder } from "@/lib/actions/orders";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  soaps: Soap[];
  pewangiList: Pewangi[];
  services: ServicePricing[];
}

// ─── Default state ────────────────────────────────────────────────────────────

const defaultFormData: OrderFormData = {
  customer: { name: "", phone: "", address: "" },
  servicePricingId: null,
  weightKg: null,
  soapId: null,
  pewangiId: null,
  notes: "",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function NewOrderForm({ soaps, pewangiList, services }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<OrderFormStep>("customer");
  const [formData, setFormData] = useState<OrderFormData>(defaultFormData);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [phoneQuery, setPhoneQuery] = useState("");
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "found" | "not_found"
  >("idle");
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);

  // ── Derived price ─────────────────────────────────────────────────────────

  const selectedService =
    services.find((s) => s.id === formData.servicePricingId) ?? null;
  const selectedSoap = soaps.find((s) => s.id === formData.soapId) ?? null;
  const selectedPewangi =
    pewangiList.find((p) => p.id === formData.pewangiId) ?? null;

  const priceBreakdown = calculateOrderPrice(
    selectedService,
    formData.weightKg ?? 0,
    selectedSoap,
    selectedPewangi
  );

  // ── Customer phone lookup ─────────────────────────────────────────────────

  const handlePhoneLookup = useCallback(async () => {
    if (!phoneQuery.trim()) return;
    setLookupStatus("loading");
    setFoundCustomer(null);
    try {
      const res = await fetch(
        `/api/customers/lookup?phone=${encodeURIComponent(phoneQuery)}`
      );
      const data = await res.json();
      if (data.found) {
        setFoundCustomer(data.customer);
        setLookupStatus("found");
      } else {
        setLookupStatus("not_found");
      }
    } catch {
      setLookupStatus("not_found");
    }
  }, [phoneQuery]);

  const selectExistingCustomer = (c: Customer) => {
    setFormData((prev) => ({
      ...prev,
      customer: { ...prev.customer, existingCustomerId: c.id },
    }));
    setFoundCustomer(c);
    setIsExistingCustomer(true);
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = () => {
    let validation = { valid: true, errors: {} as Record<string, string> };

    if (step === "customer") {
      validation = validateCustomerStep(formData.customer, isExistingCustomer);
    } else if (step === "service") {
      validation = validateServiceStep(
        formData.servicePricingId,
        formData.weightKg
      );
    }

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    const next = getNextStep(step);
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = getPrevStep(step);
    if (prev) setStep(prev);
    setErrors({});
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createOrder(formData);
      if (result.success) {
        setSuccessOrder(result.orderNumber!);
      } else {
        setSubmitError(result.error ?? "Terjadi kesalahan.");
      }
    });
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (successOrder) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-[#2d5a27] flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-serif text-3xl text-[#1a1a1a] mb-2">Order Tersimpan!</h2>
        <p className="text-[#666] mb-1">Nomor Order:</p>
        <p className="font-mono text-xl font-bold text-[#2d5a27] mb-8">{successOrder}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setFormData(defaultFormData); setStep("customer"); setSuccessOrder(null); }}
            className="px-6 py-2.5 rounded-lg border border-[#2d5a27] text-[#2d5a27] font-medium hover:bg-[#2d5a27] hover:text-white transition-colors"
          >
            Order Baru
          </button>
          <button
            onClick={() => router.push("/orders")}
            className="px-6 py-2.5 rounded-lg bg-[#2d5a27] text-white font-medium hover:bg-[#1e3d1b] transition-colors"
          >
            Lihat Semua Order
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(step);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-[#888] uppercase tracking-widest font-medium mb-1">Laundry</p>
        <h1 className="font-serif text-4xl text-[#1a1a1a]">Order Baru</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {ORDER_FORM_STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${i < currentStepIndex ? "bg-[#2d5a27] text-white" : ""}
                  ${i === currentStepIndex ? "bg-[#1a1a1a] text-white ring-4 ring-[#1a1a1a]/10" : ""}
                  ${i > currentStepIndex ? "bg-[#e0ddd8] text-[#aaa]" : ""}`}
              >
                {i < currentStepIndex ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${i === currentStepIndex ? "text-[#1a1a1a]" : "text-[#aaa]"}`}>
                {s.label}
              </span>
            </div>
            {i < ORDER_FORM_STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${i < currentStepIndex ? "bg-[#2d5a27]" : "bg-[#e0ddd8]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4de] overflow-hidden">

        {/* ── Step 1: Customer ── */}
        {step === "customer" && (
          <div className="p-8">
            <h2 className="font-serif text-2xl text-[#1a1a1a] mb-6">Data Pelanggan</h2>

            {/* Phone lookup */}
            <div className="mb-6 p-4 bg-[#f5f3ef] rounded-xl">
              <label className="block text-sm font-medium text-[#444] mb-2">
                Cek Pelanggan Lama (by No. HP)
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneQuery}
                  onChange={(e) => { setPhoneQuery(e.target.value); setLookupStatus("idle"); }}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
                  placeholder="08xxxxxxxxxx"
                  className="flex-1 px-3 py-2 rounded-lg border border-[#ddd] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
                />
                <button
                  onClick={handlePhoneLookup}
                  disabled={lookupStatus === "loading"}
                  className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {lookupStatus === "loading" ? "..." : "Cek"}
                </button>
              </div>

              {lookupStatus === "found" && foundCustomer && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-[#c8e6c9] flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#1a1a1a] text-sm">{foundCustomer.name}</p>
                    <p className="text-xs text-[#666]">{foundCustomer.phone} · {foundCustomer.address}</p>
                  </div>
                  <button
                    onClick={() => selectExistingCustomer(foundCustomer)}
                    className="ml-3 px-3 py-1.5 rounded-md bg-[#2d5a27] text-white text-xs font-medium hover:bg-[#1e3d1b] transition-colors shrink-0"
                  >
                    Pilih
                  </button>
                </div>
              )}

              {lookupStatus === "not_found" && (
                <p className="mt-2 text-xs text-[#e07b39]">
                  Pelanggan tidak ditemukan. Isi data baru di bawah.
                </p>
              )}
            </div>

            {/* Selected existing customer banner */}
            {isExistingCustomer && foundCustomer && (
              <div className="mb-6 p-4 bg-[#edf7ed] rounded-xl border border-[#c8e6c9] flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#2d5a27] font-semibold uppercase tracking-wide mb-0.5">Pelanggan Dipilih</p>
                  <p className="font-semibold text-[#1a1a1a]">{foundCustomer.name}</p>
                  <p className="text-sm text-[#555]">{foundCustomer.phone} · {foundCustomer.address}</p>
                </div>
                <button
                  onClick={() => {
                    setIsExistingCustomer(false);
                    setFormData((prev) => ({ ...prev, customer: { name: "", phone: "", address: "" } }));
                    setFoundCustomer(null);
                    setLookupStatus("idle");
                  }}
                  className="text-[#999] hover:text-[#e05050] transition-colors ml-3"
                  title="Batalkan pilihan"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* New customer form */}
            {!isExistingCustomer && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#444] mb-1">Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={formData.customer.name}
                    onChange={(e) => setFormData((p) => ({ ...p, customer: { ...p.customer, name: e.target.value } }))}
                    placeholder="Contoh: Budi Santoso"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 ${errors.name ? "border-red-400 bg-red-50" : "border-[#ddd]"}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#444] mb-1">Nomor HP *</label>
                  <input
                    type="tel"
                    value={formData.customer.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, customer: { ...p.customer, phone: e.target.value } }))}
                    placeholder="08xxxxxxxxxx"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 ${errors.phone ? "border-red-400 bg-red-50" : "border-[#ddd]"}`}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#444] mb-1">Alamat *</label>
                  <textarea
                    value={formData.customer.address}
                    onChange={(e) => setFormData((p) => ({ ...p, customer: { ...p.customer, address: e.target.value } }))}
                    placeholder="Jl. Contoh No. 1, RT 01/RW 02, Kelurahan..."
                    rows={3}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 resize-none ${errors.address ? "border-red-400 bg-red-50" : "border-[#ddd]"}`}
                  />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Service + Weight ── */}
        {step === "service" && (
          <div className="p-8">
            <h2 className="font-serif text-2xl text-[#1a1a1a] mb-6">Pilih Layanan</h2>

            <div className="grid gap-3 mb-6">
              {services.map((s) => {
                const selected = formData.servicePricingId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setFormData((p) => ({ ...p, servicePricingId: s.id }))}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected ? "border-[#2d5a27] bg-[#edf7ed]" : "border-[#e8e4de] hover:border-[#ccc]"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#1a1a1a]">{s.name}</p>
                        {s.duration && <p className="text-xs text-[#888] mt-0.5">⏱ {s.duration}</p>}
                        {s.notes && <p className="text-xs text-[#999] mt-0.5">{s.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-bold text-[#2d5a27]">{formatRupiah(parseFloat(s.basePricePerKg))}</p>
                        <p className="text-xs text-[#aaa]">/{s.pricingUnit === "per_kg" ? "kg" : "pcs"}</p>
                      </div>
                    </div>
                    {s.minimumKg && (
                      <p className="text-xs text-[#e07b39] mt-1.5">Min. {s.minimumKg} kg</p>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.service && <p className="text-xs text-red-500 -mt-3 mb-4">{errors.service}</p>}

            <div>
              <label className="block text-sm font-medium text-[#444] mb-1">Berat Cucian (kg) *</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.weightKg ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    weightKg: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Contoh: 3.5"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 ${errors.weight ? "border-red-400 bg-red-50" : "border-[#ddd]"}`}
              />
              {errors.weight && <p className="text-xs text-red-500 mt-1">{errors.weight}</p>}
            </div>
          </div>
        )}

        {/* ── Step 3: Soap + Pewangi ── */}
        {step === "addons" && (
          <div className="p-8">
            <h2 className="font-serif text-2xl text-[#1a1a1a] mb-2">Deterjen & Pewangi</h2>
            <p className="text-sm text-[#888] mb-6">Opsional. Pilih jika pelanggan minta deterjen/pewangi khusus.</p>

            {/* Soap */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#444] mb-2">Deterjen</label>
              <div className="grid gap-2">
                <button
                  onClick={() => setFormData((p) => ({ ...p, soapId: null }))}
                  className={`w-full text-left p-3 rounded-xl border-2 text-sm transition-all ${formData.soapId === null ? "border-[#2d5a27] bg-[#edf7ed]" : "border-[#e8e4de] hover:border-[#ccc]"}`}
                >
                  <span className="text-[#666]">Tidak pakai deterjen khusus</span>
                </button>
                {soaps.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFormData((p) => ({ ...p, soapId: s.id }))}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${formData.soapId === s.id ? "border-[#2d5a27] bg-[#edf7ed]" : "border-[#e8e4de] hover:border-[#ccc]"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-[#1a1a1a] text-sm">{s.name}</span>
                        {s.brand && <span className="text-xs text-[#999] ml-2">({s.brand})</span>}
                      </div>
                      <span className="text-sm font-semibold text-[#2d5a27]">+{formatRupiah(parseFloat(s.pricePerKg))}/kg</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pewangi */}
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">Pewangi</label>
              <div className="grid gap-2">
                <button
                  onClick={() => setFormData((p) => ({ ...p, pewangiId: null }))}
                  className={`w-full text-left p-3 rounded-xl border-2 text-sm transition-all ${formData.pewangiId === null ? "border-[#2d5a27] bg-[#edf7ed]" : "border-[#e8e4de] hover:border-[#ccc]"}`}
                >
                  <span className="text-[#666]">Tidak pakai pewangi khusus</span>
                </button>
                {pewangiList.map((pw) => (
                  <button
                    key={pw.id}
                    onClick={() => setFormData((p) => ({ ...p, pewangiId: pw.id }))}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${formData.pewangiId === pw.id ? "border-[#2d5a27] bg-[#edf7ed]" : "border-[#e8e4de] hover:border-[#ccc]"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-[#1a1a1a] text-sm">{pw.name}</span>
                        {pw.brand && <span className="text-xs text-[#999] ml-2">({pw.brand})</span>}
                      </div>
                      <span className="text-sm font-semibold text-[#2d5a27]">+{formatRupiah(parseFloat(pw.pricePerKg))}/kg</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-[#444] mb-1">Catatan (opsional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Contoh: ada noda membandel di bagian kerah..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 resize-none"
              />
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === "review" && (
          <div className="p-8">
            <h2 className="font-serif text-2xl text-[#1a1a1a] mb-6">Konfirmasi Order</h2>

            <div className="space-y-4 mb-6">
              {/* Customer */}
              <ReviewSection title="Pelanggan">
                {isExistingCustomer && foundCustomer ? (
                  <>
                    <ReviewRow label="Nama" value={foundCustomer.name} />
                    <ReviewRow label="HP" value={foundCustomer.phone} />
                    <ReviewRow label="Alamat" value={foundCustomer.address} />
                  </>
                ) : (
                  <>
                    <ReviewRow label="Nama" value={formData.customer.name} />
                    <ReviewRow label="HP" value={formData.customer.phone} />
                    <ReviewRow label="Alamat" value={formData.customer.address} />
                  </>
                )}
              </ReviewSection>

              {/* Service */}
              <ReviewSection title="Layanan">
                <ReviewRow label="Paket" value={selectedService?.name ?? "-"} />
                <ReviewRow label="Berat" value={formatWeight(formData.weightKg ?? 0)} />
                <ReviewRow label="Tarif" value={selectedService ? `${formatRupiah(parseFloat(selectedService.basePricePerKg))}/${selectedService.pricingUnit === "per_kg" ? "kg" : "pcs"}` : "-"} />
              </ReviewSection>

              {/* Addons */}
              <ReviewSection title="Deterjen & Pewangi">
                <ReviewRow label="Deterjen" value={selectedSoap ? `${selectedSoap.name} (+${formatRupiah(parseFloat(selectedSoap.pricePerKg))}/kg)` : "Tidak ada"} />
                <ReviewRow label="Pewangi" value={selectedPewangi ? `${selectedPewangi.name} (+${formatRupiah(parseFloat(selectedPewangi.pricePerKg))}/kg)` : "Tidak ada"} />
                {formData.notes && <ReviewRow label="Catatan" value={formData.notes} />}
              </ReviewSection>
            </div>

            {/* Price breakdown */}
            <div className="bg-[#1a1a1a] rounded-xl p-5 text-white">
              <p className="text-sm text-[#aaa] mb-3 uppercase tracking-wide font-medium">Rincian Harga</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#ccc]">Biaya Layanan</span>
                  <span>{formatRupiah(priceBreakdown.baseServiceCost)}</span>
                </div>
                {priceBreakdown.soapCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#ccc]">Deterjen</span>
                    <span>{formatRupiah(priceBreakdown.soapCost)}</span>
                  </div>
                )}
                {priceBreakdown.pewangiCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#ccc]">Pewangi</span>
                    <span>{formatRupiah(priceBreakdown.pewangiCost)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-[#333] flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold text-[#7ec87a]">{formatRupiah(priceBreakdown.totalPrice)}</span>
              </div>
            </div>

            {submitError && (
              <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">{submitError}</p>
            )}
          </div>
        )}

        {/* Footer nav */}
        <div className="px-8 py-5 bg-[#faf9f7] border-t border-[#e8e4de] flex justify-between items-center">
          <button
            onClick={goBack}
            disabled={step === "customer"}
            className="flex items-center gap-1.5 text-sm font-medium text-[#666] hover:text-[#1a1a1a] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>

          {step !== "review" ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#333] transition-colors"
            >
              Lanjut
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2d5a27] text-white text-sm font-semibold hover:bg-[#1e3d1b] transition-colors disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Simpan Order
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Live price ticker (visible from step 2 onward) */}
      {step !== "customer" && (formData.weightKg ?? 0) > 0 && selectedService && (
        <div className="mt-4 flex items-center justify-between bg-white rounded-xl border border-[#e8e4de] px-5 py-3 shadow-sm">
          <span className="text-sm text-[#888]">
            Estimasi Total ({formData.weightKg} kg)
          </span>
          <span className="font-bold text-lg text-[#2d5a27]">
            {formatRupiah(priceBreakdown.totalPrice)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e8e4de] overflow-hidden">
      <div className="bg-[#f5f3ef] px-4 py-2 border-b border-[#e8e4de]">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-4 py-3 space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#888]">{label}</span>
      <span className="text-[#1a1a1a] font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}