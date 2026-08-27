"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, Sparkles, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import {
  getNewCustomerSeries,
  type NewCustomerBucket,
  type NewCustomerGranularity,
  type MonthlyCustomerCount,
} from "@/lib/actions/admin-customers";

// Kept in sync with the caps enforced server-side in getNewCustomerSeries.
const NEW_CUSTOMER_MAX_DAYS = 31;

// ─── Helpers (shared visual language with the dashboard bar charts) ───────────

/** Sequential green ramp — oldest bucket lightest, newest bucket full brand green. */
function lerpColor(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Round a max value up to a clean axis tick (5, 10, 20, 25, 50, 100…). */
function niceCeil(n: number): number {
  if (n <= 5) return 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const residual = n / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  /** Server-rendered "last 12 months" data — used for the initial paint. */
  initialData: MonthlyCustomerCount[];
  thisMonthCount: number;
}

export function NewCustomersPanel({ initialData, thisMonthCount }: Props) {
  const [granularity, setGranularity] = useState<NewCustomerGranularity>("month");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [data, setData] = useState<NewCustomerBucket[]>(
    initialData.map((d) => ({ label: d.month, fullLabel: d.monthFull, count: d.count })),
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const [isPending, start] = useTransition();

  // Default windows when the user hasn't picked an explicit range.
  const defaultRange = (g: NewCustomerGranularity): { from: string; to: string } => {
    const to = new Date();
    const from = new Date();
    if (g === "day") from.setDate(from.getDate() - (NEW_CUSTOMER_MAX_DAYS - 1));
    else from.setMonth(from.getMonth() - 11);
    return { from: toLocalISO(from), to: toLocalISO(to) };
  };

  const fetchSeries = (g: NewCustomerGranularity, r: DateRange | undefined) => {
    const win =
      r?.from && r?.to
        ? { from: toLocalISO(r.from), to: toLocalISO(r.to) }
        : defaultRange(g);
    start(async () => {
      const series = await getNewCustomerSeries(win.from, win.to, g);
      setData(series);
    });
  };

  // Skip the very first render — initialData already covers month/12mo.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }
    fetchSeries(granularity, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granularity, range]);

  const rawMax = Math.max(...data.map((d) => d.count), 0);
  const axisMax = niceCeil(rawMax);
  const chartH = 160;
  const ticks = [0, axisMax / 2, axisMax];
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 34, height: 34, borderRadius: "9px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserPlus size={16} style={{ color: "#16a34a" }} />
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", fontFamily: "Sora, sans-serif" }}>New Customers</p>
            <p style={{ fontSize: "10px", color: "#94a3b8" }}>
              {range?.from && range?.to ? "Custom range" : granularity === "day" ? `Last ${NEW_CUSTOMER_MAX_DAYS} days` : "Last 12 months"}
              {" · "}{total} total
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {isPending && <Loader2 size={13} className="animate-spin" style={{ color: "#94a3b8" }} />}
          <SegmentedControl
            options={[{ value: "day" as const, label: "Day" }, { value: "month" as const, label: "Month" }]}
            value={granularity}
            onChange={(g) => {
              // A range picked for one granularity rarely fits the other's cap.
              setRange(undefined);
              setGranularity(g);
            }}
          />
          <DateRangePicker
            value={range}
            onChange={setRange}
            maxDays={granularity === "day" ? NEW_CUSTOMER_MAX_DAYS : 366}
            align="right"
            size="sm"
          />
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a", fontFamily: "Sora, sans-serif", lineHeight: 1 }}>{thisMonthCount}</p>
            <p style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>this month</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "20px 18px 8px", display: "flex", gap: "10px", opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: chartH, paddingBottom: "2px" }}>
          {[...ticks].reverse().map((t) => (
            <span key={t} style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{Math.round(t)}</span>
          ))}
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          <div style={{ position: "absolute", inset: 0, height: chartH }}>
            {ticks.map((t) => (
              <div key={t} style={{ position: "absolute", left: 0, right: 0, bottom: `${(t / axisMax) * 100}%`, borderTop: "1px solid #eef2f6" }} />
            ))}
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: data.length > 20 ? "2px" : "4px", height: chartH }}>
            {data.map((d, i) => {
              const isLast = i === data.length - 1;
              const t = data.length > 1 ? i / (data.length - 1) : 1;
              const barColor = isLast ? "#16a34a" : lerpColor("#dcfce7", "#16a34a", t);
              const pctH = axisMax > 0 ? (d.count / axisMax) * 100 : 0;
              const isHovered = hovered === i;
              return (
                <div key={i}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", position: "relative", cursor: "default" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {isHovered && (
                    <div style={{ position: "absolute", bottom: `calc(${Math.max(pctH, 3)}% + 10px)`, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "white", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", zIndex: 5, boxShadow: "0 4px 14px rgba(0,0,0,0.25)", pointerEvents: "none" }}>
                      {d.fullLabel}: {d.count} new
                      <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #0f172a" }} />
                    </div>
                  )}
                  {data.length <= 20 && (
                    <span style={{ fontSize: "10px", fontWeight: 800, color: isLast ? "#16a34a" : "#64748b", marginBottom: "4px" }}>{d.count}</span>
                  )}
                  <div style={{ width: "100%", maxWidth: 22, height: `${Math.max(pctH, d.count > 0 ? 3 : 0)}%`, minHeight: d.count > 0 ? "4px" : 0, borderRadius: "4px 4px 0 0", background: barColor, outline: isHovered ? "2px solid #0f172a" : "none", outlineOffset: "1px", boxShadow: isLast ? "0 2px 8px rgba(22,163,74,0.3)" : "none", transition: "outline 0.1s" }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bucket labels */}
      <div style={{ padding: "0 18px 14px", display: "flex", gap: "10px" }}>
        <div style={{ width: 20, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", gap: data.length > 20 ? "2px" : "4px" }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", overflow: "hidden" }}>
              {(data.length <= 16 || i % Math.ceil(data.length / 12) === 0) && (
                <span style={{ fontSize: "9px", fontWeight: 600, color: i === data.length - 1 ? "#16a34a" : "#94a3b8", whiteSpace: "nowrap" }}>{d.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {thisMonthCount > 0 && (
        <div style={{ padding: "0 18px 14px" }}>
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={12} style={{ color: "#16a34a" }} />
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#14532d" }}>{thisMonthCount} new customer{thisMonthCount !== 1 ? "s" : ""} joined this month!</p>
          </div>
        </div>
      )}
    </div>
  );
}
