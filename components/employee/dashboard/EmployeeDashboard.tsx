// components/employee/dashboard/EmployeeDashboard.tsx
// The employee home screen on the counter tablet: a greeting that follows the
// time of day, today's numbers, where every order is in the shop, a daily
// mission with unlockable badges and a friendly team scoreboard.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Banknote, ChevronRight, CloudSun, Crown, Hourglass, Moon,
  PackageCheck, Search, ShoppingBag, Sun, TrendingDown, TrendingUp, Users, HandCoins,
} from "lucide-react";
import { formatUSD } from "@/lib/utils/order-form";
import { bizDayStart, formatBiz, hourBiz, isoDayBiz } from "@/lib/utils/business-time";
import { AutoRefresh } from "@/components/employee/AutoRefresh";
import { CustomerAvatar } from "@/components/employee/order-ui";
import { MissionCard } from "./MissionCard";
import { OrderQueue } from "./OrderQueue";
import type { EmployeeDashboardData } from "@/lib/actions/orders";
import type { WaTemplateData } from "@/lib/actions/wa-templates";

interface Props {
  data:         EmployeeDashboardData;
  staffName:    string | null;
  /** Server render time (ISO) — every time-based label derives from it. */
  now:          string;
  templateData: WaTemplateData | null;
}

const MOTTOS = [
  "Let's make today fresh and clean ✨",
  "Every load counts — you've got this 💪",
  "Bubbles up! Another great day at Akiro 🫧",
  "Clean clothes, happy customers 😊",
  "Fold it, press it, impress it 👔",
  "Spin cycle on, good vibes on 🌀",
  "Smells like a fresh start 🌸",
];

function timeOfDay(hour: number) {
  if (hour < 12) return { key: "morning",   greeting: "Good morning",   Icon: Sun      } as const;
  if (hour < 17) return { key: "afternoon", greeting: "Good afternoon", Icon: CloudSun } as const;
  return               { key: "evening",   greeting: "Good evening",   Icon: Moon     } as const;
}

export function EmployeeDashboard({ data, staffName, now, templateData }: Props) {
  const nowDate   = new Date(now);
  const tod       = timeOfDay(hourBiz(nowDate));
  const dayKey    = isoDayBiz(nowDate);
  const firstName = staffName?.trim().split(/\s+/)[0] || null;
  const motto     = MOTTOS[Math.floor(bizDayStart(dayKey).getTime() / 86_400_000) % MOTTOS.length];

  return (
    <div className="grid gap-4 md:gap-5 lg:grid-cols-12">
      <AutoRefresh seconds={60} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className={`akiro-hero akiro-hero--${tod.key} relative overflow-hidden rounded-[28px] p-5 md:p-7 text-white lg:col-span-7 xl:col-span-8`}>
        <HeroBubbles />
        <div className="relative z-10">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">
            <tod.Icon size={14} strokeWidth={2.5} />
            {formatBiz(nowDate, { weekday: "long", month: "long", day: "numeric" })}
            <span className="text-white/40">•</span>
            <LiveClock initial={formatBiz(nowDate, { hour: "numeric", minute: "2-digit" })} />
          </p>
          <h1 className="mt-2 font-display text-[26px] md:text-[34px] font-extrabold leading-[1.1] tracking-tight">
            {tod.greeting}{firstName ? ", " : ""}
            <span className="whitespace-nowrap">
              {firstName ?? ""}! <span className="akiro-wave inline-block">👋</span>
            </span>
          </h1>
          <p className="mt-1.5 text-sm md:text-[15px] font-semibold text-white/80">{motto}</p>

          <div className="mt-5 md:mt-6 grid grid-cols-3 gap-2.5 md:gap-3">
            <HeroStat
              href="/employee/orders?range=today"
              icon={ShoppingBag}
              label="Orders"
              value={String(data.today.orders)}
              delta={data.today.orders - data.today.ordersYesterdaySoFar}
              formatDelta={(n) => String(n)}
            />
            <HeroStat
              href="/employee/cash-register"
              icon={Banknote}
              label="Collected"
              value={formatUSD(data.today.collected)}
              delta={Math.round((data.today.collected - data.today.collectedYesterdaySoFar) * 100) / 100}
              formatDelta={formatUSD}
            />
            <HeroStat
              href="/employee/orders?sort=payment&dir=asc"
              icon={HandCoins}
              label="To collect"
              value={formatUSD(data.toCollect.amount)}
              note={`from ${data.toCollect.orders} order${data.toCollect.orders === 1 ? "" : "s"}`}
            />
          </div>
        </div>
      </section>

      {/* ── New order + find ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1 xl:col-span-4">
        <Link
          href="/employee/orders/new"
          className="akiro-cta-tile group relative flex min-h-[124px] items-center gap-4 overflow-hidden rounded-[28px] p-5 md:p-6"
        >
          <div className="relative z-10 min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-900/60">Customer at the counter?</p>
            <p className="mt-1 font-display text-[26px] font-extrabold leading-tight text-amber-950">New order</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-bold text-amber-900/75">
              Start a drop-off
              <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" />
            </p>
          </div>
          <WashingMachine className="relative z-10 w-20 h-20 md:w-24 md:h-24 shrink-0 text-amber-900 drop-shadow-sm" />
        </Link>
        <FindOrder />
      </div>

      {/* ── Flow + queue ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4 md:gap-5 lg:col-span-7 xl:col-span-8">
        <FlowBoard flow={data.flow} />
        <OrderQueue
          ready={data.readyForPickup}
          readyTotal={data.flow.done}
          latest={data.latest}
          now={now}
          templateData={templateData}
        />
      </div>

      {/* ── Mission + team ───────────────────────────────────────────── */}
      <div className="grid content-start gap-4 md:gap-5 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1 xl:col-span-4">
        <MissionCard
          dayKey={dayKey}
          stats={{
            orders:    data.today.orders,
            collected: data.today.collected,
            target:    data.goal.target,
            record:    data.goal.record,
          }}
        />
        <TeamCard team={data.team} />
      </div>
    </div>
  );
}

