// components/employee/PrinterStatusButton.tsx
"use client";

import { useState } from "react";
import { Printer, PrinterCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePrinterStatus } from "@/hooks/usePrinterStatus";

/** `rail` — the square, labelled-icon form used in the tablet SideRail. */
export function PrinterStatusButton({ variant = "pill" }: { variant?: "pill" | "rail" }) {
  const { supported, isConnected, deviceName, connecting, connect, disconnect } = usePrinterStatus();
  const [busy, setBusy] = useState(false);

  if (!supported) return null; // Web Bluetooth unsupported (Safari/Firefox) — nothing to show

  const handleClick = async () => {
    if (isConnected) {
      setBusy(true);
      try {
        await disconnect();
        toast.info("Printer disconnected.");
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      await connect();
      toast.success("Printer connected — ready to print receipts.");
    } catch {
      toast.error("Couldn't connect to the printer. Make sure it's powered on and in range.");
    }
  };

  const busyNow = connecting || busy;
  const title   = isConnected
    ? `Connected${deviceName ? ` — ${deviceName}` : ""}. Tap to disconnect.`
    : "Tap to connect the receipt printer";

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busyNow}
        title={title}
        className="flex flex-col items-center gap-1 transition-transform active:scale-95 disabled:opacity-70"
      >
        <span
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border-[1.5px] ${
            isConnected ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
          }`}
        >
          {busyNow ? (
            <Loader2 size={18} className="animate-spin text-slate-500" />
          ) : isConnected ? (
            <PrinterCheck size={18} className="text-emerald-600" />
          ) : (
            <Printer size={18} className="text-slate-400" />
          )}
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-300"
            }`}
          />
        </span>
        <span className={`text-[10px] font-black tracking-wide ${isConnected ? "text-emerald-600" : "text-slate-400"}`}>
          {busyNow ? "…" : isConnected ? "Printer" : "No printer"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busyNow}
      title={title}
      className="flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1.5px solid ${isConnected ? "#86efac" : "#e2e8f0"}`,
        background: isConnected ? "#f0fdf4" : "#f8fafc",
        opacity: busyNow ? 0.7 : 1,
      }}
    >
      {busyNow ? (
        <Loader2 size={13} className="animate-spin" style={{ color: "#64748b" }} />
      ) : isConnected ? (
        <PrinterCheck size={13} style={{ color: "#16a34a" }} />
      ) : (
        <Printer size={13} style={{ color: "#94a3b8" }} />
      )}
      <span
        className="text-[10px] font-black uppercase tracking-wide hidden sm:inline"
        style={{ color: isConnected ? "#16a34a" : "#64748b" }}
      >
        {busyNow ? "Connecting…" : isConnected ? "Printer On" : "Connect Printer"}
      </span>
      <span
        className="inline-block rounded-full"
        style={{
          width: 6, height: 6,
          background: isConnected ? "#22c55e" : "#cbd5e1",
          boxShadow: isConnected ? "0 0 0 2px #86efac55" : "none",
        }}
      />
    </button>
  );
}
