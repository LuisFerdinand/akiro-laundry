// components/employee/OrderStatusUpdater.tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/lib/actions/orders";
import type { Order } from "@/lib/db/schema";

const STATUSES: { value: Order["status"]; label: string }[] = [
  { value: "pending",    label: "Pending"    },
  { value: "processing", label: "Processing" },
  { value: "done",       label: "Done"       },
  { value: "picked_up",  label: "Picked Up"  },
];

interface OrderStatusUpdaterProps {
  orderId:       number;
  currentStatus: Order["status"];
}

export function OrderStatusUpdater({ orderId, currentStatus }: OrderStatusUpdaterProps) {
  const [status,     setStatus]     = useState(currentStatus);
  const [isPending,  startTransition] = useTransition();
  const [error,      setError]      = useState<string | null>(null);
  const [saved,      setSaved]      = useState(false);

  const handleChange = (next: Order["status"]) => {
    setStatus(next);
    setSaved(false);
  };

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
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Update Status</p>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => handleChange(s.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
              status === s.value
                ? "border-brand bg-brand-soft text-brand"
                : "border-border bg-white text-muted-foreground hover:border-brand/30"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        className="w-full brand-gradient border-0 gap-2"
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
      </Button>
    </div>
  );
}