// ─── Hero pieces ─────────────────────────────────────────────────────────────

function LiveClock({ initial }: { initial: string }) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    const timer = window.setInterval(
      () => setTime(formatBiz(new Date(), { hour: "numeric", minute: "2-digit" })),
      10_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  return <span suppressHydrationWarning>{time}</span>;
}

const BUBBLES = [
  { left: "6%",  size: 18, duration: 9,  delay: 0   },
  { left: "18%", size: 10, duration: 7,  delay: 2.5 },
  { left: "34%", size: 24, duration: 11, delay: 1   },
  { left: "52%", size: 12, duration: 8,  delay: 4   },
  { left: "66%", size: 30, duration: 12, delay: 0.5 },
  { left: "80%", size: 14, duration: 7.5, delay: 3  },
  { left: "92%", size: 20, duration: 10, delay: 5.5 },
];

function HeroBubbles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="akiro-bubble"
          style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}
        />
      ))}
    </div>
  );
}

function HeroStat({
  href, icon: Icon, label, value, delta, formatDelta, note,
}: {
  href:  string;
  icon:  React.ElementType;
  label: string;
  value: string;
  /** Change vs. yesterday at this time; omit to show `note` instead. */
  delta?:       number;
  formatDelta?: (n: number) => string;
  note?:        string;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-2xl bg-white/12 p-2.5 sm:p-3 md:p-4 ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/18"
    >
      <p className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] md:text-[11px] font-bold uppercase tracking-wider text-white/70">
        <Icon size={13} strokeWidth={2.5} className="hidden shrink-0 sm:block" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 truncate font-display text-[17px] sm:text-xl md:text-[26px] lg:text-[22px] xl:text-[26px] font-extrabold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <div className="mt-2 min-h-[20px] text-[11px] font-semibold text-white/65">
        {delta === undefined ? (
          <span className="line-clamp-1">{note}</span>
        ) : delta === 0 ? (
          <span className="line-clamp-1">Same as yesterday</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-extrabold ${
              delta > 0 ? "bg-emerald-300/25 text-emerald-50" : "bg-black/15 text-white/80"
            }`}>
              {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {delta > 0 ? "+" : "−"}{formatDelta ? formatDelta(Math.abs(delta)) : Math.abs(delta)}
            </span>
            {/* Spelled out wherever the hero is wide enough */}
            <span className="hidden truncate md:inline lg:hidden xl:inline">vs. yesterday</span>
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Quick find ──────────────────────────────────────────────────────────────

function FindOrder() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/employee/orders?search=${encodeURIComponent(term)}` : "/employee/orders");
      }}
      className="flex flex-col justify-center rounded-[28px] bg-white p-4 md:p-5 ring-1 ring-slate-200/80 shadow-sm"
    >
      <label htmlFor="dashboard-find" className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        Customer picking up?
      </label>
      <div className="mt-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="dashboard-find"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, phone or order #"
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl bg-slate-50 pl-11 pr-3 text-[15px] font-semibold text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand/40"
          />
        </div>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-2xl bg-slate-900 px-4 text-sm font-extrabold text-white transition active:scale-95"
        >
          Find
        </button>
      </div>
    </form>
  );
}

// ─── Laundry flow ────────────────────────────────────────────────────────────

const FLOW_TONES = {
  amber:   { tile: "bg-amber-50/70 ring-amber-100 hover:ring-amber-200",       chip: "bg-amber-100 text-amber-600"     },
  sky:     { tile: "bg-sky-50/70 ring-sky-100 hover:ring-sky-200",             chip: "bg-sky-100 text-sky-600"         },
  emerald: { tile: "bg-emerald-50/70 ring-emerald-100 hover:ring-emerald-200", chip: "bg-emerald-100 text-emerald-600" },
  slate:   { tile: "bg-slate-50 ring-slate-200/70 hover:ring-slate-300",       chip: "bg-slate-200/70 text-slate-500"  },
} as const;

