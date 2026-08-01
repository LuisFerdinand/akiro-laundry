/* eslint-disable react-hooks/set-state-in-effect */
// components/employee/PrintReceiptButton.tsx
"use client";

import { useEffect, useState } from "react";
import { Printer, Bluetooth, BluetoothConnected } from "lucide-react";
import { printReceipt } from "@/components/employee/PrintReceipt";
import {
  printer,
  isBluetoothSupported,
  getBluetoothPrinterPreference,
  setBluetoothPrinterPreference,
} from "@/lib/utils/bluetooth-printer";
import type { OrderWithDetails } from "@/lib/actions/orders";
import type { ReceiptSettings } from "@/lib/db/schema/receipt";

interface Props {
  order:           OrderWithDetails;
  receiptSettings: ReceiptSettings | null;
}

export function PrintReceiptButton({ order, receiptSettings }: Props) {
  // SSR-safe defaults; real values (localStorage / Bluetooth state) only exist client-side,
  // so they're read post-mount below rather than in the initializer (avoids hydration mismatch).
  // `bluetoothSupported` in particular must never be checked directly during render —
  // navigator doesn't exist on the server, so the button would render on the client but
  // not on the server, tripping a hydration mismatch.
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [useBluetooth, setUseBluetooth]              = useState(false);
  const [connected, setConnected]                    = useState(false);

  useEffect(() => {
    setBluetoothSupported(isBluetoothSupported());
    setUseBluetooth(getBluetoothPrinterPreference());
    setConnected(printer.isConnected);
    return printer.subscribe(() => setConnected(printer.isConnected));
  }, []);

  const toggleBluetooth = () => {
    const next = !useBluetooth;
    setUseBluetooth(next);
    setBluetoothPrinterPreference(next);
  };

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
        return { baseServiceCost, soapCost, pewangiCost, subtotal: parseFloat(item.subtotal) };
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
      // ← DB settings forwarded; PrintReceipt falls back to DEFAULTS if null
      settings: receiptSettings,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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

      {/* Per-device print method — defaults to the browser print dialog (matches the
          receipt template exactly) on every device. Only enable this on a device that
          has an actual Bluetooth thermal printer paired. */}
      {bluetoothSupported && (
        <button
          type="button"
          onClick={toggleBluetooth}
          title="Only turn this on for a device with a paired Bluetooth thermal printer — otherwise receipts will look different from the template."
          className="flex items-center justify-center gap-1.5 w-full h-7 rounded-md text-[11px] font-bold transition-all"
          style={{
            background: useBluetooth ? "#edf7fd" : "transparent",
            border:     `1px solid ${useBluetooth ? "#b6def5" : "#e2e8f0"}`,
            color:      useBluetooth ? "#1a7fba" : "#94a3b8",
          }}
        >
          {connected ? <BluetoothConnected size={11} /> : <Bluetooth size={11} />}
          {useBluetooth
            ? connected ? `Bluetooth printer: ${printer.deviceName ?? "connected"}` : "Bluetooth printer (on)"
            : "Use browser print (default)"}
        </button>
      )}
    </div>
  );
}