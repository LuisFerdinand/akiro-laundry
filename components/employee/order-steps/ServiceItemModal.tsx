/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Tag, Weight, Hash, Droplets, Wind, CheckCircle2,
  Search, Clock, ChevronRight, Minus, Plus, Shirt, Footprints,
} from "lucide-react";
import { formatUSD, OrderItemFormData } from "@/lib/utils/order-form";
import type { ServicePricing, Soap, Pewangi } from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceItemModalProps {
  editIndex:  number | null;
  initial:    OrderItemFormData;
  services:   ServicePricing[];
  soaps:      Soap[];
  pewangis:   Pewangi[];
  onConfirm:  (item: OrderItemFormData) => void;
  onClose:    () => void;
}

type ModalStep = "service" | "quantity" | "addons";

// ─── Drag threshold ───────────────────────────────────────────────────────────
const CLOSE_THRESHOLD = 120; // px dragged down before closing

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  value, min, max, step = 1, onChange, onInputChange, unit, isFloat = false,
}: {
  value: number | null; min: number; max: number; step?: number;
  onChange: (v: number | null) => void;
  onInputChange?: (v: number | null) => void;
  unit: string; isFloat?: boolean;
}) {
  const val = value ?? 0;

  // Local string state so typing doesn't fight the controlled value
  const [inputVal, setInputVal] = useState(val === 0 ? "" : String(val));

  // Keep local string in sync when external value changes (e.g. quick presets)
  useEffect(() => {
    setInputVal(val === 0 ? "" : String(val));
  }, [val]);

  const commit = (raw: string) => {
    const normalized = raw.replace(",", ".");
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || parsed <= 0) {
      onChange(null);
      onInputChange?.(null);
      setInputVal("");
    } else {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      onInputChange?.(clamped);
      if (clamped !== parsed) {
        setInputVal(String(clamped));
      }
    }
  };

  const decrement = () => {
    const next = Math.max(min, val - step);
    const result = next <= 0 ? null : next;
    onChange(result);
    onInputChange?.(result);
  };

  const increment = () => {
    const next = Math.min(max, val + step);
    onChange(next);
    onInputChange?.(next);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button" onClick={decrement} disabled={val <= min}
        className="flex items-center justify-center transition-all active:scale-95"
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: val <= min ? "#f1f5f9" : "white",
          border: `2px solid ${val <= min ? "#e2e8f0" : "#1a7fba"}`,
          color: val <= min ? "#cbd5e1" : "#1a7fba",
          boxShadow: val <= min ? "none" : "0 2px 8px rgba(26,127,186,0.15)",
        }}
      >
        <Minus size={20} strokeWidth={2.5} />
      </button>

      <div className="flex-1 flex flex-col items-center gap-1">
        <div
          className="relative w-full flex items-center justify-center"
          style={{ height: 72, borderRadius: 16, background: "linear-gradient(135deg,#edf7fd,#dff0fb)", border: "2px solid #b6def5" }}
        >
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            min={min} max={max}
            value={inputVal}
            onChange={(e) => {
              // Normalize comma to dot for locales that use comma as decimal separator
              const normalized = e.target.value.replace(",", ".");
              setInputVal(normalized);
              const parsed = parseFloat(normalized);
              if (!isNaN(parsed) && parsed > 0) {
                const clamped = Math.min(max, Math.max(min, parsed));
                onInputChange?.(clamped);
              } else {
                onInputChange?.(null);
              }
            }}
            onBlur={(e) => commit(e.target.value.replace(",", "."))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
            className="w-full text-center bg-transparent outline-none font-black"
            style={{ fontSize: 36, letterSpacing: "-0.04em", color: "#0f5a85", lineHeight: 1 }}
            placeholder="0"
          />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>
          {unit}
        </span>
      </div>

      <button
        type="button" onClick={increment} disabled={val >= max}
        className="flex items-center justify-center transition-all active:scale-95"
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: val >= max ? "#f1f5f9" : "linear-gradient(135deg,#1a7fba,#2496d6)",
          border: `2px solid ${val >= max ? "#e2e8f0" : "transparent"}`,
          color: "white",
          boxShadow: val >= max ? "none" : "0 4px 12px rgba(26,127,186,0.30)",
        }}
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── Quick presets ────────────────────────────────────────────────────────────

