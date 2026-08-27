"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

export interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  /** Cap the span of the range — days further from the first pick are disabled. */
  maxDays?: number;
  /** Latest selectable day. Defaults to today. */
  maxDate?: Date;
  /** Earliest selectable day. */
  minDate?: Date;
  align?: "left" | "right";
  /** Compact trigger styling for tight toolbars. */
  size?: "sm" | "md";
}

const fmt = (d?: Date) => (d ? format(d, "MMM d, yyyy") : "");
const fmtShort = (d?: Date) => (d ? format(d, "MMM d") : "");

function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
/** Keep `d` inside [min, max] so the calendar opens on a sensible month. */
function clampToView(d: Date, min?: Date, max?: Date) {
  if (min && d < min) return min;
  if (max && d > max) return max;
  return d;
}

export function DateRangePicker({
  value,
  onChange,
  maxDays,
  maxDate = new Date(),
  minDate,
  align = "left",
  size = "md",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Quick-select presets (hidden when they'd exceed maxDays) ──
  const presets = useMemo(() => {
    const today = startOfDay(maxDate);
    const list: { label: string; range: DateRange; days: number }[] = [];
    const push = (label: string, from: Date, to: Date) => {
      const days = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 864e5) + 1;
      list.push({ label, range: { from: startOfDay(from), to: startOfDay(to) }, days });
    };
    push("Last 7 days", addDays(today, -6), today);
    push("Last 14 days", addDays(today, -13), today);
    push("Last 30 days", addDays(today, -29), today);
    const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
    push("This month", mStart, today);
    const lmStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lmEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    push("Last month", lmStart, lmEnd);
    push("Last 90 days", addDays(today, -89), today);
    push("Last 6 months", new Date(today.getFullYear(), today.getMonth() - 5, 1), today);
    push("Last 12 months", new Date(today.getFullYear(), today.getMonth() - 11, 1), today);
    return list.filter(
      (p) =>
        (!maxDays || p.days <= maxDays) &&
        (!minDate || startOfDay(p.range.from!).getTime() >= startOfDay(minDate).getTime()),
    );
  }, [maxDate, maxDays, minDate]);

  const activePreset = presets.find(
    (p) =>
      value?.from && value?.to &&
      startOfDay(p.range.from!).getTime() === startOfDay(value.from).getTime() &&
      startOfDay(p.range.to!).getTime() === startOfDay(value.to).getTime(),
  );

  // While a start is picked but no distinct end yet, constrain how far the end can land.
  const anchor =
    value?.from && (!value?.to || value.to.getTime() === value.from.getTime())
      ? value.from
      : undefined;
  const disabled = (date: Date) => {
    if (maxDate && date > maxDate) return true;
    if (minDate && date < minDate) return true;
    if (anchor && maxDays) {
      const diff = Math.abs(date.getTime() - anchor.getTime()) / 86_400_000;
      if (diff > maxDays - 1) return true;
    }
    return false;
  };

  const label =
    activePreset
      ? activePreset.label
      : value?.from && value?.to
        ? `${fmtShort(value.from)} – ${fmtShort(value.to)}`
        : value?.from
          ? `${fmt(value.from)} – …`
          : "Select period";

  const pad = size === "sm" ? "6px 10px" : "8px 12px";
  const fontSize = size === "sm" ? "11.5px" : "12.5px";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: pad,
          borderRadius: "9px",
          border: `1.5px solid ${open ? "#1a7fba" : value?.from ? "#b6def5" : "#e2e8f0"}`,
          background: value?.from ? "#f4faff" : "#f8fafc",
          color: value?.from ? "#0f172a" : "#64748b",
          fontSize,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: open ? "0 0 0 3.5px rgba(26,127,186,0.12)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        <CalendarDays size={14} style={{ color: "#1a7fba", flexShrink: 0 }} />
        {label}
        {value?.from && (
          <span
            role="button"
            aria-label="Clear date range"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setOpen(false);
            }}
            style={{ display: "inline-flex", marginLeft: "2px" }}
          >
            <X size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align]: 0,
            zIndex: 50,
            display: "flex",
            background: "white",
            border: "1.5px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 20px 50px rgba(15,23,42,0.18), 0 2px 8px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Preset column */}
          {presets.length > 0 && (
            <div
              style={{
                width: 148,
                borderRight: "1px solid #f1f5f9",
                padding: "10px 8px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                background: "#fbfdff",
              }}
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "4px 8px 6px",
                }}
              >
                Quick select
              </p>
              {presets.map((p) => {
                const active = activePreset?.label === p.label;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => onChange(p.range)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      padding: "7px 8px",
                      borderRadius: "7px",
                      border: "none",
                      background: active ? "#edf7fd" : "transparent",
                      color: active ? "#0f5a85" : "#475569",
                      fontSize: "12px",
                      fontWeight: active ? 800 : 600,
                      fontFamily: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f1f5f9"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    {p.label}
                    {active && <Check size={12} style={{ color: "#1a7fba", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Calendar + footer */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Calendar
              mode="range"
              numberOfMonths={1}
              defaultMonth={value?.to ?? value?.from ?? clampToView(new Date(), minDate, maxDate)}
              startMonth={minDate}
              endMonth={maxDate}
              selected={value}
              onSelect={(range) => onChange(range)}
              disabled={disabled}
            />
            <div
              style={{
                borderTop: "1px solid #f1f5f9",
                padding: "9px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, color: value?.from ? "#334155" : "#94a3b8" }}>
                {value?.from && value?.to
                  ? `${fmt(value.from)} → ${fmt(value.to)}`
                  : value?.from
                    ? "Now pick an end date"
                    : maxDays
                      ? `Pick a start date · up to ${maxDays} days`
                      : "Pick a start date"}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {value?.from && (
                  <button
                    type="button"
                    onClick={() => onChange(undefined)}
                    style={{
                      padding: "5px 11px", borderRadius: "7px", border: "1.5px solid #e2e8f0",
                      background: "white", color: "#64748b", fontSize: "11px", fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "5px 13px", borderRadius: "7px", border: "none",
                    background: value?.from && value?.to ? "#1a7fba" : "#64748b",
                    color: "white", fontSize: "11px", fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
