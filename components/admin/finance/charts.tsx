"use client";

import { formatUSD } from "@/lib/utils/order-form";

// ─── Filled pie with legend (amount + %) ─────────────────────────────────────
// Arc math mirrors the Donut in components/admin/marketing/charts.tsx, but draws
// filled wedges from the centre instead of a stroked ring.

export function FinancePie({
  segments,
  size = 150,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const active = segments.filter((s) => s.value > 0);
  const total  = active.reduce((s, x) => s + x.value, 0);
  const cx = size / 2, cy = size / 2, R = size / 2 - 2;

  if (total <= 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "8px 0" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={R} fill="#f1f5f9" />
        </svg>
        <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>No activity in this range</p>
      </div>
    );
  }

  const wedges = active.map((seg, i) => {
    const startDeg = -90 + active.slice(0, i).reduce((s, x) => s + (x.value / total) * 360, 0);
    const deg      = (seg.value / total) * 360;
    const a0 = (startDeg * Math.PI) / 180;
    const a1 = ((startDeg + deg) * Math.PI) / 180;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const large = deg > 180 ? 1 : 0;
    const path = active.length === 1
      ? ""
      : `M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
    return { ...seg, path, pct: (seg.value / total) * 100 };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {active.length === 1 ? (
          <circle cx={cx} cy={cy} r={R} fill={active[0].color} />
        ) : (
          wedges.map((w, i) => (
            <path key={i} d={w.path} fill={w.color} stroke="white" strokeWidth="1.5" />
          ))
        )}
      </svg>
      <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: "7px" }}>
        {wedges.map((w) => (
          <div key={w.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: "3px", background: w.color, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {w.label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexShrink: 0 }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>{formatUSD(w.value)}</span>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8" }}>{w.pct.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
