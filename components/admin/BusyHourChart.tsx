// components/admin/BusyHourChart.tsx
"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import type { BusyHourPoint } from "@/lib/actions/dashboard-stats";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_HOUR = 8;  // 8 AM — matches store hours computed in dashboard-stats.ts
const MAX_HOUR = 20; // 8 PM

function formatHour(h: number): string {
  const period = h < 12 || h === 24 ? "AM" : "PM";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12} ${period}`;
}

const HOUR_OPTIONS = Array.from({ length: MAX_HOUR - MIN_HOUR + 1 }, (_, i) => MIN_HOUR + i);

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  data:    BusyHourPoint[]; // one entry per hour, MIN_HOUR..MAX_HOUR
  color?:  string;
  height?: number;
}

export function BusyHourChart({ data, color = "#7c3aed", height = 140 }: Props) {
  const [fromHour, setFromHour] = useState(MIN_HOUR);
  const [toHour,   setToHour]   = useState(MAX_HOUR);

  const visible = useMemo(
    () => data.filter((d) => d.hour >= fromHour && d.hour <= toHour),
    [data, fromHour, toHour],
  );

  const max = Math.max(...visible.map((d) => d.avgOrders), 1);
  const busiest = data.reduce((a, b) => (b.avgOrders > a.avgOrders ? b : a), data[0]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Range controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>From</span>
        <select
          value={fromHour}
          onChange={(e) => {
            const v = Number(e.target.value);
            setFromHour(v);
            if (v > toHour) setToHour(v);
          }}
          style={{
            fontSize: "12px", fontWeight: 700, color: "#1e293b",
            padding: "5px 8px", borderRadius: "6px", border: "1.5px solid #e2e8f0",
            background: "#f8fafc", outline: "none",
          }}
        >
          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
        </select>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>To</span>
        <select
          value={toHour}
          onChange={(e) => {
            const v = Number(e.target.value);
            setToHour(v);
            if (v < fromHour) setFromHour(v);
          }}
          style={{
            fontSize: "12px", fontWeight: 700, color: "#1e293b",
            padding: "5px 8px", borderRadius: "6px", border: "1.5px solid #e2e8f0",
            background: "#f8fafc", outline: "none",
          }}
        >
          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
        </select>

        {busiest && busiest.avgOrders > 0 && (
          <span style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "5px",
            fontSize: "11px", fontWeight: 700, color: "#7c3aed",
            background: "#f5f3ff", border: "1px solid #ddd6fe",
            padding: "4px 9px", borderRadius: "999px",
          }}>
            <Clock size={11} /> Busiest: {formatHour(busiest.hour)}
          </span>
        )}
      </div>

      {/* Bars */}
      {visible.length === 0 ? (
        <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
          No hours in this range.
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height }}>
          {visible.map((d) => {
            const pct = (d.avgOrders / max) * 100;
            const isBusiest = d.hour === busiest?.hour;
            return (
              <div key={d.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div
                    title={`${formatHour(d.hour)}: ${d.avgOrders} avg orders/day (${d.totalOrders} total)`}
                    style={{
                      width: "100%", minHeight: "3px",
                      height: `${Math.max(pct, 3)}%`,
                      borderRadius: "4px 4px 0 0",
                      background: isBusiest ? color : `${color}55`,
                      boxShadow: isBusiest ? `0 2px 8px ${color}44` : "none",
                      cursor: "default",
                    }}
                  />
                </div>
                <span style={{ fontSize: "9px", fontWeight: 600, color: isBusiest ? "#475569" : "#94a3b8", whiteSpace: "nowrap" }}>
                  {formatHour(d.hour).replace(" ", "")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
