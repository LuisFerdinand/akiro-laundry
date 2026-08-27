"use client";

import { useState } from "react";
import { useMeasuredWidth } from "@/lib/hooks/use-measured-width";
import { formatUSD } from "@/lib/utils/order-form";
import type { TimeBucket } from "@/lib/actions/marketing";

const compactUSD = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`;

function niceMax(n: number) {
  if (n <= 1) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const r = n / mag;
  const nice = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10;
  return nice * mag;
}

// ─── Cumulative revenue vs spend (the ROAS story) ────────────────────────────

export function CumulativeChart({
  series, spend,
}: {
  series: { label: string; revenue: number }[];
  spend: number;
}) {
  const [wrapRef, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);

  const H = 220;
  const padT = 16, padB = 28, padL = 52, padR = 16;
  const innerW = Math.max(W - padL - padR, 10);
  const innerH = H - padT - padB;

  const cum = series.reduce<{ label: string; value: number }[]>((acc, d) => {
    const prev = acc.length ? acc[acc.length - 1].value : 0;
    acc.push({ label: d.label, value: prev + d.revenue });
    return acc;
  }, []);
  const total = cum.length ? cum[cum.length - 1].value : 0;
  const axisMax = niceMax(Math.max(total, spend, 1));

  const x = (i: number) => (cum.length > 1 ? padL + (i / (cum.length - 1)) * innerW : padL + innerW / 2);
  const y = (v: number) => padT + innerH - (v / axisMax) * innerH;

  const pts = cum.map((d, i) => ({ ...d, x: x(i), y: y(d.value) }));
  const line = pts.reduce((a, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${a} L ${p.x} ${p.y}`), "");
  const area = pts.length ? `${line} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z` : "";
  const spendY = y(spend);
  const breakeven = pts.find((p) => p.value >= spend);
  const ticks = [0, 0.5, 1].map((f) => f * axisMax);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg width={W} height={H} style={{ display: "block", maxWidth: "100%" }}
        onMouseMove={(e) => {
          if (!pts.length) return;
          const r = e.currentTarget.getBoundingClientRect();
          const rx = ((e.clientX - r.left) / r.width) * W;
          let n = 0, nd = Infinity;
          pts.forEach((p, i) => { const d = Math.abs(p.x - rx); if (d < nd) { nd = d; n = i; } });
          setHover(n);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#eef2f6" />
            <text x={padL - 10} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fontWeight="600" fill="#94a3b8">{compactUSD(t)}</text>
          </g>
        ))}

        {/* spend threshold */}
        {spend > 0 && (
          <>
            <line x1={padL} y1={spendY} x2={W - padR} y2={spendY} stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="5 4" />
            <text x={W - padR} y={spendY - 6} textAnchor="end" fontSize="10.5" fontWeight="800" fill="#d97706">
              spend {compactUSD(spend)}
            </text>
          </>
        )}

        {area && <path d={area} fill="url(#cumFill)" />}
        {line && <path d={line} fill="none" stroke="#16a34a" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />}

        {/* breakeven marker */}
        {breakeven && spend > 0 && (
          <g>
            <circle cx={breakeven.x} cy={breakeven.y} r="5" fill="#16a34a" stroke="white" strokeWidth="2" />
            <text x={breakeven.x} y={breakeven.y - 10} textAnchor="middle" fontSize="10" fontWeight="800" fill="#16a34a">
              breakeven
            </text>
          </g>
        )}

        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 4.5 : 2.5}
            fill={hover === i ? "#16a34a" : "white"} stroke="#16a34a" strokeWidth="2" />
        ))}
        {pts.map((p, i) => {
          if (pts.length > 8 && i % Math.ceil(pts.length / 6) !== 0 && i !== pts.length - 1) return null;
          const anchor = i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle";
          return <text key={i} x={p.x} y={H - 8} textAnchor={anchor as "start" | "middle" | "end"} fontSize="10" fontWeight="600" fill="#94a3b8">{p.label}</text>;
        })}
      </svg>
      {hover !== null && pts[hover] && (
        <div style={{
          position: "absolute", left: `${Math.min(Math.max(pts[hover].x, 60), W - 60)}px`, top: `${Math.max(pts[hover].y - 12, 2)}px`,
          transform: "translate(-50%, -100%)", background: "#0f172a", color: "white", borderRadius: "8px",
          padding: "6px 10px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none",
          boxShadow: "0 8px 20px rgba(15,23,42,0.28)",
        }}>
          {pts[hover].label} · {formatUSD(pts[hover].value)} cumulative
        </div>
      )}
    </div>
  );
}

// ─── Bars over time with an optional overlaid line ──────────────────────────

type NumKey = "revenue" | "orders" | "newCustomers";

