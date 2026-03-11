// components/employee/order-steps/ServiceStep.tsx
"use client";

import { useState, useMemo } from "react";
import { Weight, Clock, Tag, CheckCircle2, Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { formatUSD } from "@/lib/utils/order-form";
import type { ServicePricing } from "@/lib/db/schema";

interface ServiceStepProps {
  services: ServicePricing[];
  servicePricingId: number | null;
  weightKg: number | null;
  onChange: (servicePricingId: number | null, weightKg: number | null) => void;
  errors: Record<string, string>;
}

export function ServiceStep({ services, servicePricingId, weightKg, onChange, errors }: ServiceStepProps) {
  const [search, setSearch]               = useState("");
  const [expandedCats, setExpandedCats]   = useState<Set<string>>(new Set());

  // Derive sorted unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(services.map((s) => s.category)));
    return cats.sort();
  }, [services]);

  // Filter services by search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q),
    );
  }, [services, search]);

  // Group filtered services by category
  const grouped = useMemo(() => {
    const map = new Map<string, ServicePricing[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [filtered]);

  // Auto-expand category that contains the selected service or search results
  const activeCats = useMemo(() => {
    const set = new Set(expandedCats);
    // Always expand the category of the selected service
    if (servicePricingId) {
      const sel = services.find((s) => s.id === servicePricingId);
      if (sel) set.add(sel.category);
    }
    // When searching, expand all matching categories
    if (search.trim()) {
      grouped.forEach((_, cat) => set.add(cat));
    }
    return set;
  }, [expandedCats, servicePricingId, services, search, grouped]);

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (activeCats.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectedService = services.find((s) => s.id === servicePricingId);

  return (
    <div className="space-y-5">

      {/* ── Search bar ────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">
          Service Type
        </label>

        <div className="relative flex items-center">
          <div
            className="absolute left-3.5 pointer-events-none flex items-center justify-center w-8 h-8"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
              border: "1.5px solid #b6def5",
            }}
          >
            <Search size={13} style={{ color: "#1a7fba" }} />
          </div>
          <input
            className="w-full h-11 pl-14 pr-10 text-sm font-medium text-slate-800 bg-white placeholder:text-slate-300 placeholder:font-normal outline-none transition-all duration-150"
            style={{
              borderRadius: "8px",
              border: "2px solid #e2e8f0",
            }}
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#1a7fba";
              e.currentTarget.style.boxShadow = "0 0 0 3.5px rgba(26,127,186,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3.5 flex items-center justify-center w-5 h-5 transition-colors"
              style={{ color: "#94a3b8", borderRadius: "4px" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e05252")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              onClick={() => setSearch("")}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Selected service summary (when one is chosen) ── */}
      {selectedService && !search && (
        <div
          className="flex items-center gap-3"
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #edf7fd 0%, #dff0fb 100%)",
            border: "1.5px solid #b6def5",
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center w-8 h-8"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)",
              boxShadow: "0 2px 8px rgba(26,127,186,0.25)",
            }}
          >
            <Tag size={12} style={{ color: "white" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "#0f5a85" }}>
              {selectedService.name}
            </p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#1a7fba" }}>
              {formatUSD(parseFloat(selectedService.basePricePerKg))}
              {selectedService.pricingUnit === "per_pcs" ? " / pc" : " / kg"}
            </p>
          </div>
          <CheckCircle2 size={16} style={{ color: "#1a7fba", flexShrink: 0 }} />
        </div>
      )}

      {/* ── Category accordion ────────────────────────────── */}
      <div className="space-y-2">
        {grouped.size === 0 && (
          <div
            className="flex flex-col items-center py-8 gap-2"
            style={{ color: "#94a3b8" }}
          >
            <Search size={22} />
            <p className="text-sm font-semibold">No services match &quot;{search}&quot;</p>
          </div>
        )}

        {categories
          .filter((cat) => grouped.has(cat))
          .map((cat) => {
            const items     = grouped.get(cat)!;
            const isOpen    = activeCats.has(cat);
            const hasActive = items.some((s) => s.id === servicePricingId);

            return (
              <div
                key={cat}
                style={{
                  borderRadius: "8px",
                  border: hasActive ? "2px solid #b6def5" : "2px solid #e2e8f0",
                  background: "white",
                  overflow: "hidden",
                  boxShadow: hasActive
                    ? "0 2px 12px rgba(26,127,186,0.08)"
                    : "0 1px 4px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {/* Category header / toggle */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 text-left transition-colors"
                  style={{ padding: "11px 14px" }}
                  onClick={() => toggleCat(cat)}
                  onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Category color bar */}
                  <div
                    style={{
                      width: 3,
                      height: 20,
                      borderRadius: "2px",
                      background: hasActive
                        ? "linear-gradient(180deg, #1a7fba 0%, #2496d6 100%)"
                        : "#e2e8f0",
                      flexShrink: 0,
                      transition: "background 0.15s",
                    }}
                  />

                  <p
                    className="flex-1 text-xs font-black uppercase tracking-widest capitalize"
                    style={{ color: hasActive ? "#1a7fba" : "#64748b" }}
                  >
                    {cat}
                  </p>

                  {/* Item count badge */}
                  <span
                    className="text-[10px] font-black"
                    style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      background: hasActive ? "#c8e9f8" : "#f1f5f9",
                      color: hasActive ? "#1a7fba" : "#94a3b8",
                    }}
                  >
                    {items.length}
                  </span>

                  {isOpen
                    ? <ChevronUp  size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  }
                </button>

                {/* Items list */}
                {isOpen && (
                  <div style={{ borderTop: "1.5px solid #f1f5f9" }}>
                    {items.map((s, i) => {
                      const active = servicePricingId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onChange(s.id, weightKg)}
                          className="w-full text-left transition-all duration-150 active:scale-[0.99]"
                          style={{
                            display: "flex",
                            alignItems: "stretch",
                            borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
                            background: active
                              ? "linear-gradient(135deg, #edf7fd 0%, #f5fbff 100%)"
                              : "white",
                          }}
                          onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.background = "#f8fcff";
                          }}
                          onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.background = "white";
                          }}
                        >
                          {/* Row left accent */}
                          <div
                            style={{
                              width: 3,
                              flexShrink: 0,
                              background: active
                                ? "linear-gradient(180deg, #1a7fba 0%, #2496d6 100%)"
                                : "transparent",
                            }}
                          />

                          <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                            {/* Icon */}
                            <div
                              className="shrink-0 flex items-center justify-center"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "6px",
                                background: active
                                  ? "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)"
                                  : "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
                                border: active ? "none" : "1.5px solid #b6def5",
                                boxShadow: active ? "0 2px 8px rgba(26,127,186,0.2)" : "none",
                              }}
                            >
                              <Tag size={12} style={{ color: active ? "white" : "#1a7fba" }} />
                            </div>

                            {/* Name + meta */}
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-bold text-sm leading-tight truncate"
                                style={{ color: active ? "#0f5a85" : "#1e293b" }}
                              >
                                {s.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {s.duration && (
                                  <span
                                    className="flex items-center gap-0.5 text-[10px] font-medium"
                                    style={{ color: "#94a3b8" }}
                                  >
                                    <Clock size={9} />
                                    {s.duration}
                                  </span>
                                )}
                                {s.notes && (
                                  <span
                                    className="text-[10px] font-medium truncate"
                                    style={{ color: "#94a3b8" }}
                                  >
                                    {s.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Price + check */}
                            <div className="shrink-0 flex items-center gap-2">
                              <div
                                className="text-right"
                                style={{
                                  padding: "5px 9px",
                                  borderRadius: "5px",
                                  background: active
                                    ? "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)"
                                    : "#f8fafc",
                                  border: active ? "none" : "1.5px solid #e2e8f0",
                                  minWidth: "58px",
                                }}
                              >
                                <p
                                  className="font-black text-sm leading-none"
                                  style={{ color: active ? "white" : "#1e293b" }}
                                >
                                  {formatUSD(parseFloat(s.basePricePerKg))}
                                </p>
                                <p
                                  className="text-[9px] mt-0.5 font-bold"
                                  style={{ color: active ? "rgba(255,255,255,0.7)" : "#94a3b8" }}
                                >
                                  {s.pricingUnit === "per_pcs" ? "/ pc" : "/ kg"}
                                </p>
                              </div>
                              <div style={{ width: 16, flexShrink: 0 }}>
                                {active && <CheckCircle2 size={16} style={{ color: "#1a7fba" }} />}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {errors.service && (
        <p className="text-xs font-semibold px-1" style={{ color: "#e05252" }}>
          {errors.service}
        </p>
      )}

      {/* ── Weight input ──────────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          className="block text-[11px] font-black uppercase tracking-widest text-slate-400"
          htmlFor="weight"
        >
          Weight (kg)
        </label>

        <div className="relative flex items-center">
          <div
            className="absolute left-3.5 pointer-events-none flex items-center justify-center w-8 h-8"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
              border: "1.5px solid #b6def5",
            }}
          >
            <Weight size={14} style={{ color: "#1a7fba" }} />
          </div>
          <input
            id="weight"
            type="number"
            min="0.1"
            step="0.1"
            max="100"
            className="w-full h-12 pl-14 pr-16 text-sm font-semibold text-slate-800 bg-white placeholder:text-slate-300 placeholder:font-normal outline-none transition-all duration-150"
            style={{
              borderRadius: "8px",
              border: errors.weight ? "2px solid #fca5a5" : "2px solid #e2e8f0",
            }}
            placeholder="e.g. 3.5"
            value={weightKg ?? ""}
            onChange={(e) => onChange(servicePricingId, e.target.value ? parseFloat(e.target.value) : null)}
            onFocus={(e) => {
              if (!errors.weight) e.currentTarget.style.borderColor = "#1a7fba";
              e.currentTarget.style.boxShadow = errors.weight
                ? "0 0 0 3.5px rgba(239,68,68,0.12)"
                : "0 0 0 3.5px rgba(26,127,186,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = errors.weight ? "#fca5a5" : "#e2e8f0";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <div className="absolute right-3.5 pointer-events-none">
            <span
              className="text-[11px] font-black"
              style={{
                color: "#1a7fba",
                background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
                border: "1.5px solid #b6def5",
                padding: "3px 9px",
                borderRadius: "4px",
              }}
            >
              kg
            </span>
          </div>
        </div>

        {errors.weight && (
          <p className="text-xs font-semibold px-1" style={{ color: "#e05252" }}>
            {errors.weight}
          </p>
        )}
      </div>
    </div>
  );
}