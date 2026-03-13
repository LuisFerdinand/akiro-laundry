// lib/utils/order-form.ts
import { Soap, Pewangi, ServicePricing } from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderFormStep = "customer" | "service" | "review";

export interface CustomerFormData {
  existingCustomerId?: number;
  name:    string;
  phone:   string;
  address: string;
}

/**
 * One service line in the order form.
 *
 * Rules:
 * - pricingUnit === "per_kg"  → fill `weightKg`, leave `quantity` null
 * - pricingUnit === "per_pcs" → fill `quantity`, leave `weightKg` null
 */
export interface OrderItemFormData {
  servicePricingId: number | null;
  /** kg — only relevant when the chosen service uses pricingUnit "per_kg" */
  weightKg:  number | null;
  /** pieces count — only relevant when pricingUnit is "per_pcs" */
  quantity:  number | null;
  soapId:    number | null;
  pewangiId: number | null;
}

export interface OrderFormData {
  customer: CustomerFormData;
  items:    OrderItemFormData[];   // ≥ 1 item required
  notes:    string;
}

// ─── Per-item price breakdown ─────────────────────────────────────────────────

export interface ItemPriceBreakdown {
  baseServiceCost: number;
  soapCost:        number;
  pewangiCost:     number;
  subtotal:        number;
}

// ─── Full-order price breakdown ───────────────────────────────────────────────

export interface OrderPriceBreakdown {
  items:      ItemPriceBreakdown[];
  totalPrice: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ORDER_FORM_STEPS: { key: OrderFormStep; label: string }[] = [
  { key: "customer", label: "Customer" },
  { key: "service",  label: "Services" },
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

/** Blank item template — use when adding a new service line in the form UI. */
export const EMPTY_ORDER_ITEM: OrderItemFormData = {
  servicePricingId: null,
  weightKg:         null,
  quantity:         null,
  soapId:           null,
  pewangiId:        null,
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

// ─── Price calculators ────────────────────────────────────────────────────────

/**
 * Calculate the price breakdown for a **single** service line item.
 *
 * - per_kg  services  → cost = basePrice × weightKg
 * - per_pcs services  → cost = basePrice × quantity (soap/pewangi are skipped
 *                        because they're not meaningful for shoes etc.)
 */
export function calculateItemPrice(
  service:  ServicePricing | null,
  weightKg: number | null,
  quantity: number | null,
  soap:     Soap | null,
  pewangi:  Pewangi | null,
): ItemPriceBreakdown {
  if (!service) {
    return { baseServiceCost: 0, soapCost: 0, pewangiCost: 0, subtotal: 0 };
  }

  const isPerKg = service.pricingUnit !== "per_pcs";

  if (isPerKg) {
    const kg             = weightKg ?? 0;
    const baseServiceCost = round2(parseFloat(service.basePricePerKg) * kg);
    const soapCost        = soap    ? round2(parseFloat(soap.pricePerKg)    * kg) : 0;
    const pewangiCost     = pewangi ? round2(parseFloat(pewangi.pricePerKg) * kg) : 0;
    return {
      baseServiceCost,
      soapCost,
      pewangiCost,
      subtotal: round2(baseServiceCost + soapCost + pewangiCost),
    };
  } else {
    // per_pcs — soap & pewangi don't apply
    const qty             = quantity ?? 0;
    const baseServiceCost = round2(parseFloat(service.basePricePerKg) * qty);
    return { baseServiceCost, soapCost: 0, pewangiCost: 0, subtotal: baseServiceCost };
  }
}

/**
 * Calculate combined price breakdown for **all items** in an order.
 * Pass parallel arrays — items[i] uses services[i], soaps[i], pewangis[i].
 */
export function calculateOrderPrice(
  items:    OrderItemFormData[],
  services: (ServicePricing | null)[],
  soaps:    (Soap | null)[],
  pewangis: (Pewangi | null)[],
): OrderPriceBreakdown {
  const breakdowns = items.map((item, i) =>
    calculateItemPrice(
      services[i] ?? null,
      item.weightKg,
      item.quantity,
      soaps[i]    ?? null,
      pewangis[i] ?? null,
    ),
  );

  const totalPrice = round2(breakdowns.reduce((sum, b) => sum + b.subtotal, 0));
  return { items: breakdowns, totalPrice };
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
  valid:  boolean;
  errors: Record<string, string>;
}

export function validateCustomerStep(
  data:       CustomerFormData,
  isExisting: boolean,
): ValidationResult {
  const errors: Record<string, string> = {};
  if (isExisting) {
    if (!data.existingCustomerId) errors.existingCustomerId = "Please select an existing customer.";
  } else {
    if (!data.name.trim())    errors.name    = "Full name is required.";
    if (!data.phone.trim())   errors.phone   = "Phone number is required.";
    else if (!/^[+\d][\d\s\-().]{7,}$/.test(data.phone))
      errors.phone = "Invalid phone number format.";
    if (!data.address.trim()) errors.address = "Address is required.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate all service line items.
 * Returns a flat error map keyed by `items[N].fieldName`.
 */
export function validateServiceItems(
  items:    OrderItemFormData[],
  services: (ServicePricing | null)[],
): ValidationResult {
  const errors: Record<string, string> = {};

  if (items.length === 0) {
    errors["items"] = "At least one service is required.";
    return { valid: false, errors };
  }

  items.forEach((item, i) => {
    const prefix  = `items[${i}]`;
    const service = services[i];

    if (!item.servicePricingId || !service) {
      errors[`${prefix}.service`] = "Please select a service.";
      return;
    }

    if (service.pricingUnit === "per_pcs") {
      if (!item.quantity || item.quantity <= 0)
        errors[`${prefix}.quantity`] = "Quantity must be at least 1.";
      else if (item.quantity > 1000)
        errors[`${prefix}.quantity`] = "Maximum 1 000 pieces per line.";
    } else {
      if (!item.weightKg || item.weightKg <= 0)
        errors[`${prefix}.weightKg`] = "Weight must be greater than 0.";
      else if (item.weightKg > 100)
        errors[`${prefix}.weightKg`] = "Maximum weight is 100 kg per line.";
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}