function QuickPresets({ presets, active, onSelect, unit }: {
  presets: number[]; active: number | null; onSelect: (v: number) => void; unit: string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {presets.map((p) => (
        <button key={p} type="button" onClick={() => onSelect(p)}
          className="transition-all active:scale-95 font-black text-sm"
          style={{
            padding: "7px 14px", borderRadius: 8,
            background: active === p ? "linear-gradient(135deg,#1a7fba,#2496d6)" : "white",
            border: `2px solid ${active === p ? "transparent" : "#e2e8f0"}`,
            color: active === p ? "white" : "#475569",
            boxShadow: active === p ? "0 2px 8px rgba(26,127,186,0.25)" : "none",
          }}
        >
          {p}{unit}
        </button>
      ))}
    </div>
  );
}

// ─── Addon Pill ───────────────────────────────────────────────────────────────

function AddonPill({ label, price, active, onClick, accent = "blue", isNone = false }: {
  label: string; price?: string; active: boolean; onClick: () => void;
  accent?: "blue" | "purple"; isNone?: boolean;
}) {
  const blue   = accent === "blue";
  const color  = blue ? "#1a7fba" : "#7c3aed";
  const color2 = blue ? "#2496d6" : "#8b5cf6";
  const softBg = blue ? "#edf7fd" : "#f5f3ff";
  const softBd = blue ? "#b6def5" : "#c4b5fd";

  return (
    <button type="button" onClick={onClick}
      className="transition-all active:scale-95 text-left"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 13px", borderRadius: 12,
        background: active ? `linear-gradient(135deg,${color},${color2})` : "white",
        border: `2px solid ${active ? "transparent" : isNone ? "#e2e8f0" : softBd}`,
        boxShadow: active ? `0 4px 12px ${blue ? "rgba(26,127,186,0.25)" : "rgba(124,58,237,0.25)"}` : "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {active
        ? <CheckCircle2 size={16} style={{ color: "white", flexShrink: 0 }} />
        : <div style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${isNone ? "#cbd5e1" : softBd}`, flexShrink: 0 }} />
      }
      <span className="font-bold text-sm flex-1 truncate" style={{ color: active ? "white" : isNone ? "#94a3b8" : "#1e293b" }}>
        {label}
      </span>
      {price && (
        <span className="text-xs font-black shrink-0"
          style={{ color: active ? "rgba(255,255,255,0.80)" : softBd === "#b6def5" ? "#1a7fba" : "#7c3aed" }}>
          {price}
        </span>
      )}
    </button>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ServiceItemModal({
  editIndex, initial, services, soaps, pewangis, onConfirm, onClose,
}: ServiceItemModalProps) {
  const [step, setStep]         = useState<ModalStep>(
    initial.servicePricingId
      ? (initial.weightKg != null || initial.quantity != null ? "addons" : "quantity")
      : "service",
  );
  const [item, setItem]         = useState<OrderItemFormData>(initial);
  const [search, setSearch]     = useState("");
  const [visible, setVisible]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [qtyError, setQtyError] = useState("");

  // ── Live preview value — updated on every keystroke, used only for the estimate display ──
  const [liveQty, setLiveQty] = useState<number | null>(
    initial.quantity ?? initial.weightKg ?? null,
  );

  // ── Drag-to-close state ────────────────────────────────────────────────────
  const [dragY, setDragY]         = useState(0);
  const isDragging                = useRef(false);
  const dragStartY                = useRef(0);
  const sheetRef                  = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  // ── Drag handle pointer handlers ───────────────────────────────────────────

  const handleDragStart = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    setDragY(delta);
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragY >= CLOSE_THRESHOLD) {
      setDragY(window.innerHeight);
      setTimeout(onClose, 280);
    } else {
      setDragY(0);
    }
  };

  const close = () => {
    setVisible(false);
    setDragY(0);
    setTimeout(onClose, 300);
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  const selectedService = services.find((s) => s.id === item.servicePricingId) ?? null;
  const isPerPcs        = selectedService?.pricingUnit === "per_pcs";
  const isEditing       = editIndex !== null;

  // ── Service groups ─────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? services.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()))
    : services;

  const grouped = new Map<string, ServicePricing[]>();
  for (const s of filtered) {
    if (!grouped.has(s.category)) grouped.set(s.category, []);
    grouped.get(s.category)!.push(s);
  }

  // ── Quantity next ──────────────────────────────────────────────────────────

  const handleQtyNext = () => {
    if (isPerPcs) {
      if (!item.quantity || item.quantity < 1) { setQtyError("At least 1 piece required."); return; }
    } else {
      if (!item.weightKg || item.weightKg <= 0) { setQtyError("Weight must be greater than 0."); return; }
    }
    setQtyError("");
    if (isPerPcs) { onConfirm(item); close(); return; }
    setStep("addons");
  };

  // ── Use liveQty for the estimate so it updates on every keystroke ──────────
  const liveSubtotal = selectedService && liveQty
    ? parseFloat(selectedService.basePricePerKg) * liveQty
    : 0;

  if (!mounted) return null;

  // ── Step indicator ─────────────────────────────────────────────────────────
  const steps: { key: ModalStep; label: string }[] = isPerPcs
    ? [{ key: "service", label: "Service" }, { key: "quantity", label: "Amount" }]
    : [{ key: "service", label: "Service" }, { key: "quantity", label: "Amount" }, { key: "addons", label: "Add-ons" }];
  const stepIdx = steps.findIndex((s) => s.key === step);

  // ── Sheet transform ────────────────────────────────────────────────────────
  const baseTranslate = visible ? 0 : 100;
  const sheetStyle: React.CSSProperties = {
    background:    "#f8fafc",
    borderRadius:  "24px 24px 0 0",
    maxHeight:     "92dvh",
    transform:     isDragging.current || dragY > 0
      ? `translateY(${dragY}px)`
      : `translateY(${baseTranslate}%)`,
    transition:    isDragging.current
      ? "none"
      : dragY > 0
        ? "transform 0.28s cubic-bezier(0.32,0.72,0,1)"
        : "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
    boxShadow:     "0 -12px 60px rgba(0,0,0,0.22)",
    overflow:      "hidden",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    display:       "flex",
    flexDirection: "column",
    width:         "100%",
    maxWidth:      "512px",
  };

  const modal = (
    <div
      role="dialog" aria-modal="true"
      className="fixed inset-0 flex items-end justify-center"
      style={{
        zIndex: 9999,
        background:           visible ? "rgba(15,23,42,0.55)"  : "rgba(15,23,42,0)",
        backdropFilter:       visible ? "blur(6px)"             : "none",
        WebkitBackdropFilter: visible ? "blur(6px)"             : "none",
        transition: "background 0.30s ease, backdrop-filter 0.30s ease",
        touchAction: "none",
      }}
      onClick={handleBackdrop}
    >
      <div ref={sheetRef} style={sheetStyle} onClick={(e) => e.stopPropagation()}>

        {/* ── Drag handle ─────────────────────────────────────────────────── */}
        <div
          className="flex justify-center pt-3 pb-1 shrink-0 select-none"
          style={{ cursor: "grab", touchAction: "none" }}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div
            style={{
              width: 44, height: 5, borderRadius: 3,
              background: dragY > 0 ? "#1a7fba" : "#cbd5e1",
              transition: "background 0.15s, width 0.15s",
            }}
          />
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-3 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-lg tracking-tight" style={{ color: "#0f2744", lineHeight: 1.1 }}>
                {isEditing ? "Edit service" : "Add service"}
              </h2>
              <p className="text-xs font-semibold mt-0.5" style={{ color: "#94a3b8" }}>
                {step === "service"  && "Choose a laundry type"}
                {step === "quantity" && (isPerPcs ? "How many pieces?" : "How many kilograms?")}
                {step === "addons"   && "Detergent & fragrance"}
              </p>
            </div>
            <button type="button" onClick={close}
              className="flex items-center justify-center w-9 h-9 transition-all active:scale-90"
              style={{ borderRadius: 10, border: "2px solid #e2e8f0", background: "white", color: "#64748b" }}>
              <X size={15} />
            </button>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => {
              const done   = i < stepIdx;
              const active = i === stepIdx;
              return (
                <div key={s.key} className="flex items-center gap-1.5 flex-1 last:flex-none last:flex-initial">
                  <button type="button" disabled={!done} onClick={() => done && setStep(s.key)}
                    className="flex items-center gap-1.5 transition-all">
                    <div style={{
                      width: active ? 28 : 22, height: 22, borderRadius: 6,
                      background: done ? "#22c55e" : active ? "#1a7fba" : "#e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}>
                      {done
                        ? <CheckCircle2 size={12} style={{ color: "white" }} />
                        : <span style={{ fontSize: 10, fontWeight: 900, color: active ? "white" : "#94a3b8" }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em",
                      color: done ? "#22c55e" : active ? "#1a7fba" : "#94a3b8",
                    }}>
                      {s.label}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-0.5 rounded-full"
                      style={{ background: i < stepIdx ? "#22c55e" : "#e2e8f0", transition: "background 0.3s" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

          {/* ════ STEP: SERVICE ════════════════════════════════════════════ */}
          {step === "service" && (
            <div className="px-5 pt-2 pb-4 space-y-3">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3.5 pointer-events-none" style={{ color: "#94a3b8" }} />
                <input
                  className="w-full h-11 pl-10 pr-9 text-sm font-semibold text-slate-800 bg-white placeholder:text-slate-300 outline-none"
                  style={{ borderRadius: 12, border: "2px solid #e2e8f0", transition: "border 0.15s" }}
                  placeholder="Search services…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
                {search && (
                  <button type="button" className="absolute right-3" onClick={() => setSearch("")}>
                    <X size={13} style={{ color: "#94a3b8" }} />
                  </button>
                )}
              </div>

              {grouped.size === 0 && (
                <div className="flex flex-col items-center py-10 gap-2" style={{ color: "#94a3b8" }}>
                  <Search size={24} />
                  <p className="text-sm font-semibold">No results for &ldquo;{search}&rdquo;</p>
                </div>
              )}

              {Array.from(grouped.entries()).map(([cat, catItems]) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    {cat === "package" || cat === "regular"
                      ? <Shirt size={12} style={{ color: "#1a7fba" }} />
                      : <Footprints size={12} style={{ color: "#7c3aed" }} />
                    }
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>{cat}</span>
                  </div>
                  <div className="space-y-2">
                    {catItems.map((s) => {
                      const active = item.servicePricingId === s.id;
                      return (
                        <button key={s.id} type="button" onClick={() => {
                          const nowPerPcs = s.pricingUnit === "per_pcs";
                          setItem((prev) => ({
                            ...prev,
                            servicePricingId: s.id,
                            weightKg: nowPerPcs ? null : prev.weightKg,
                            quantity:  nowPerPcs ? prev.quantity : null,
                          }));
                          setStep("quantity");
                        }}
                          className="w-full transition-all active:scale-[0.985]"
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 14px", borderRadius: 14,
                            background: active ? "linear-gradient(135deg,#1a7fba,#2496d6)" : "white",
                            border: `2px solid ${active ? "transparent" : "#e8eef5"}`,
                            boxShadow: active ? "0 4px 16px rgba(26,127,186,0.28)" : "0 1px 4px rgba(0,0,0,0.05)",
                          }}
                        >
                          <div style={{
                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: active ? "rgba(255,255,255,0.20)" : "linear-gradient(135deg,#edf7fd,#c8e9f8)",
                            border: active ? "1.5px solid rgba(255,255,255,0.30)" : "1.5px solid #b6def5",
                          }}>
                            <Tag size={16} style={{ color: active ? "white" : "#1a7fba" }} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-black text-sm truncate" style={{ color: active ? "white" : "#1e293b" }}>{s.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {s.duration && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: active ? "rgba(255,255,255,0.65)" : "#94a3b8" }}>
                                  <Clock size={9} />{s.duration}
                                </span>
                              )}
                              {s.notes && (
                                <span className="text-[10px] font-semibold truncate" style={{ color: active ? "rgba(255,255,255,0.65)" : "#94a3b8" }}>
                                  {s.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-sm" style={{ color: active ? "white" : "#1e293b" }}>
                              {formatUSD(parseFloat(s.basePricePerKg))}
                            </p>
                            <p className="text-[10px] font-bold" style={{ color: active ? "rgba(255,255,255,0.65)" : "#94a3b8" }}>
                              {s.pricingUnit === "per_pcs" ? "/ pcs" : "/ kg"}
                            </p>
                          </div>
                          <ChevronRight size={14} style={{ color: active ? "rgba(255,255,255,0.7)" : "#cbd5e1", flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ════ STEP: QUANTITY ══════════════════════════════════════════ */}
          {step === "quantity" && selectedService && (
            <div className="px-5 pt-2 pb-4 space-y-5">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl"
                style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6)", boxShadow: "0 4px 16px rgba(26,127,186,0.28)" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.20)", border: "1.5px solid rgba(255,255,255,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Tag size={16} style={{ color: "white" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">{selectedService.name}</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {formatUSD(parseFloat(selectedService.basePricePerKg))} {isPerPcs ? "/ pcs" : "/ kg"}
                  </p>
                </div>
                <button type="button" onClick={() => setStep("service")}
                  className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.20)", color: "white", border: "1.5px solid rgba(255,255,255,0.30)" }}>
                  Change
                </button>
              </div>

              <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid #e8eef5" }}>
                <Stepper
                  value={isPerPcs ? item.quantity : item.weightKg}
                  min={isPerPcs ? 1 : 0.1} max={isPerPcs ? 1000 : 100}
                  step={isPerPcs ? 1 : 0.1}
                  isFloat={!isPerPcs}
                  unit={isPerPcs ? "pieces" : "kilograms"}
                  onChange={(v) => {
                    setQtyError("");
                    setLiveQty(v);
                    setItem((prev) => isPerPcs
                      ? { ...prev, quantity: v != null ? Math.round(v) : null, weightKg: null }
                      : { ...prev, weightKg: v, quantity: null });
                  }}
                  onInputChange={(v) => {
                    // Update live preview on every keystroke without committing to item state
                    setLiveQty(v);
                  }}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: "#94a3b8" }}>Quick select</p>
                <QuickPresets
                  presets={isPerPcs ? [1, 2, 3, 5, 10] : [1, 2, 3, 5, 7, 10]}
                  active={isPerPcs ? item.quantity : item.weightKg}
                  unit={isPerPcs ? " pcs" : " kg"}
                  onSelect={(v) => {
                    setQtyError("");
                    setLiveQty(v);
                    setItem((prev) => isPerPcs
                      ? { ...prev, quantity: v, weightKg: null }
                      : { ...prev, weightKg: v, quantity: null });
                  }}
                />
              </div>

              {qtyError && <p className="text-xs font-semibold" style={{ color: "#e05252" }}>{qtyError}</p>}

              {/* Base estimate — driven by liveQty so it updates on every keystroke */}
              {liveSubtotal > 0 && (
                <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                  style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "2px solid #86efac" }}>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#16a34a" }}>Base estimate</p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#4ade80" }}>
                      {liveQty} {isPerPcs ? "pcs" : "kg"} × {formatUSD(parseFloat(selectedService.basePricePerKg))}
                    </p>
                  </div>
                  <p className="font-black text-xl" style={{ color: "#14532d", letterSpacing: "-0.03em" }}>{formatUSD(liveSubtotal)}</p>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP: ADDONS ════════════════════════════════════════════ */}
          {step === "addons" && selectedService && (
            <div className="px-5 pt-2 pb-4 space-y-5">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6)" }}>
                <Tag size={13} style={{ color: "white" }} />
                <span className="font-black text-sm text-white truncate flex-1">{selectedService.name}</span>
                <span className="font-black text-sm" style={{ color: "rgba(255,255,255,0.80)" }}>{item.weightKg} kg</span>
                <button type="button" onClick={() => setStep("quantity")}
                  className="ml-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.20)", color: "white", border: "1.5px solid rgba(255,255,255,0.30)" }}>
                  Edit
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "1.5px solid #b6def5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Droplets size={13} style={{ color: "#1a7fba" }} />
                  </div>
                  <p className="font-black text-sm" style={{ color: "#1e293b" }}>Detergent</p>
                  <span className="text-[10px] font-semibold" style={{ color: "#94a3b8" }}>optional</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <AddonPill label="No detergent" active={item.soapId === null}
                    onClick={() => setItem((p) => ({ ...p, soapId: null }))} isNone accent="blue" />
                  {soaps.map((s) => (
                    <AddonPill key={s.id} label={s.name}
                      price={`+${formatUSD(parseFloat(s.pricePerKg))}/kg`}
                      active={item.soapId === s.id}
                      onClick={() => setItem((p) => ({ ...p, soapId: s.id }))} accent="blue" />
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "2px dashed #e2e8f0" }} />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1.5px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Wind size={13} style={{ color: "#7c3aed" }} />
                  </div>
                  <p className="font-black text-sm" style={{ color: "#1e293b" }}>Fragrance</p>
                  <span className="text-[10px] font-semibold" style={{ color: "#94a3b8" }}>optional</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <AddonPill label="No fragrance" active={item.pewangiId === null}
                    onClick={() => setItem((p) => ({ ...p, pewangiId: null }))} isNone accent="purple" />
                  {pewangis.map((p) => (
                    <AddonPill key={p.id} label={p.name}
                      price={`+${formatUSD(parseFloat(p.pricePerKg))}/kg`}
                      active={item.pewangiId === p.id}
                      onClick={() => setItem((q) => ({ ...q, pewangiId: p.id }))} accent="purple" />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>{/* end scroll body */}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-4"
          style={{ borderTop: "2px solid #f1f5f9", background: "rgba(248,250,252,0.98)", backdropFilter: "blur(8px)" }}>
          {step === "service" && (
            <div className="text-center">
              <p className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Tap a service to continue →</p>
            </div>
          )}
          {step === "quantity" && (
            <button type="button" onClick={handleQtyNext}
              className="w-full h-13 flex items-center justify-center gap-2 font-black text-sm transition-all active:scale-[0.98]"
              style={{ height: 52, borderRadius: 14, background: "linear-gradient(135deg,#1a7fba,#2496d6,#0f5a85)", boxShadow: "0 4px 16px rgba(26,127,186,0.30)", color: "white" }}>
              {isPerPcs ? "Confirm" : "Next: Add-ons"}
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          )}
          {step === "addons" && (
            <button type="button" onClick={() => { onConfirm(item); close(); }}
              className="w-full flex items-center justify-center gap-2 font-black text-sm transition-all active:scale-[0.98]"
              style={{ height: 52, borderRadius: 14, background: "linear-gradient(135deg,#16a34a,#22c55e,#15803d)", boxShadow: "0 4px 16px rgba(22,163,74,0.28)", color: "white" }}>
              <CheckCircle2 size={16} />
              {isEditing ? "Save Changes" : "Add to Order"}
            </button>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}