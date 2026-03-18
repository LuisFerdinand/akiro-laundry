// lib/actions/public/order-request.actions.ts
"use server";

import { db }      from "@/lib/db";
import { customers, orders, orderItems, servicePricing } from "@/lib/db/schema";
import { eq }      from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface OrderRequestInput {
  // Customer info
  name:    string;
  phone:   string;
  address: string;

  // Order info
  serviceId:    number;
  notes:        string;
  pickupDate:   string; // ISO date string
  pickupTime:   string; // e.g. "09:00"

  // Weight estimate (kg) — user provides a rough estimate
  estimatedKg:  number;
}

export interface OrderRequestResult {
  success:     boolean;
  orderNumber?: string;
  error?:      string;
}

function generateOrderNumber(): string {
  const date = new Date();
  const ymd  = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `AK-${ymd}-${rand}`;
}

export async function submitOrderRequest(
  input: OrderRequestInput,
): Promise<OrderRequestResult> {
  try {
    // 1. Validate required fields
    if (!input.name.trim() || !input.phone.trim() || !input.address.trim()) {
      return { success: false, error: "Please fill in all required fields." };
    }

    // 2. Fetch the chosen service pricing
    const [service] = await db
      .select()
      .from(servicePricing)
      .where(eq(servicePricing.id, input.serviceId))
      .limit(1);

    if (!service) {
      return { success: false, error: "Selected service not found." };
    }

    // 3. Upsert customer by phone number
    const existingCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, input.phone.trim()))
      .limit(1);

    let customerId: number;

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
      // Update name/address in case they changed
      await db
        .update(customers)
        .set({ name: input.name.trim(), address: input.address.trim() })
        .where(eq(customers.id, customerId));
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          name:    input.name.trim(),
          phone:   input.phone.trim(),
          address: input.address.trim(),
        })
        .returning({ id: customers.id });
      customerId = newCustomer.id;
    }

    // 4. Calculate pricing
    const kg         = Math.max(input.estimatedKg, Number(service.minimumKg ?? 1));
    const basePrice  = Number(service.basePricePerKg);
    const subtotal   = service.pricingUnit === "per_kg"
      ? basePrice * kg
      : basePrice * Math.ceil(kg); // treat kg as "pieces" for per_pcs services
    const totalPrice = subtotal;

    // 5. Build estimated done date (pickup date + 1 day default)
    const pickupDateTime  = new Date(`${input.pickupDate}T${input.pickupTime}:00`);
    const estimatedDoneAt = new Date(pickupDateTime);
    estimatedDoneAt.setDate(estimatedDoneAt.getDate() + 1);

    const orderNumber = generateOrderNumber();

    // 6. Create the order
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        totalPrice:     String(totalPrice),
        paymentStatus:  "unpaid",
        status:         "pending",
        notes:          input.notes.trim() || null,
        estimatedDoneAt,
      })
      .returning({ id: orders.id });

    // 7. Create order item
    await db.insert(orderItems).values({
      orderId:          order.id,
      servicePricingId: service.id,
      weightKg:         service.pricingUnit === "per_kg" ? String(kg) : null,
      quantity:         service.pricingUnit === "per_pcs" ? Math.ceil(kg) : null,
      basePricePerKg:   String(basePrice),
      soapCost:         "0",
      pewangiCost:      "0",
      subtotal:         String(subtotal),
    });

    revalidatePath("/admin/orders");

    return { success: true, orderNumber };
  } catch (err) {
    console.error("[submitOrderRequest]", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Fetch active services for the form selector
export async function getPublicServices() {
  return db
    .select({
      id:             servicePricing.id,
      name:           servicePricing.name,
      basePricePerKg: servicePricing.basePricePerKg,
      pricingUnit:    servicePricing.pricingUnit,
      minimumKg:      servicePricing.minimumKg,
      duration:       servicePricing.duration,
      notes:          servicePricing.notes,
    })
    .from(servicePricing)
    .where(eq(servicePricing.isActive, true));
}