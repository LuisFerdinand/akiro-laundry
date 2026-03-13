/* eslint-disable react/no-unescaped-entities */
// components/admin/ServicesClient.tsx
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus, X, Save, Loader2, Trash2, Edit2, CheckCircle2,
  Sparkles, ToggleLeft, ToggleRight, AlertTriangle,
  Search, TrendingUp, ShoppingBag, Flame, Crown,
} from "lucide-react";
import {
  createService, updateService, deleteService,
} from "@/lib/actions/admin-services";
import { formatUSD } from "@/lib/utils/order-form";
import type { ServiceWithStats } from "@/lib/actions/admin-services";

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 14px",
  border: "1.5px solid #e2e8f0", borderRadius: "8px",
  fontSize: "14px", color: "#1e293b", outline: "none",
  background: "#f8fafc", fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 800,
  color: "#94a3b8", textTransform: "uppercase",
  letterSpacing: "0.1em", marginBottom: "6px",
};
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.currentTarget.style.borderColor = "#b6def5");
const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.currentTarget.style.borderColor = "#e2e8f0");

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({
  label, onConfirm, onClose, isPending,
}: { label: string; onConfirm: () => void; onClose: () => void; isPending: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #fda4af", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", width: "100%", maxWidth: "380px", padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fff1f2", border: "1.5px solid #fda4af", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AlertTriangle size={22} style={{ color: "#be123c" }} />
        </div>
        <div>
          <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "16px", color: "#0f172a", marginBottom: "6px" }}>Delete "{label}"?</p>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>This cannot be undone. If linked to existing orders, deletion will fail.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "13px", fontWeight: 700, color: "#64748b", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} disabled={isPending} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: isPending ? "#94a3b8" : "linear-gradient(135deg,#dc2626,#ef4444)", fontSize: "13px", fontWeight: 800, color: "white", cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Service Modal ────────────────────────────────────────────────────────────
