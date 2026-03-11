// components/employee/order-steps/AddonStep.tsx
import { Droplets, Wind, FileText, X } from "lucide-react";
import { cn }        from "@/lib/utils";
import { formatUSD } from "@/lib/utils/order-form";
import type { Soap, Pewangi } from "@/lib/db/schema";

interface AddonStepProps {
  soaps:     Soap[];
  pewangis:  Pewangi[];
  soapId:    number | null;
  pewangiId: number | null;
  notes:     string;
  onChange:  (soapId: number | null, pewangiId: number | null, notes: string) => void;
}

function AddonOption({
  label,
  sublabel,
  hint,
  icon: Icon,
  active,
  onClick,
  iconBg,
  iconColor,
}: {
  label:     string;
  sublabel?: string;
  hint?:     string;
  icon:      React.ElementType;
  active:    boolean;
  onClick:   () => void;
  iconBg:    string;
  iconColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
        active
          ? "border-brand bg-brand-soft shadow-md shadow-brand/10"
          : "border-border bg-white hover:border-brand/20",
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
        active ? "bg-brand" : iconBg,
      )}>
        <Icon size={15} className={active ? "text-white" : iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-bold", active ? "text-brand-dark" : "text-foreground")}>
          {label}
        </p>
        {hint && <p className="text-xs text-muted-foreground font-medium">{hint}</p>}
      </div>
      {sublabel && (
        <span className={cn(
          "text-xs font-extrabold shrink-0 px-2.5 py-1 rounded-xl",
          active ? "bg-brand text-white" : "bg-muted text-muted-foreground",
        )}>
          {sublabel}
        </span>
      )}
      {active && (
        <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </button>
  );
}

export function AddonStep({ soaps, pewangis, soapId, pewangiId, notes, onChange }: AddonStepProps) {
  return (
    <div className="space-y-6">

      {/* Detergent */}
      <div className="space-y-2.5">
        <label className="field-label flex items-center gap-1.5">
          <Droplets size={12} className="text-blue-400" />
          Detergent
          <span className="text-muted-foreground/60 font-semibold normal-case tracking-normal text-[10px]">(optional)</span>
        </label>
        <div className="space-y-2">
          <AddonOption
            label="No detergent"
            icon={X}
            active={soapId === null}
            onClick={() => onChange(null, pewangiId, notes)}
            iconBg="bg-slate-50"
            iconColor="text-slate-400"
          />
          {soaps.map((s) => (
            <AddonOption
              key={s.id}
              label={s.name}
              sublabel={`+${formatUSD(parseFloat(s.pricePerKg))}/kg`}
              hint={s.brand ?? undefined}
              icon={Droplets}
              active={soapId === s.id}
              onClick={() => onChange(s.id, pewangiId, notes)}
              iconBg="bg-blue-50"
              iconColor="text-blue-400"
            />
          ))}
        </div>
      </div>

      {/* Fragrance */}
      <div className="space-y-2.5">
        <label className="field-label flex items-center gap-1.5">
          <Wind size={12} className="text-purple-400" />
          Fragrance
          <span className="text-muted-foreground/60 font-semibold normal-case tracking-normal text-[10px]">(optional)</span>
        </label>
        <div className="space-y-2">
          <AddonOption
            label="No fragrance"
            icon={X}
            active={pewangiId === null}
            onClick={() => onChange(soapId, null, notes)}
            iconBg="bg-slate-50"
            iconColor="text-slate-400"
          />
          {pewangis.map((p) => (
            <AddonOption
              key={p.id}
              label={p.name}
              sublabel={`+${formatUSD(parseFloat(p.pricePerKg))}/kg`}
              hint={p.brand ?? undefined}
              icon={Wind}
              active={pewangiId === p.id}
              onClick={() => onChange(soapId, p.id, notes)}
              iconBg="bg-purple-50"
              iconColor="text-purple-400"
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="field-label flex items-center gap-1.5" htmlFor="notes">
          <FileText size={12} className="text-brand/60" />
          Notes
          <span className="text-muted-foreground/60 font-semibold normal-case tracking-normal text-[10px]">(optional)</span>
        </label>
        <textarea
          id="notes"
          className="field-input resize-none"
          rows={3}
          placeholder="Special instructions, stain locations…"
          value={notes}
          onChange={(e) => onChange(soapId, pewangiId, e.target.value)}
        />
      </div>
    </div>
  );
}