// components/admin/ExportModal.tsx
"use client";

import { useState } from "react";
import { X, Download, Calendar, Loader2, FileSpreadsheet } from "lucide-react";

export interface ExportDateRange {
  from: string; // ISO date string "YYYY-MM-DD"
  to:   string;
}

interface Props {
  title:    string;
  onClose:  () => void;
  onExport: (range: ExportDateRange) => Promise<void>;
}

// Quick preset ranges
const PRESETS = [
  { label: "Last 7 days",   days: 7  },
  { label: "Last 30 days",  days: 30 },
  { label: "Last 90 days",  days: 90 },
  { label: "Last 365 days", days: 365 },
];

function toLocalISO(d: Date) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function ExportModal({ title, onClose, onExport }: Props) {
  const today   = toLocalISO(new Date());
  const ago30   = toLocalISO(new Date(Date.now() - 30 * 864e5));

  const [from,      setFrom]      = useState(ago30);
  const [to,        setTo]        = useState(today);
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const applyPreset = (days: number) => {
    setFrom(toLocalISO(new Date(Date.now() - days * 864e5)));
    setTo(today);
    setError(null);
  };

  const handleExport = async () => {
    if (!from || !to) { setError("Please select both start and end dates."); return; }
    if (from > to)    { setError("Start date must be before end date.");      return; }
    setError(null);
    setIsPending(true);
    try {
      await onExport({ from, to });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  /* ── styles ── */
  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    border: "1.5px solid #e2e8f0", borderRadius: "8px",
    fontSize: "13px", color: "#1e293b", outline: "none",
    background: "#f8fafc", fontFamily: "inherit",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", backdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "white", borderRadius: "16px", border: "1.5px solid #e2e8f0",
        boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
        width: "100%", maxWidth: "420px", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#16a34a,#22c55e 55%,#15803d)",
          padding: "18px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Export Data
            </p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>{title}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileSpreadsheet size={20} style={{ color: "rgba(255,255,255,0.75)" }} />
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
                borderRadius: "7px", width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} style={{ color: "white" }} />
            </button>
          </div>
        </div>

        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Quick presets */}
          <div>
            <p style={lbl}>Quick Select</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  style={{
                    padding: "5px 11px", borderRadius: "999px",
                    border: "1.5px solid #e2e8f0",
                    background: "white", color: "#475569",
                    fontSize: "11px", fontWeight: 700, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#22c55e";
                    e.currentTarget.style.color = "#16a34a";
                    e.currentTarget.style.background = "#f0fdf4";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.color = "#475569";
                    e.currentTarget.style.background = "white";
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#cbd5e1" }}>OR CUSTOM RANGE</span>
            <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
          </div>

          {/* Date pickers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={lbl}>
                <Calendar size={9} style={{ display: "inline", marginRight: "4px" }} />
                Start Date
              </label>
              <input
                type="date"
                value={from}
                max={to || today}
                onChange={(e) => { setFrom(e.target.value); setError(null); }}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>
                <Calendar size={9} style={{ display: "inline", marginRight: "4px" }} />
                End Date
              </label>
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => { setTo(e.target.value); setError(null); }}
                style={inp}
              />
            </div>
          </div>

          {/* Selected range summary */}
          {from && to && from <= to && (
            <div style={{
              background: "#f0fdf4", border: "1.5px solid #86efac",
              borderRadius: "8px", padding: "10px 14px",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <Calendar size={13} style={{ color: "#16a34a", flexShrink: 0 }} />
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#14532d" }}>
                Exporting from{" "}
                <strong>{new Date(from + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                {" "}to{" "}
                <strong>{new Date(to + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isPending}
            style={{
              height: 46, borderRadius: "9px", border: "none",
              background: isPending
                ? "#94a3b8"
                : "linear-gradient(135deg,#16a34a,#22c55e 55%,#15803d)",
              boxShadow: isPending ? "none" : "0 4px 14px rgba(22,163,74,0.3)",
              color: "white", fontSize: "14px", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            {isPending
              ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
              : <><Download size={14} /> Export as Excel (.xlsx)</>}
          </button>
        </div>
      </div>
    </div>
  );
}