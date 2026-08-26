"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Tag, Weight, Hash,
  Droplets, Wind, FileText, ArrowUp, ArrowDown, MessageSquarePlus,
} from "lucide-react";
import { formatUSD, OrderItemFormData, EMPTY_ORDER_ITEM, calculateItemPrice, SpecialRequestFormData } from "@/lib/utils/order-form";
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
  /** Only rendered when provided — the edit-order flow omits these and keeps
   *  special requests managed on the order detail page instead. */
  specialRequests?:         SpecialRequestFormData[];
  onSpecialRequestsChange?: (list: SpecialRequestFormData[]) => void;
}

// ─── Inline special requests (create-order flow only) ─────────────────────────

function InlineSpecialRequests({
  requests, onChange,
}: {
  requests: SpecialRequestFormData[];
  onChange: (list: SpecialRequestFormData[]) => void;
}) {
  const [adding,      setAdding]      = useState(false);
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [direction,   setDirection]   = useState<"add" | "subtract">("add");
  const [error,       setError]       = useState<string | null>(null);

  const handleAdd = () => {
    if (!description.trim()) { setError("Description is required."); return; }
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) { setError("Enter an amount greater than 0."); return; }
    const priceAdjustment = direction === "subtract" ? -Math.abs(amt) : Math.abs(amt);
    onChange([...requests, { description: description.trim(), priceAdjustment }]);
    setDescription(""); setAmount(""); setDirection("add"); setAdding(false); setError(null);
  };

  const handleRemove = (i: number) => onChange(requests.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Special Requests</label>
        <span className="text-[10px] font-semibold text-slate-300">optional</span>
      </div>

      {requests.map((r, i) => {
        const isPositive = r.priceAdjustment >= 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#f8fafc", border: "1.5px solid #e8edf2" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: isPositive ? "#f0fdf4" : "#fff1f2", border: `1.5px solid ${isPositive ? "#86efac" : "#fda4af"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isPositive ? <ArrowUp size={11} style={{ color: "#16a34a" }} /> : <ArrowDown size={11} style={{ color: "#e11d48" }} />}
            </div>
            <p style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{r.description}</p>
            <span style={{ fontSize: 13, fontWeight: 800, color: isPositive ? "#16a34a" : "#e11d48", flexShrink: 0 }}>
              {isPositive ? "+" : "−"}{formatUSD(Math.abs(r.priceAdjustment))}
            </span>
            <button type="button" onClick={() => handleRemove(i)}
              style={{ background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Trash2 size={11} style={{ color: "#be123c" }} />
            </button>
          </div>
        );
      })}

      {adding ? (
        <div style={{ padding: 12, borderRadius: 10, border: "1.5px solid #b6def5", background: "#edf7fd", display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did the customer ask for? e.g. 'Extra stain removal on jacket'"
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1e293b", outline: "none", background: "white", resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #e2e8f0", flexShrink: 0 }}>
              <button type="button" onClick={() => setDirection("add")}
                style={{ padding: "9px 12px", border: "none", cursor: "pointer", background: direction === "add" ? "#16a34a" : "white", color: direction === "add" ? "white" : "#64748b", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <ArrowUp size={11} /> Add
              </button>
              <button type="button" onClick={() => setDirection("subtract")}
                style={{ padding: "9px 12px", border: "none", cursor: "pointer", background: direction === "subtract" ? "#e11d48" : "white", color: direction === "subtract" ? "white" : "#64748b", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <ArrowDown size={11} /> Reduce
              </button>
            </div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number" min="0" step="0.01" placeholder="0.00"
              style={{ flex: 1, boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1e293b", outline: "none", background: "white" }}
            />
          </div>
          {error && <p style={{ fontSize: 11, fontWeight: 600, color: "#be123c" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => { setAdding(false); setError(null); }}
              style={{ flex: 1, padding: 9, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 700, color: "#64748b", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="button" onClick={handleAdd}
              style={{ flex: 2, padding: 9, borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1a7fba,#2496d6)", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={12} /> Add Request
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: 10, borderRadius: 8, border: "1.5px dashed #b6def5", background: "#edf7fd", color: "#1a7fba", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <MessageSquarePlus size={13} /> Add Special Request
        </button>
      )}
    </div>
  );
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

export function ServiceStep({
  services, soaps, pewangis, items, notes, onChange, errors,
  specialRequests, onSpecialRequestsChange,
}: ServiceStepProps) {
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

      {/* Special requests — create-order flow only */}
      {onSpecialRequestsChange && (
        <>
          <InlineSpecialRequests requests={specialRequests ?? []} onChange={onSpecialRequestsChange} />
          <div style={{ borderTop: "1.5px dashed #e2e8f0" }} />
        </>
      )}

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