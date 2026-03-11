// lib/utils/order-form.ts
import { Soap, Pewangi, ServicePricing } from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderFormStep = "customer" | "service" | "addons" | "review";

export interface CustomerFormData {
  existingCustomerId?: number;
  name: string;
  phone: string;
  address: string;
}

export interface OrderFormData {
  customer: CustomerFormData;
  servicePricingId: number | null;
  weightKg: number | null;
  soapId: number | null;
  pewangiId: number | null;
  notes: string;
}

export interface PriceBreakdown {
  baseServiceCost: number;
  soapCost: number;
  pewangiCost: number;
  totalPrice: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ORDER_FORM_STEPS: { key: OrderFormStep; label: string }[] = [
  { key: "customer", label: "Customer" },
  { key: "service",  label: "Service"  },
  { key: "addons",   label: "Add-ons"  },
  { key: "review",   label: "Review"   },
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:    "Pending",
  processing: "Processing",
  done:       "Done",
  picked_up:  "Picked Up",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  done:       "bg-green-100 text-green-800",
  picked_up:  "bg-gray-100 text-gray-600",
};

// ─── Step helpers ─────────────────────────────────────────────────────────────

export function getStepIndex(step: OrderFormStep): number {
  return ORDER_FORM_STEPS.findIndex((s) => s.key === step);
}

export function getNextStep(current: OrderFormStep): OrderFormStep | null {
  const idx = getStepIndex(current);
  return idx < ORDER_FORM_STEPS.length - 1 ? ORDER_FORM_STEPS[idx + 1].key : null;
}

export function getPrevStep(current: OrderFormStep): OrderFormStep | null {
  const idx = getStepIndex(current);
  return idx > 0 ? ORDER_FORM_STEPS[idx - 1].key : null;
}

// ─── Generator ───────────────────────────────────────────────────────────────

export function generateOrderNumber(): string {
  const now      = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand     = Math.floor(Math.random() * 9000 + 1000).toString();
  return `LDR-${datePart}-${rand}`;
}

// ─── Price Calculator ─────────────────────────────────────────────────────────

export function calculateOrderPrice(
  service: ServicePricing | null,
  weightKg: number,
  soap: Soap | null,
  pewangi: Pewangi | null,
): PriceBreakdown {
  if (!service || weightKg <= 0) {
    return { baseServiceCost: 0, soapCost: 0, pewangiCost: 0, totalPrice: 0 };
  }
  const base           = parseFloat(service.basePricePerKg);
  const effectiveWeight = service.pricingUnit === "per_pcs" ? 1 : weightKg;
  const baseServiceCost = round2(base * effectiveWeight);
  const soapCost        = soap    ? round2(parseFloat(soap.pricePerKg)    * weightKg) : 0;
  const pewangiCost     = pewangi ? round2(parseFloat(pewangi.pricePerKg) * weightKg) : 0;
  return { baseServiceCost, soapCost, pewangiCost, totalPrice: round2(baseServiceCost + soapCost + pewangiCost) };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(2)} kg`;
}

// ─── Validators ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateCustomerStep(
  data: CustomerFormData,
  isExisting: boolean,
): ValidationResult {
  const errors: Record<string, string> = {};
  if (isExisting) {
    if (!data.existingCustomerId) errors.existingCustomerId = "Please select an existing customer.";
  } else {
    if (!data.name.trim())    errors.name    = "Full name is required.";
    if (!data.phone.trim())   errors.phone   = "Phone number is required.";
    else if (!/^[+\d][\d\s\-().]{7,}$/.test(data.phone)) errors.phone = "Invalid phone number format.";
    if (!data.address.trim()) errors.address = "Address is required.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateServiceStep(
  servicePricingId: number | null,
  weightKg: number | null,
): ValidationResult {
  const errors: Record<string, string> = {};
  if (!servicePricingId) errors.service = "Please select a service.";
  if (!weightKg || weightKg <= 0)  errors.weight = "Weight must be greater than 0.";
  else if (weightKg > 100)         errors.weight = "Maximum weight is 100 kg per order.";
  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}