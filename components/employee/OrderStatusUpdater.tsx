// components/employee/OrderStatusUpdater.tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { updateOrderStatus } from "@/lib/actions/orders";
import type { Order } from "@/lib/db/schema";

const STATUSES: { value: Order["status"]; label: string; emoji: string; color: string; activeBg: string }[] = [
  { value: "pending",    label: "Pending",    emoji: "🕐", color: "text-slate-500",   activeBg: "bg-slate-100 border-slate-300 text-slate-700"  },
  { value: "processing", label: "Processing", emoji: "🫧", color: "text-blue-500",    activeBg: "bg-blue-50 border-blue-300 text-blue-700"      },
  { value: "done",       label: "Done",       emoji: "✅", color: "text-emerald-500", activeBg: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  { value: "picked_up",  label: "Picked Up",  emoji: "🎉", color: "text-brand",       activeBg: "bg-brand-soft border-brand text-brand-dark"     },
];

interface OrderStatusUpdaterProps {
  orderId:       number;
  currentStatus: Order["status"];
}

export function OrderStatusUpdater({ orderId, currentStatus }: OrderStatusUpdaterProps) {
  const [status,    setStatus]      = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error,     setError]       = useState<string | null>(null);
  const [saved,     setSaved]       = useState(false);

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (result.success) setSaved(true);
      else setError(result.error ?? "Failed to update.");
    });
  };

  return (
    <div className="akiro-section-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw size={13} className="text-brand" />
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Update Status
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setSaved(false); }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all active:scale-95 ${
              status === s.value
                ? s.activeBg
                : "border-border bg-white text-muted-foreground hover:border-brand/20"
            }`}
          >
            <span className="text-base leading-none">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-destructive font-semibold bg-red-50 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}

      <button
        className="akiro-save-btn"
        onClick={handleSave}
        disabled={isPending || status === currentStatus}
      >
        {isPending ? (
          <><Loader2 size={14} className="animate-spin" /> Saving…</>
        ) : saved ? (
          <><CheckCircle2 size={14} /> Saved!</>
        ) : (
          "Save Status"
        )}
      </button>
    </div>
  );
}