function ServiceModal({ existing, onClose, onSuccess }: { existing?: ServiceWithStats; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!existing;
  const [name,        setName]        = useState(existing?.name           ?? "");
  const [price,       setPrice]       = useState(existing?.basePricePerKg ?? "");
  const [category,    setCategory]    = useState(existing?.category       ?? "package");
  const [pricingUnit, setPricingUnit] = useState(existing?.pricingUnit    ?? "per_kg");
  const [minimumKg,   setMinimumKg]   = useState(existing?.minimumKg      ?? "");
  const [duration,    setDuration]    = useState(existing?.duration        ?? "");
  const [notes,       setNotes]       = useState(existing?.notes           ?? "");
  const [isActive,    setIsActive]    = useState(existing?.isActive        ?? true);
  const [error,       setError]       = useState<string | null>(null);
  const [isPending,   start]          = useTransition();

  const handleSubmit = () => {
    setError(null);
    start(async () => {
      const data = { name, basePricePerKg: price, category, pricingUnit, minimumKg, duration, notes, isActive };
      const result = isEdit ? await updateService(existing!.id, data) : await createService(data);
      if (result.success) onSuccess();
      else setError(result.error ?? "Failed.");
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", width: "100%", maxWidth: "500px", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", padding: "18px 22px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{isEdit ? "Edit Service" : "New Service"}</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>{isEdit ? "Edit Service" : "Add Service"}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: "7px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>
        <div style={{ padding: "22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Service Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Regular Wash" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Base Price *</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" type="number" min="0" step="0.01" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>Pricing Unit</label>
              <select value={pricingUnit} onChange={(e) => setPricingUnit(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="per_kg">Per KG</option>
                <option value="per_pcs">Per Piece</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="package">Package</option>
                <option value="express">Express</option>
                <option value="specialty">Specialty</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Minimum KG</label>
              <input value={minimumKg} onChange={(e) => setMinimumKg(e.target.value)} placeholder="e.g. 3" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Duration</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 1-2 days" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" style={{ ...inputStyle, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
          </div>
          {isEdit && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "1.5px solid #e2e8f0" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>Active</p>
                <p style={{ fontSize: "11px", color: "#94a3b8" }}>Inactive services won't appear in new orders</p>
              </div>
              <button onClick={() => setIsActive(!isActive)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {isActive ? <ToggleRight size={32} style={{ color: "#1a7fba" }} /> : <ToggleLeft size={32} style={{ color: "#94a3b8" }} />}
              </button>
            </div>
          )}
          {error && (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}
          <button onClick={handleSubmit} disabled={isPending} style={{ height: 46, borderRadius: "9px", border: "none", background: isPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.3)", color: "white", fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1 }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> {isEdit ? "Save Changes" : "Create Service"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Popular Service Card ─────────────────────────────────────────────────────
function PopularServiceCard({
  service, rank, maxOrders,
}: { service: ServiceWithStats; rank: number; maxOrders: number }) {
  const pct = maxOrders > 0 ? (service.totalOrders / maxOrders) * 100 : 0;

  const rankColors = [
    { bg: "linear-gradient(135deg,#f59e0b,#fbbf24)", text: "#92400e", lightBg: "linear-gradient(135deg,#fffbeb,#fef9c3)" },
    { bg: "linear-gradient(135deg,#94a3b8,#cbd5e1)", text: "#334155", lightBg: "linear-gradient(135deg,#f8fafc,#f1f5f9)" },
    { bg: "linear-gradient(135deg,#cd7c3f,#e8a06b)", text: "#7c2d12", lightBg: "linear-gradient(135deg,#fff7ed,#ffedd5)" },
  ];
  const rc = rankColors[rank - 1] ?? rankColors[2];

  return (
    <div style={{
      background: "white", borderRadius: "12px",
      border: rank === 1 ? "1.5px solid #fcd34d" : "1.5px solid #e2e8f0",
      boxShadow: rank === 1 ? "0 4px 16px rgba(245,158,11,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
      padding: "16px 18px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background accent */}
      {rank === 1 && (
        <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* Rank badge */}
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          {rank === 1 ? <Crown size={14} style={{ color: "white" }} /> : <span style={{ fontSize: "12px", fontWeight: 800, color: "white" }}>#{rank}</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>{service.name}</p>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", background: "#edf7fd", border: "1px solid #b6def5", color: "#1a7fba" }}>{service.category}</span>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif", lineHeight: 1 }}>{service.totalOrders}</p>
              <p style={{ fontSize: "9px", fontWeight: 600, color: "#94a3b8", marginTop: "2px" }}>orders</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: "999px", background: rank === 1 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : rank === 2 ? "linear-gradient(90deg,#94a3b8,#cbd5e1)" : "linear-gradient(90deg,#cd7c3f,#e8a06b)" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              {formatUSD(parseFloat(service.basePricePerKg))} / {service.pricingUnit === "per_kg" ? "kg" : "pcs"}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a" }}>
              {formatUSD(service.totalRevenue)} earned
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props { services: ServiceWithStats[]; initialSearch: string }

export function ServicesClient({ services, initialSearch }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [modal,        setModal]        = useState<{ open: boolean; existing?: ServiceWithStats }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<ServiceWithStats | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);
  const [isPending,    start]           = useTransition();
  const [search,       setSearch]       = useState(initialSearch);

  // Debounce ref for search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushUrl = (q: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (q) sp.set("search", q); else sp.delete("search");
    start(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl(v), 350);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    pushUrl("");
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSuccess = (msg: string) => { setModal({ open: false }); showToast(msg); router.refresh(); };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    start(async () => {
      const result = await deleteService(deleteTarget.id);
      setDeleteTarget(null);
      if (result.success) { showToast("Service deleted."); router.refresh(); }
      else showToast(`Error: ${result.error}`);
    });
  };

  // Compute top popular services (from full unfiltered — sorted by orders)
  const popularServices = [...services]
    .filter((s) => s.totalOrders > 0)
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, 3);

  const maxOrders = popularServices[0]?.totalOrders ?? 0;
  const totalRevenue = services.reduce((s, svc) => s + svc.totalRevenue, 0);
  const totalOrders  = services.reduce((s, svc) => s + svc.totalOrders,  0);

  return (
    <>
      {modal.open && (
        <ServiceModal
          existing={modal.existing}
          onClose={() => setModal({ open: false })}
          onSuccess={() => handleSuccess(modal.existing ? "Service updated." : "Service created.")}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          label={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          isPending={isPending}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 200, background: "white", borderRadius: "10px", border: "1.5px solid #86efac", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "12px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#14532d" }}>{toast}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>Services</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              {services.length} service{services.length !== 1 ? "s" : ""} · {totalOrders} total orders · {formatUSD(totalRevenue)} revenue
            </p>
          </div>
          <button onClick={() => setModal({ open: true })} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", borderRadius: "9px", border: "none", background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", boxShadow: "0 4px 14px rgba(26,127,186,0.3)", color: "white", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
            <Plus size={15} /> Add Service
          </button>
        </div>

        {/* ── Popular Services ── */}
        {popularServices.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Flame size={15} style={{ color: "#f59e0b" }} />
              <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>Most Popular</p>
              <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>· by order count</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(popularServices.length, 3)}, 1fr)`, gap: "14px" }}>
              {popularServices.map((s, i) => (
                <PopularServiceCard key={s.id} service={s} rank={i + 1} maxOrders={maxOrders} />
              ))}
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or category…"
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 34, paddingRight: search ? 30 : 12, paddingTop: 9, paddingBottom: 9,
                border: "1.5px solid #e2e8f0", borderRadius: "8px",
                fontSize: "13px", color: "#1e293b", outline: "none", background: "#f8fafc",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
            {search && (
              <button onClick={handleClearSearch} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "#e2e8f0", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                <X size={10} style={{ color: "#64748b" }} />
              </button>
            )}
          </div>
          {isPending && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Loader2 size={13} style={{ color: "#94a3b8" }} className="animate-spin" />
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Searching…</span>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden", opacity: isPending ? 0.55 : 1, transition: "opacity 0.2s" }}>
          {services.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <Sparkles size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
                {search ? `No services matching "${search}"` : "No services yet"}
              </p>
              {search ? (
                <button onClick={handleClearSearch} style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "#1a7fba", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear search</button>
              ) : (
                <p style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}>Click "Add Service" to get started</p>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Name", "Category", "Price", "Unit", "Min KG", "Duration", "Orders", "Revenue", "Status", ""].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, i) => (
                    <tr key={s.id}
                      style={{ background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                    >
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{s.name}</p>
                          {s.notes && <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{s.notes}</p>}
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "999px", background: "#edf7fd", border: "1px solid #b6def5", color: "#1a7fba" }}>{s.category}</span>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{formatUSD(parseFloat(s.basePricePerKg))}</span>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{s.pricingUnit === "per_kg" ? "/ kg" : "/ pcs"}</span>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{s.minimumKg ?? "—"}</span>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{s.duration ?? "—"}</span>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <ShoppingBag size={11} style={{ color: "#1a7fba" }} />
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a7fba" }}>{s.totalOrders}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <TrendingUp size={11} style={{ color: "#16a34a" }} />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a" }}>{formatUSD(s.totalRevenue)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "999px", background: s.isActive ? "#f0fdf4" : "#f8fafc", border: `1px solid ${s.isActive ? "#86efac" : "#e2e8f0"}`, color: s.isActive ? "#16a34a" : "#94a3b8" }}>
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => setModal({ open: true, existing: s })} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#1a7fba", background: "#edf7fd", padding: "4px 10px", borderRadius: "6px", border: "1px solid #b6def5", cursor: "pointer" }}>
                            <Edit2 size={10} /> Edit
                          </button>
                          <button onClick={() => setDeleteTarget(s)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#be123c", background: "#fff1f2", padding: "4px 10px", borderRadius: "6px", border: "1px solid #fda4af", cursor: "pointer" }}>
                            <Trash2 size={10} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}