// components/employee/StepProgress.tsx
import { Check } from "lucide-react";
import { ORDER_FORM_STEPS, OrderFormStep, getStepIndex } from "@/lib/utils/order-form";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  current: OrderFormStep;
}

export function StepProgress({ current }: StepProgressProps) {
  const currentIdx = getStepIndex(current);

  return (
    <div className="flex items-center px-6 py-4">
      {ORDER_FORM_STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                  done   && "bg-brand border-brand text-white",
                  active && "bg-white border-brand text-brand",
                  !done && !active && "bg-white border-border text-muted-foreground",
                )}
              >
                {done ? <Check size={14} strokeWidth={3} /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium mt-1 whitespace-nowrap",
                  active ? "text-brand" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < ORDER_FORM_STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-2 mb-4 transition-colors",
                  i < currentIdx ? "bg-brand" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}