// components/employee/order-steps/AddonStep.tsx
import { Droplets, Wind, FileText } from "lucide-react";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn }       from "@/lib/utils";
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
  iconColor,
}: {
  label:     string;
  sublabel?: string;
  hint?:     string;
  icon:      React.ElementType;
  active:    boolean;
  onClick:   () => void;
  iconColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
        active ? "border-brand bg-brand-soft/40" : "border-border bg-white hover:border-brand/30",
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", active ? "bg-brand" : "bg-muted")}>
        <Icon size={15} className={active ? "text-white" : iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", active ? "text-brand" : "text-foreground")}>{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {sublabel && (
        <span className={cn("text-xs font-medium shrink-0", active ? "text-brand" : "text-muted-foreground")}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

export function AddonStep({ soaps, pewangis, soapId, pewangiId, notes, onChange }: AddonStepProps) {
  return (
    <div className="space-y-6">
      {/* Detergent */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Droplets size={13} className="text-brand" />
          Detergent
          <span className="text-muted-foreground font-normal ml-1 text-xs">(optional)</span>
        </Label>
        <div className="space-y-2">
          <AddonOption
            label="No detergent"
            icon={X}
            active={soapId === null}
            onClick={() => onChange(null, pewangiId, notes)}
            iconColor="text-muted-foreground"
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
              iconColor="text-blue-400"
            />
          ))}
        </div>
      </div>

      {/* Fragrance */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Wind size={13} className="text-brand" />
          Fragrance
          <span className="text-muted-foreground font-normal ml-1 text-xs">(optional)</span>
        </Label>
        <div className="space-y-2">
          <AddonOption
            label="No fragrance"
            icon={X}
            active={pewangiId === null}
            onClick={() => onChange(soapId, null, notes)}
            iconColor="text-muted-foreground"
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
              iconColor="text-purple-400"
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="flex items-center gap-1.5">
          <FileText size={13} className="text-brand" />
          Notes
          <span className="text-muted-foreground font-normal ml-1 text-xs">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          className="resize-none"
          rows={3}
          placeholder="Special instructions, stain locations…"
          value={notes}
          onChange={(e) => onChange(soapId, pewangiId, e.target.value)}
        />
      </div>
    </div>
  );
}

// Internal icon component (not exported)
function X({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}