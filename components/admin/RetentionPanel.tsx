"use client";

import { useEffect, useState, useTransition } from "react";
import { Repeat, TrendingDown, Sparkles, Loader2 } from "lucide-react";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import {
  getRetentionSeries,
  type RetentionBucket,
  type RetentionGranularity,
} from "@/lib/actions/admin-customers";

const RETAINED_COLOR = "#16a34a";
const CHURNED_COLOR  = "#f43f5e";

// ─── Rate donut (percentage in the centre) ───────────────────────────────────

function RateDonut({ retained, churned }: { retained: number; churned: number }) {
  const total = retained + churned;
  const size = 150, sw = 20;
  const cx = size / 2, cy = size / 2, R = size / 2 - sw / 2 - 1;
  const rate = total > 0 ? (retained / total) * 100 : 0;

  const segs =
    total > 0
      ? [
          { value: retained, color: RETAINED_COLOR },
          { value: churned,  color: CHURNED_COLOR },
        ].filter((s) => s.value > 0)
      : [];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      {segs.length === 1 ? (
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={segs[0].color} strokeWidth={sw} />
      ) : (
        segs.map((seg, i) => {
          const startDeg = -90 + segs.slice(0, i).reduce((s, x) => s + (x.value / total) * 360, 0);
          const deg = (seg.value / total) * 360;
          const a0 = (startDeg * Math.PI) / 180;
          const a1 = ((startDeg + deg) * Math.PI) / 180;
          const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
          const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
          return (
            <path
              key={i}
              d={`M ${x0} ${y0} A ${R} ${R} 0 ${deg > 180 ? 1 : 0} 1 ${x1} ${y1}`}
              fill="none"
              stroke={seg.color}
              strokeWidth={sw}
              strokeLinecap="butt"
            />
          );
        })
      )}
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize="26" fontWeight="800" fill="#0f172a">
        {total > 0 ? `${Math.round(rate)}%` : "—"}
      </text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize="10" fontWeight="700" fill="#94a3b8">
        retained
      </text>
    </svg>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

const GRAIN_OPTIONS = [
  { value: "week"    as const, label: "Weekly"   },
  { value: "month"   as const, label: "1 Month"  },
  { value: "quarter" as const, label: "3 Months" },
];

export function RetentionPanel({ initialData }: { initialData: RetentionBucket[] }) {
  const [granularity, setGranularity] = useState<RetentionGranularity>("month");
  const [data, setData] = useState<RetentionBucket[]>(initialData);
  const [selected, setSelected] = useState<number>(latestUsable(initialData));
  const [isPending, start] = useTransition();

  // initialData is the monthly series — only refetch when leaving "month".
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!mounted) { setMounted(true); return; }
    start(async () => {
      const series = granularity === "month" ? initialData : await getRetentionSeries(granularity);
      setData(series);
      setSelected(latestUsable(series));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granularity]);

  const m = data[selected] ?? data[data.length - 1];
  const unit = granularity === "week" ? "week" : granularity === "quarter" ? "3-month period" : "month";

  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 34, height: 34, borderRadius: "9px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Repeat size={16} style={{ color: RETAINED_COLOR }} />
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>Customer Retention</p>
            <p style={{ fontSize: "10px", color: "#94a3b8" }}>
              {m.prevFull} → {m.periodFull}{m.partial ? " · in progress" : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isPending && <Loader2 size={13} className="animate-spin" style={{ color: "#94a3b8" }} />}
          <SegmentedControl options={GRAIN_OPTIONS} value={granularity} onChange={setGranularity} />
        </div>
      </div>

      {/* Body: donut + rate cards */}
      <div style={{ padding: "20px 18px", display: "flex", gap: "22px", alignItems: "center", flexWrap: "wrap", opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s" }}>
        {m.base === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "10px 0", width: "100%" }}>
            <RateDonut retained={0} churned={0} />
            <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600, textAlign: "center" }}>
              No customers ordered in the prior {unit} — nothing to retain yet.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <RateDonut retained={m.retained} churned={m.churned} />
              <div style={{ display: "flex", gap: "14px" }}>
                <Legend color={RETAINED_COLOR} label="Retained" />
                <Legend color={CHURNED_COLOR} label="Churned" />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: "12px" }}>
              <RateCard
                icon={<Repeat size={14} style={{ color: RETAINED_COLOR }} />}
                title="Retention Rate"
                value={`${m.retentionRate.toFixed(1)}%`}
                color={RETAINED_COLOR}
                bg="#f0fdf4"
                border="#bbf7d0"
                detail={`${m.retained} of ${m.base} customers from ${m.prevFull} ordered again in ${m.periodFull}.`}
              />
              <RateCard
                icon={<TrendingDown size={14} style={{ color: CHURNED_COLOR }} />}
                title="Churn Rate"
                value={`${m.churnRate.toFixed(1)}%`}
                color={CHURNED_COLOR}
                bg="#fff1f2"
                border="#fecdd3"
                detail={`${m.churned} customer${m.churned !== 1 ? "s" : ""} didn't come back.`}
              />
              {m.partial && (
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <Sparkles size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  <p style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                    This {unit} isn&apos;t over — retention climbs as customers return.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Trend — click a period to inspect it */}
      <div style={{ padding: "6px 18px 16px", marginTop: "auto" }}>
        <p style={{ fontSize: "9px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
          Retention rate by {unit}
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 70 }}>
          {data.map((d, i) => {
            const active = i === selected;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                title={`${d.periodFull}: ${d.base > 0 ? `${d.retentionRate.toFixed(0)}% retained (${d.retained}/${d.base})` : "no cohort"}`}
                style={{
                  flex: 1, height: "100%", display: "flex", flexDirection: "column",
                  justifyContent: "flex-end", alignItems: "center", gap: "3px",
                  background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 0,
                }}
              >
                <span style={{ fontSize: "8.5px", fontWeight: 800, color: active ? RETAINED_COLOR : "#cbd5e1" }}>
                  {d.base > 0 ? Math.round(d.retentionRate) : ""}
                </span>
                <div
                  style={{
                    width: "100%", maxWidth: 24, borderRadius: "3px 3px 0 0",
                    height: `${Math.max(d.retentionRate, d.base > 0 ? 4 : 0)}%`,
                    minHeight: d.base > 0 ? 3 : 0,
                    background: active ? RETAINED_COLOR : d.base > 0 ? "#dcfce7" : "#f1f5f9",
                    outline: active ? `2px solid ${RETAINED_COLOR}` : "none",
                    outlineOffset: 1,
                  }}
                />
                <span style={{ fontSize: "8px", fontWeight: 600, color: active ? "#0f172a" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Index of the most recent bucket that has a usable cohort (base > 0). */
function latestUsable(data: RetentionBucket[]): number {
  for (let i = data.length - 1; i >= 0; i--) if (data[i].base > 0) return i;
  return data.length - 1;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ width: 9, height: 9, borderRadius: "3px", background: color }} />
      <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>{label}</span>
    </div>
  );
}

function RateCard({
  icon, title, value, color, bg, border, detail,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
  bg: string;
  border: string;
  detail: string;
}) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: "10px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {icon}
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</span>
        </div>
        <span style={{ fontSize: "22px", fontWeight: 800, color, fontFamily: "Sora, sans-serif", lineHeight: 1 }}>{value}</span>
      </div>
      <p style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", lineHeight: 1.4 }}>{detail}</p>
    </div>
  );
}