function FlowBoard({ flow }: { flow: EmployeeDashboardData["flow"] }) {
  const inShop = flow.pending + flow.processing + flow.done;
  const tiles = [
    { href: "/employee/orders?status=pending",                   count: flow.pending,       label: "Pending",    hint: "Waiting to wash",  tone: "amber",
      icon: <Hourglass size={20} strokeWidth={2.4} /> },
    { href: "/employee/orders?status=processing",                count: flow.processing,    label: "Processing", hint: "In the machines",  tone: "sky",
      icon: <WashingMachine spinning={flow.processing > 0} className="w-7 h-7" /> },
    { href: "/employee/orders?status=done&sort=date&dir=asc",    count: flow.done,          label: "Done",       hint: "Ready for pickup", tone: "emerald",
      icon: <PackageCheck size={20} strokeWidth={2.4} /> },
    { href: "/employee/orders?status=picked_up",                 count: flow.pickedUpToday, label: "Picked up",  hint: "Went home today",  tone: "slate",
      icon: <ShoppingBag size={20} strokeWidth={2.4} /> },
  ] as const;

  return (
    <section className="rounded-[28px] bg-white p-4 md:p-5 ring-1 ring-slate-200/80 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base md:text-lg font-extrabold text-slate-900">Laundry flow</h2>
          <p className="text-xs font-semibold text-slate-400">
            {inShop} order{inShop === 1 ? "" : "s"} in the shop right now
          </p>
        </div>
        <Link
          href="/employee/orders?status=active"
          className="flex items-center gap-0.5 rounded-full px-3 py-2 text-xs font-bold text-brand hover:bg-brand-soft"
        >
          In shop <ChevronRight size={14} />
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {tiles.map((t, i) => (
          <Link
            key={t.label}
            href={t.href}
            className={`group relative rounded-2xl p-3.5 md:p-4 ring-1 transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${FLOW_TONES[t.tone].tile}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`flex w-11 h-11 items-center justify-center rounded-xl ${FLOW_TONES[t.tone].chip}`}>
                {t.icon}
              </span>
              <span className="font-display text-[30px] font-extrabold leading-none text-slate-900 tabular-nums">
                {t.count}
              </span>
            </div>
            <p className="mt-3 text-sm font-extrabold text-slate-800">{t.label}</p>
            <p className="text-[11px] font-semibold text-slate-500">{t.hint}</p>
            {i < tiles.length - 1 && (
              <span aria-hidden className="absolute -right-[18px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 md:flex">
                <ChevronRight size={14} strokeWidth={2.5} />
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Team scoreboard ─────────────────────────────────────────────────────────

function TeamCard({ team }: { team: EmployeeDashboardData["team"] }) {
  const best = Math.max(1, ...team.map((m) => m.orders));

  return (
    <section className="rounded-[28px] bg-white p-4 md:p-5 ring-1 ring-slate-200/80 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-base md:text-lg font-extrabold text-slate-900">Team today</h2>
        <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
          <Users size={18} />
        </span>
      </header>

      {team.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-500">
          No orders yet today — the first one takes the crown 👑
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {team.map((m, i) => (
            <li key={m.name} className="flex items-center gap-3">
              <div className="relative">
                <CustomerAvatar name={m.name} size={38} />
                {i === 0 && (
                  <Crown
                    size={16}
                    className="absolute -top-2.5 -right-1.5 rotate-12 fill-amber-300 text-amber-500"
                    aria-label="Most orders today"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{m.name}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-brand transition-[width] duration-700"
                    style={{ width: `${(m.orders / best) * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-14 text-right text-xs font-bold text-slate-500">
                <span className="font-display text-base font-extrabold text-slate-900 tabular-nums">{m.orders}</span>{" "}
                order{m.orders === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ─── Illustration ────────────────────────────────────────────────────────────

/** A little washing machine — the drum spins while `spinning` (reduced-motion safe). */
function WashingMachine({ spinning = true, className }: { spinning?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="8" y="5" width="48" height="55" rx="11" fill="#fff" stroke="currentColor" strokeWidth="3" />
      <path d="M8 19h48" stroke="currentColor" strokeWidth="3" />
      <circle cx="17" cy="12" r="2.6" fill="currentColor" />
      <circle cx="25" cy="12" r="2.6" fill="currentColor" opacity=".45" />
      <rect x="36" y="9.5" width="13" height="5" rx="2.5" fill="currentColor" opacity=".3" />
      <circle cx="32" cy="39" r="14.5" fill="#e0f2fe" stroke="currentColor" strokeWidth="3" />
      <g className={spinning ? "akiro-drum" : undefined}>
        <path d="M21.5 41c3.5-4.5 7-4.5 10.5 0s7 4.5 10.5 0" fill="none" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="27" cy="33.5" r="2.2" fill="#7dd3fc" />
        <circle cx="37.5" cy="35" r="1.6" fill="#7dd3fc" />
      </g>
    </svg>
  );
}
