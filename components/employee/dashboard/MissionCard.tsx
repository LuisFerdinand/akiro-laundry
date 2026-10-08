// components/employee/dashboard/MissionCard.tsx
// "Today's mission" — a goal ring (today's orders vs. the recent average day)
// and a shelf of badges that unlock through the day. A badge unlocking for the
// first time fires confetti once per device per day.
"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Lock, Target } from "lucide-react";
import { burstConfetti } from "./confetti";

export interface MissionStats {
  orders:    number;
  collected: number;
  /** Today's goal — the recent average day. */
  target:    number;
  /** Most orders ever taken in one day before today. */
  record:    number;
}

const BADGES: {
  id:    string;
  emoji: string;
  label: string;
  hint:  (s: MissionStats) => string;
  test:  (s: MissionStats) => boolean;
}[] = [
  { id: "first",   emoji: "🧺", label: "First load", hint: () => "Take the first order of the day",          test: (s) => s.orders >= 1 },
  { id: "roll",    emoji: "🔥", label: "On a roll",  hint: () => "Take 5 orders in one day",                 test: (s) => s.orders >= 5 },
  { id: "goal",    emoji: "🎯", label: "Goal hit",   hint: (s) => `Reach today's goal of ${s.target} orders`, test: (s) => s.orders >= s.target },
  { id: "cash100", emoji: "💰", label: "$100 day",   hint: () => "Collect $100 in one day",                  test: (s) => s.collected >= 100 },
  { id: "super",   emoji: "🚀", label: "Super day",  hint: () => "Take 12 orders in one day",                test: (s) => s.orders >= 12 },
  {
    id: "record", emoji: "🏆", label: "New record",
    hint: (s) => (s.record > 0 ? `Beat the record of ${s.record} orders in a day` : "Set the first record"),
    test: (s) => s.record > 0 && s.orders > s.record,
  },
];

// Celebrations are remembered per device per day, so the dashboard's
// auto-refresh never replays them. The in-memory set covers devices where
// localStorage is unavailable (private browsing).
const STORAGE_PREFIX = "akiro:celebrated:";
const celebratedThisSession = new Set<string>();

function claimFreshBadges(dayKey: string, unlocked: string[]): string[] {
  const storageKey = STORAGE_PREFIX + dayKey;
  let seen: string[] = [];
  try {
    seen = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key !== storageKey) window.localStorage.removeItem(key);
    }
  } catch { /* storage unavailable — fall back to this session's memory */ }

  const fresh = unlocked.filter((id) => !seen.includes(id) && !celebratedThisSession.has(`${dayKey}:${id}`));
  fresh.forEach((id) => celebratedThisSession.add(`${dayKey}:${id}`));
  if (fresh.length > 0) {
    try { window.localStorage.setItem(storageKey, JSON.stringify([...seen, ...fresh])); } catch { /* ignore */ }
  }
  return fresh;
}

function headline(s: MissionStats): { title: string; sub: string } {
  const remaining = s.target - s.orders;
  if (s.orders === 0)                 return { title: "Ready, set, wash!", sub: "The first order of the day unlocks a badge 🧺" };
  if (remaining > 0)                  return { title: `${remaining} more to go!`, sub: `Today's goal: ${s.target} orders — your recent average day.` };
  if (s.record > 0 && s.orders > s.record) return { title: "New record! 🏆", sub: "Best day ever — legendary work, team." };
  if (s.record > 0)                   return { title: "Goal smashed! 🎯", sub: `${s.record - s.orders + 1} more for a new record.` };
  return { title: "Goal smashed! 🎯", sub: "Keep the machines spinning." };
}

export function MissionCard({ stats, dayKey }: { stats: MissionStats; dayKey: string }) {
  const gradientId = useId();
  const [openBadge, setOpenBadge] = useState<string | null>(null);

  const badges      = BADGES.map((b) => ({ ...b, unlocked: b.test(stats) }));
  const unlockedKey = badges.filter((b) => b.unlocked).map((b) => b.id).join(",");

  useEffect(() => {
    if (!unlockedKey) return;
    const fresh = claimFreshBadges(dayKey, unlockedKey.split(","));
    if (fresh.length === 0) return;
    burstConfetti();
    const top = BADGES.filter((b) => fresh.includes(b.id)).at(-1)!;
    toast.success(
      fresh.length === 1
        ? `Badge unlocked: ${top.label} ${top.emoji}`
        : `${fresh.length} badges unlocked today ${top.emoji}`,
    );
  }, [dayKey, unlockedKey]);

  const reached = stats.orders >= stats.target;
  const pct     = Math.min(1, stats.orders / stats.target);
  const radius  = 46;
  const circ    = 2 * Math.PI * radius;
  const { title, sub } = headline(stats);
  const selected = badges.find((b) => b.id === openBadge);

  return (
    <section className="rounded-[28px] bg-white p-4 md:p-5 ring-1 ring-slate-200/80 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-base md:text-lg font-extrabold text-slate-900">Today&apos;s mission</h2>
        <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
          <Target size={18} />
        </span>
      </header>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative shrink-0 w-28 h-28">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor={reached ? "#fbbf24" : "#38bdf8"} />
                <stop offset="100%" stopColor={reached ? "#f97316" : "#3ecb9a"} />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef2f7" strokeWidth="11" />
            {pct > 0 && (
              <circle
                cx="60" cy="60" r={radius} fill="none"
                stroke={`url(#${gradientId})`} strokeWidth="11" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                className="akiro-ring"
                style={{ "--ring-c": circ } as React.CSSProperties}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[30px] font-extrabold leading-none text-slate-900 tabular-nums">
              {stats.orders}
            </span>
            <span className="mt-1 text-[11px] font-bold text-slate-400">
              {reached ? "goal hit 🎉" : `of ${stats.target} orders`}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold leading-tight text-slate-900">{title}</p>
          <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-500">{sub}</p>
          {stats.record > 0 && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
              🏆 Record: {stats.record} orders
            </p>
          )}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-3 gap-2">
        {badges.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setOpenBadge(openBadge === b.id ? null : b.id)}
              aria-pressed={openBadge === b.id}
              aria-label={`${b.label} — ${b.unlocked ? "unlocked" : "locked"}`}
              className={`flex w-full flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 ring-1 transition-transform active:scale-95 ${
                b.unlocked
                  ? "bg-gradient-to-b from-amber-50 to-white ring-amber-200 shadow-sm shadow-amber-200/50"
                  : "bg-slate-50 ring-slate-200/70"
              } ${openBadge === b.id ? "ring-2 ring-brand/50" : ""}`}
            >
              <span className={`relative text-[26px] leading-none ${b.unlocked ? "akiro-badge-pop" : "grayscale opacity-35"}`}>
                {b.emoji}
                {!b.unlocked && <Lock size={12} className="absolute -right-2 -bottom-0.5 text-slate-400" strokeWidth={2.5} />}
              </span>
              <span className={`text-[11px] font-extrabold leading-tight ${b.unlocked ? "text-slate-800" : "text-slate-400"}`}>
                {b.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 min-h-[18px] text-center text-xs font-semibold text-slate-500">
        {selected
          ? `${selected.emoji} ${selected.hint(stats)}${selected.unlocked ? " — unlocked!" : ""}`
          : `${badges.filter((b) => b.unlocked).length} of ${badges.length} badges today · tap one to see how`}
      </p>
    </section>
  );
}
