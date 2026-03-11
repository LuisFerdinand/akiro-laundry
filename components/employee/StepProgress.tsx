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
    <div className="flex items-center px-5 pt-4 pb-2">
      {ORDER_FORM_STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-extrabold border-2 transition-all duration-200",
                  done   && "bg-brand border-brand text-white shadow-md shadow-brand/25",
                  active && "bg-white border-brand text-brand shadow-md shadow-brand/15",
                  !done && !active && "bg-white border-border text-muted-foreground/60",
                )}
              >
                {done ? <Check size={15} strokeWidth={3} /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-[9px] font-extrabold mt-1.5 whitespace-nowrap tracking-wide uppercase",
                  active  ? "text-brand"            : "",
                  done    ? "text-brand/60"         : "",
                  !done && !active ? "text-muted-foreground/50" : "",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < ORDER_FORM_STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-300",
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