export function TimeBars({
  data, barKey, barColor, lineKey, lineColor, barFormat = "number",
}: {
  data: TimeBucket[];
  barKey: NumKey;
  barColor: string;
  lineKey?: NumKey;
  lineColor?: string;
  barFormat?: "number" | "usd";
}) {
  const [wrapRef, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = 190;
  const padT = 14, padB = 26, padL = 40, padR = lineKey ? 34 : 14;
  const innerW = Math.max(W - padL - padR, 10);
  const innerH = H - padT - padB;

  const barVals = data.map((d) => Number(d[barKey]));
  const barMax = niceMax(Math.max(...barVals, 1));
  const lineVals = lineKey ? data.map((d) => Number(d[lineKey])) : [];
  const lineMax = lineKey ? niceMax(Math.max(...lineVals, 1)) : 1;

  const slot = innerW / Math.max(data.length, 1);
  const bw = Math.min(slot * 0.6, 40);
  const bx = (i: number) => padL + i * slot + (slot - bw) / 2;
  const by = (v: number) => padT + innerH - (v / barMax) * innerH;
  const ly = (v: number) => padT + innerH - (v / lineMax) * innerH;
  const lx = (i: number) => padL + i * slot + slot / 2;

  const linePath = lineKey
    ? data.reduce((a, d, i) => {
        const px = lx(i), py = ly(Number(d[lineKey]));
        return i === 0 ? `M ${px} ${py}` : `${a} L ${px} ${py}`;
      }, "")
    : "";

  const fmt = (v: number) => (barFormat === "usd" ? compactUSD(v) : `${Math.round(v)}`);
  const ticks = [0, 0.5, 1].map((f) => f * barMax);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg width={W} height={H} style={{ display: "block", maxWidth: "100%" }}
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={by(t)} x2={W - padR} y2={by(t)} stroke="#eef2f6" />
            <text x={padL - 8} y={by(t) + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#94a3b8">{fmt(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const v = Number(d[barKey]);
          const h = Math.max((v / barMax) * innerH, v > 0 ? 3 : 0);
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" />
              <rect x={bx(i)} y={padT + innerH - h} width={bw} height={h} rx="3"
                fill={barColor} opacity={hover === null || hover === i ? 1 : 0.55} />
              {(data.length <= 14 || i % Math.ceil(data.length / 8) === 0) && (
                <text x={lx(i)} y={H - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#94a3b8">{d.label}</text>
              )}
            </g>
          );
        })}
        {linePath && <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {lineKey && data.map((d, i) => (
          <circle key={i} cx={lx(i)} cy={ly(Number(d[lineKey]))} r="3" fill={lineColor} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      {hover !== null && data[hover] && (
        <div style={{
          position: "absolute", left: `${Math.min(Math.max(lx(hover), 60), W - 60)}px`, top: `${by(Number(data[hover][barKey])) - 10}px`,
          transform: "translate(-50%, -100%)", background: "#0f172a", color: "white", borderRadius: "8px",
          padding: "6px 10px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none",
          boxShadow: "0 8px 20px rgba(15,23,42,0.28)",
        }}>
          {data[hover].label}
          <br />
          {barFormat === "usd" ? formatUSD(Number(data[hover][barKey])) : `${data[hover][barKey]} ${barKey}`}
          {lineKey && <> · {data[hover][lineKey]} {lineKey}</>}
        </div>
      )}
    </div>
  );
}

// ─── Donut ──────────────────────────────────────────────────────────────────

export function Donut({
  segments, centerLabel, centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 52, cx = 64, cy = 64, sw = 18;
  const arcs = segments.map((seg, i) => {
    const startDeg = -90 + segments.slice(0, i).reduce((s, x) => s + (x.value / total) * 360, 0);
    const deg = (seg.value / total) * 360;
    const a0 = (startDeg * Math.PI) / 180;
    const a1 = ((startDeg + deg) * Math.PI) / 180;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const path = `M ${x0} ${y0} A ${R} ${R} 0 ${deg > 180 ? 1 : 0} 1 ${x1} ${y1}`;
    return { ...seg, path, pct: (seg.value / total) * 100 };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
      <svg width={128} height={128} viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        {arcs.map((a, i) => a.value > 0 && (
          <path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="butt" />
        ))}
        {centerValue && <text x={cx} y={cy - 2} textAnchor="middle" fontSize="17" fontWeight="800" fill="#0f172a">{centerValue}</text>}
        {centerLabel && <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">{centerLabel}</text>}
      </svg>
      <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: "7px" }}>
        {arcs.map((a) => (
          <div key={a.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: "3px", background: a.color, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", flexShrink: 0 }}>{a.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal ranked bars ────────────────────────────────────────────────

export function RankBars({
  rows,
}: {
  rows: { label: string; value: number; display: string; sub?: string; color: string }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
            <span style={{ fontSize: "12px", fontWeight: 800, color: r.color, flexShrink: 0, marginLeft: "8px" }}>{r.display}</span>
          </div>
          <div style={{ height: 9, background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max((r.value / max) * 100, 2)}%`, borderRadius: "999px", background: r.color }} />
          </div>
          {r.sub && <p style={{ fontSize: "9.5px", color: "#94a3b8", marginTop: "2px" }}>{r.sub}</p>}
        </div>
      ))}
    </div>
  );
}
