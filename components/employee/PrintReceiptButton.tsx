// components/employee/PrintReceiptButton.tsx
"use client";

import { Printer } from "lucide-react";
import { printReceipt } from "@/components/employee/PrintReceipt";
import type { OrderWithDetails } from "@/lib/actions/orders";

interface Props {
  order: OrderWithDetails;
}

export function PrintReceiptButton({ order }: Props) {
  const handlePrint = () => {
    const formItems = order.items.map((item) => ({
      servicePricingId: item.servicePricingId,
      weightKg:  item.weightKg  ? parseFloat(item.weightKg)  : null,
      quantity:  item.quantity  ?? null,
      soapId:    item.soapId    ?? null,
      pewangiId: item.pewangiId ?? null,
    }));

    const services = order.items.map((item) => ({
      id:             item.servicePricingId,
      name:           item.serviceName,
      basePricePerKg: item.basePricePerKg,
      pricingUnit:    item.pricingUnit,
      category:       "",
      isActive:       true,
      createdAt:      new Date(),
      minimumKg:      null,
      duration:       null,
      notes:          null,
    }));

    const soaps = order.items
      .filter((item) => item.soapId != null && item.soapName)
      .map((item) => ({
        id:         item.soapId!,
        name:       item.soapName!,
        brand:      null,
        pricePerKg: item.soapCost ?? "0",
        isActive:   true,
        createdAt:  new Date(),
      }));

    const pewangis = order.items
      .filter((item) => item.pewangiId != null && item.pewangiName)
      .map((item) => ({
        id:         item.pewangiId!,
        name:       item.pewangiName!,
        brand:      null,
        pricePerKg: item.pewangiCost ?? "0",
        isActive:   true,
        createdAt:  new Date(),
      }));

    const breakdown = {
      totalPrice: parseFloat(order.totalPrice),
      items: order.items.map((item) => {
        const isPerPcs        = item.pricingUnit === "per_pcs";
        const qty             = isPerPcs ? (item.quantity ?? 0) : parseFloat(item.weightKg ?? "0");
        const baseServiceCost = parseFloat(item.basePricePerKg) * qty;
        const soapCost        = parseFloat(item.soapCost    ?? "0");
        const pewangiCost     = parseFloat(item.pewangiCost ?? "0");

        return {
          baseServiceCost,
          soapCost,
          pewangiCost,
          subtotal: parseFloat(item.subtotal),
        };
      }),
    };

    void printReceipt({
      orderNumber:   order.orderNumber,
      createdAt:     new Date(order.createdAt),
      formData: {
        customer: {
          name:    order.customerName,
          phone:   order.customerPhone,
          address: order.customerAddress ?? "",
        },
        items: formItems,
        notes: order.notes ?? "",
      },
      services,
      soaps,
      pewangis,
      breakdown,
      paymentMethod: order.paymentMethod  ?? undefined,
      amountPaid:    order.amountPaid     ? parseFloat(order.amountPaid)  : undefined,
      changeGiven:   order.changeGiven    ? parseFloat(order.changeGiven) : undefined,
    });
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="flex items-center justify-center gap-2 w-full h-11 rounded-md font-black text-sm transition-all active:scale-[0.98]"
      style={{
        background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
        border:     "1.5px solid #e2e8f0",
        color:      "#475569",
        boxShadow:  "0 2px 8px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#1a7fba";
        e.currentTarget.style.color       = "#1a7fba";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.color       = "#475569";
      }}
    >
      <Printer size={15} />
      Print Receipt
    </button>
  );
}