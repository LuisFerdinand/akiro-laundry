"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Tag, Weight, Hash,
  Droplets, Wind, FileText,
} from "lucide-react";
import { formatUSD, OrderItemFormData, EMPTY_ORDER_ITEM, calculateItemPrice } from "@/lib/utils/order-form";
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";
import { ServiceItemModal } from "./ServiceItemModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceStepProps {
  services:  ServicePricing[];
  soaps:     Soap[];
  pewangis:  Pewangi[];
  items:     OrderItemFormData[];
  notes:     string;
  onChange:  (items: OrderItemFormData[], notes: string) => void;
  errors:    Record<string, string>;
}

// ─── Item summary card ────────────────────────────────────────────────────────

function ItemCard({
  index, item, services, soaps, pewangis,
  onEdit, onRemove, canRemove,
}: {
  index:     number;
  item:      OrderItemFormData;
  services:  ServicePricing[];
  soaps:     Soap[];
  pewangis:  Pewangi[];
  onEdit:    () => void;
  onRemove:  () => void;
  canRemove: boolean;
}) {
  const service  = services.find((s) => s.id === item.servicePricingId) ?? null;
  const soap     = soaps.find((s)    => s.id === item.soapId)    ?? null;
  const pewangi  = pewangis.find((p) => p.id === item.pewangiId) ?? null;
  const isPerPcs = service?.pricingUnit === "per_pcs";
  const breakdown = calculateItemPrice(service, item.weightKg, item.quantity, soap, pewangi);
  const addons   = [soap?.name, pewangi?.name].filter(Boolean) as string[];

  return (
    <div style={{ borderRadius: "10px", border: "2px solid #e2e8f0", background: "white", overflow: "hidden", boxShadow: "0 1px 5px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", borderBottom: "1.5px solid #e8edf2", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: "6px", background: "linear-gradient(135deg,#1a7fba,#2496d6)", boxShadow: "0 2px 6px rgba(26,127,186,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="font-black text-[11px] text-white">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate" style={{ color: "#1e293b" }}>{service?.name ?? "Unknown service"}</p>
          <p className="text-[10px] font-semibold mt-0.5 capitalize" style={{ color: "#94a3b8" }}>{service?.category ?? "—"}</p>
        </div>
        <span className="font-black text-sm shrink-0" style={{ color: "#1a7fba" }}>{formatUSD(breakdown.subtotal)}</span>
        <div className="flex items-center gap-1.5 ml-1 shrink-0">
          <button type="button" onClick={onEdit}
            className="flex items-center justify-center w-7 h-7 transition-all active:scale-90"
            style={{ borderRadius: "5px", border: "1.5px solid #b6def5", background: "#edf7fd", color: "#1a7fba" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#dff0fb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#edf7fd"; }}>
            <Pencil size={11} />
          </button>
          {canRemove && (
            <button type="button" onClick={onRemove}
              className="flex items-center justify-center w-7 h-7 transition-all active:scale-90"
              style={{ borderRadius: "5px", border: "1.5px solid #fca5a5", background: "#fff1f2", color: "#e05252" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#ffe4e6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff1f2"; }}>
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center justify-center w-6 h-6" style={{ borderRadius: "4px", background: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "1.5px solid #b6def5" }}>
            {isPerPcs ? <Hash size={10} style={{ color: "#1a7fba" }} /> : <Weight size={10} style={{ color: "#1a7fba" }} />}
          </div>
          <span className="text-xs font-bold" style={{ color: "#334155" }}>
            {isPerPcs ? `${item.quantity ?? 0} pcs` : `${item.weightKg ?? 0} kg`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center justify-center w-6 h-6" style={{ borderRadius: "4px", background: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "1.5px solid #b6def5" }}>
            <Tag size={10} style={{ color: "#1a7fba" }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: "#64748b" }}>
            {formatUSD(parseFloat(service?.basePricePerKg ?? "0"))}{isPerPcs ? "/pc" : "/kg"}
          </span>
        </div>
        {addons.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-6 h-6" style={{ borderRadius: "4px", background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1.5px solid #c4b5fd" }}>
              {soap ? <Droplets size={10} style={{ color: "#7c3aed" }} /> : <Wind size={10} style={{ color: "#7c3aed" }} />}
            </div>
            <span className="text-xs font-semibold" style={{ color: "#64748b" }}>{addons.join(" + ")}</span>
          </div>
        ) : !isPerPcs ? (
          <span className="text-xs font-medium" style={{ color: "#cbd5e1" }}>No add-ons</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ServiceStep({ services, soaps, pewangis, items, notes, onChange, errors }: ServiceStepProps) {
  // null = closed, -1 = adding new, N = editing index N
  const [modalTarget, setModalTarget] = useState<number | null>(null);

  const openAdd    = () => setModalTarget(-1);
  const openEdit   = (i: number) => setModalTarget(i);
  const closeModal = () => setModalTarget(null);

  const handleConfirm = (item: OrderItemFormData) => {
    if (modalTarget === -1) {
      onChange([...items, item], notes);
    } else if (modalTarget !== null) {
      const next = [...items];
      next[modalTarget] = item;
      onChange(next, notes);
    }
    setModalTarget(null);
  };

  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i), notes);

  const isOpen   = modalTarget !== null;
  const editItem = modalTarget !== null && modalTarget >= 0 ? items[modalTarget] : null;
  const initial  = editItem ?? { ...EMPTY_ORDER_ITEM };

  return (
    <div className="space-y-4">

      {/* Items list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center"
          style={{ borderRadius: "12px", border: "2px dashed #e2e8f0", background: "#fafbfc" }}>
          <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "1.5px solid #b6def5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Tag size={20} style={{ color: "#1a7fba" }} />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-600">No services added yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Tap the button below to add a service</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <ItemCard key={i} index={i} item={item} services={services} soaps={soaps} pewangis={pewangis}
              onEdit={() => openEdit(i)} onRemove={() => removeItem(i)} canRemove={items.length > 1} />
          ))}
        </div>
      )}

      {errors.items && (
        <p className="text-xs font-semibold px-1" style={{ color: "#e05252" }}>{errors.items}</p>
      )}

      {/* Add service button */}
      <button type="button" onClick={openAdd}
        className="w-full flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
        style={{ height: 48, borderRadius: "10px", border: "2px dashed #b6def5", background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", color: "#1a7fba", fontWeight: 700, fontSize: 13 }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.background = "linear-gradient(135deg,#edf7fd,#d0ecf9)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#b6def5"; e.currentTarget.style.background = "linear-gradient(135deg,#f0f9ff,#e0f2fe)"; }}>
        <div style={{ width: 24, height: 24, borderRadius: "6px", background: "linear-gradient(135deg,#1a7fba,#2496d6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(26,127,186,0.25)" }}>
          <Plus size={13} style={{ color: "white" }} />
        </div>
        {items.length === 0 ? "Add Service" : "Add Another Service"}
      </button>

      <div style={{ borderTop: "1.5px dashed #e2e8f0" }} />

      {/* Notes */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400" htmlFor="order-notes">Notes</label>
          <span className="text-[10px] font-semibold text-slate-300">optional</span>
        </div>
        <div className="relative">
          <div className="absolute left-3.5 top-3.5 pointer-events-none flex items-center justify-center w-8 h-8"
            style={{ borderRadius: "6px", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", border: "1.5px solid #e2e8f0" }}>
            <FileText size={13} style={{ color: "#94a3b8" }} />
          </div>
          <textarea id="order-notes"
            className="w-full pl-14 pr-4 pt-3.5 pb-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-300 bg-white resize-none outline-none transition-all"
            style={{ borderRadius: "8px", border: "2px solid #e2e8f0" }}
            rows={3} placeholder="Special instructions, stain locations…"
            value={notes} onChange={(e) => onChange(items, e.target.value)}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,127,186,0.10)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }} />
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <ServiceItemModal
          editIndex={modalTarget === -1 ? null : modalTarget}
          initial={initial}
          services={services}
          soaps={soaps}
          pewangis={pewangis}
          onConfirm={handleConfirm}
          onClose={closeModal}
        />
      )}
    </div>
  );
}