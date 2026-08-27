"use client";

import { useState, useTransition } from "react";
import {
  Megaphone, Plus, X, Loader2, Save, Trash2, Pencil, TrendingUp,
  Wallet, Users, ShoppingBag, Percent, Facebook, Music2, ImageIcon,
  Receipt, BookmarkPlus, Activity,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { formatUSD } from "@/lib/utils/order-form";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { CumulativeChart, TimeBars, Donut, RankBars } from "@/components/admin/marketing/charts";
import {
  getPeriodMetrics,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  type PeriodMetrics,
  type CampaignInput,
  type CampaignComparison,
} from "@/lib/actions/marketing";

const CAMPAIGN_CHANNELS = [
  { value: "facebook", label: "Facebook" },
  { value: "tiktok",   label: "TikTok" },
  { value: "banner",   label: "Banner / Brosur" },
  { value: "belun",    label: "Belun (word of mouth)" },
  { value: "other",    label: "Other" },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CampaignVM {
  id: number; name: string; channel: string; spend: number;
  startDate: string; endDate: string; notes: string | null;
}

interface Props {
  campaigns:         CampaignVM[];
  comparison:        CampaignComparison;
  initialMetrics:    PeriodMetrics;
  initialWindow:     { from: string; to: string };
  initialCampaignId: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  facebook: { label: "Facebook",        color: "#1877f2", Icon: Facebook },
  tiktok:   { label: "TikTok",          color: "#0f172a", Icon: Music2 },
  banner:   { label: "Banner / Brosur", color: "#d97706", Icon: ImageIcon },
  belun:    { label: "Belun",           color: "#16a34a", Icon: Users },
  other:    { label: "Other",           color: "#64748b", Icon: Megaphone },
};
const CAT_COLORS = ["#1a7fba", "#16a34a", "#7c3aed", "#d97706", "#e11d48", "#0891b2", "#65a30d"];

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function fromISO(s: string) { return new Date(`${s}T00:00:00`); }
function fmtRange(a: string, b: string) {
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${fromISO(a).toLocaleDateString("en-US", o)} – ${fromISO(b).toLocaleDateString("en-US", o)}`;
}
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function twoYearsOut() { const d = new Date(); d.setFullYear(d.getFullYear() + 2); return d; }

// ─── Card shell ──────────────────────────────────────────────────────────────

function Card({ title, sub, children, style }: {
  title?: string; sub?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", padding: "18px 20px", ...style }}>
      {title && (
        <div style={{ marginBottom: "14px" }}>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>{title}</p>
          {sub && <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>{sub}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, color, bg, border }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string; border: string;
}) {
  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0", padding: "15px 17px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "9px" }}>
      <div style={{ width: 34, height: 34, borderRadius: "10px", background: bg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "19px", color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</p>
        <p style={{ fontSize: "11.5px", fontWeight: 700, color: "#334155", marginTop: "4px" }}>{label}</p>
        {sub && <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>{sub}</p>}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "4px",
  padding: "5px 10px", borderRadius: "7px", border: "1.5px solid #e2e8f0",
  background: "white", color: "#475569", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};

function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.other;
  const { Icon } = meta;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "999px", background: `${meta.color}14`, border: `1px solid ${meta.color}33`, fontSize: "10px", fontWeight: 800, color: meta.color, whiteSpace: "nowrap" }}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

// ─── Campaign form modal ─────────────────────────────────────────────────────

function CampaignModal({
  initial, prefill, onClose, onSaved,
}: {
  initial: CampaignVM | null;
  prefill?: { range?: DateRange; spend?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]       = useState(initial?.name ?? "");
  const [channel, setChannel] = useState(initial?.channel ?? "facebook");
  const [spend, setSpend]     = useState(initial ? String(initial.spend) : prefill?.spend ?? "");
  const [range, setRange]     = useState<DateRange | undefined>(
    initial
      ? { from: fromISO(initial.startDate), to: fromISO(initial.endDate) }
      : prefill?.range,
  );
  const [notes, setNotes]     = useState(initial?.notes ?? "");
  const [error, setError]     = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  // A brand-new campaign is future-only; editing or saving an analysed period
  // (which is usually in the past) keeps dates unrestricted.
  const restrictPast = !initial && !prefill;

  const submit = () => {
    if (!range?.from || !range?.to) { setError("Pick the campaign date range."); return; }
    const payload: CampaignInput = {
      name, channel,
      spend: parseFloat(spend || "0"),
      startDate: toLocalISO(range.from),
      endDate: toLocalISO(range.to),
      notes,
    };
    setError(null);
    start(async () => {
      const res = initial ? await updateCampaign(initial.id, payload) : await createCampaign(payload);
      if (res.success) onSaved();
      else setError(res.error ?? "Failed to save.");
    });
  };

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    border: "1.5px solid #e2e8f0", borderRadius: "8px",
    fontSize: "14px", color: "#1e293b", outline: "none", background: "#f8fafc", fontFamily: "inherit",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: "16px", border: "1.5px solid #e2e8f0", boxShadow: "0 32px 80px rgba(0,0,0,0.18)", width: "100%", maxWidth: "460px" }}>
        <div style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "16px 16px 0 0" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{initial ? "Edit" : prefill ? "Save analysis as" : "New"} Campaign</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>{initial ? initial.name : "Track a marketing spend"}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: "7px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>
        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={lbl}>Campaign name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. August IG promo" style={inp} /></div>
          <div>
            <label style={lbl}>Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {CAMPAIGN_CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
            <div>
              <label style={lbl}>Spend (USD)</label>
              <input value={spend} onChange={(e) => setSpend(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0.00" style={inp} />
            </div>
            <div>
              <label style={lbl}>Period</label>
              <DateRangePicker
                value={range}
                onChange={setRange}
                minDate={restrictPast ? startOfToday() : undefined}
                maxDate={twoYearsOut()}
              />
            </div>
          </div>
          <div><label style={lbl}>Notes (optional)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Targeting, creative, learnings…" style={{ ...inp, resize: "vertical" }} /></div>
          {error && <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}><p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p></div>}
          <button onClick={submit} disabled={isPending} style={{ height: 46, borderRadius: "9px", border: "none", background: isPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", color: "white", fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: isPending ? "not-allowed" : "pointer" }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> {initial ? "Save changes" : "Create campaign"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function MarketingClient({ campaigns, comparison, initialMetrics, initialWindow, initialCampaignId }: Props) {
  const [mode, setMode] = useState<"campaign" | "adhoc">(initialCampaignId ? "campaign" : "adhoc");
  const [campaignId, setCampaignId] = useState<number | null>(initialCampaignId);
  const [adhocRange, setAdhocRange] = useState<DateRange | undefined>(
    initialCampaignId ? undefined : { from: fromISO(initialWindow.from), to: fromISO(initialWindow.to) },
  );
  const [adhocSpend, setAdhocSpend] = useState("");
  const [metrics, setMetrics] = useState<PeriodMetrics>(initialMetrics);
  const [win, setWin] = useState(initialWindow);
  const [isPending, start] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CampaignVM | null>(null);
  const [prefill, setPrefill] = useState<{ range?: DateRange; spend?: string } | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeCampaign = campaigns.find((c) => c.id === campaignId) ?? null;
  const spend = mode === "campaign" ? activeCampaign?.spend ?? 0 : parseFloat(adhocSpend || "0") || 0;

  const roas = spend > 0 ? metrics.revenue / spend : null;
  const cpc  = metrics.newCustomers > 0 && spend > 0 ? spend / metrics.newCustomers : null;
  const cpo  = metrics.orders > 0 && spend > 0 ? spend / metrics.orders : null;
  const profit = metrics.revenue - spend;

  const refresh = (from: string, to: string) => {
    setWin({ from, to });
    start(async () => setMetrics(await getPeriodMetrics(from, to)));
  };
  const selectCampaign = (id: number) => {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    setMode("campaign"); setCampaignId(id); refresh(c.startDate, c.endDate);
  };
  const applyAdhoc = (r: DateRange | undefined) => {
    setAdhocRange(r);
    if (r?.from && r?.to) { setMode("adhoc"); setCampaignId(null); refresh(toLocalISO(r.from), toLocalISO(r.to)); }
  };
  const reload = () => { setShowForm(false); setEditing(null); setPrefill(undefined); window.location.reload(); };

  const rangeLabel = mode === "campaign" && activeCampaign
    ? fmtRange(activeCampaign.startDate, activeCampaign.endDate)
    : `${metrics.from} – ${metrics.to}`;

  // Chart data
  const revByCat = metrics.revenueByCategory.slice(0, 7).map((c, i) => ({
    label: c.category, value: c.revenue, color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  const referralSegs = metrics.referralBreakdown.map((r, i) => ({
    label: r.source, value: r.count, color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  const campLeaderboard = comparison.campaigns.slice(0, 8).map((c) => ({
    label: c.name,
    value: c.roas ?? 0,
    display: c.roas === null ? "—" : `${c.roas.toFixed(2)}×`,
    sub: `${formatUSD(c.revenue)} rev · ${formatUSD(c.spend)} spend`,
    color: (c.roas ?? 0) >= 1 ? "#16a34a" : "#e11d48",
  }));
  const channelRoas = comparison.channels.map((c) => ({
    label: CHANNEL_META[c.channel]?.label ?? c.channel,
    value: c.roas ?? 0,
    display: c.roas === null ? "—" : `${c.roas.toFixed(2)}×`,
    sub: `${formatUSD(c.revenue)} from ${formatUSD(c.spend)} · ${c.newCustomers} new customers`,
    color: CHANNEL_META[c.channel]?.color ?? "#64748b",
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {showForm && (
        <CampaignModal
          initial={editing}
          prefill={prefill}
          onClose={() => { setShowForm(false); setEditing(null); setPrefill(undefined); }}
          onSaved={reload}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>Marketing &amp; ROAS</h1>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>Return on every marketing dollar — spend vs the customers, revenue and orders it drove</p>
        </div>
        <button onClick={() => { setEditing(null); setPrefill(undefined); setShowForm(true); }} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", borderRadius: "9px", border: "none", background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)", boxShadow: "0 4px 14px rgba(26,127,186,0.3)", color: "white", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* Controls */}
      <Card style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <SegmentedControl
            options={[{ value: "campaign" as const, label: "Campaign" }, { value: "adhoc" as const, label: "Ad-hoc analysis" }]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              if (m === "campaign" && campaigns[0]) selectCampaign(campaigns[0].id);
              if (m === "adhoc" && adhocRange?.from && adhocRange?.to) applyAdhoc(adhocRange);
            }}
          />

          {mode === "campaign" ? (
            campaigns.length === 0 ? (
              <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>No campaigns yet — create one, or use Ad-hoc analysis.</span>
            ) : (
              <select value={campaignId ?? ""} onChange={(e) => selectCampaign(Number(e.target.value))}
                style={{ appearance: "none", padding: "8px 32px 8px 12px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#1e293b", background: "#f8fafc", cursor: "pointer", outline: "none" }}>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )
          ) : (
            <>
              <DateRangePicker value={adhocRange} onChange={applyAdhoc} size="sm" />
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>Spend $</span>
                <input value={adhocSpend} onChange={(e) => setAdhocSpend(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0.00"
                  style={{ width: 88, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#1e293b", background: "#f8fafc", outline: "none" }} />
              </div>
              {adhocRange?.from && adhocRange?.to && (
                <button
                  onClick={() => { setPrefill({ range: adhocRange, spend: adhocSpend }); setEditing(null); setShowForm(true); }}
                  style={{ ...iconBtn, borderColor: "#b6def5", color: "#1a7fba", background: "#f4faff" }}
                >
                  <BookmarkPlus size={12} /> Save as campaign
                </button>
              )}
            </>
          )}

          {isPending && <Loader2 size={14} className="animate-spin" style={{ color: "#94a3b8" }} />}
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>{rangeLabel} · {metrics.days} day{metrics.days !== 1 ? "s" : ""}</span>
        </div>

        {mode === "campaign" && activeCampaign && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
            <ChannelBadge channel={activeCampaign.channel} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>{formatUSD(activeCampaign.spend)} spent</span>
            {activeCampaign.notes && <span style={{ fontSize: "12px", color: "#94a3b8" }}>· {activeCampaign.notes}</span>}
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              <button onClick={() => { setEditing(activeCampaign); setPrefill(undefined); setShowForm(true); }} style={iconBtn}><Pencil size={12} /> Edit</button>
              <button onClick={() => setConfirmDelete(true)} style={{ ...iconBtn, color: "#dc2626", borderColor: "#fecaca" }}><Trash2 size={12} /> Delete</button>
            </div>
          </div>
        )}

        {confirmDelete && activeCampaign && (
          <div style={{ marginTop: "10px", background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>Delete “{activeCampaign.name}”? Order &amp; customer data is untouched.</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              <button onClick={() => setConfirmDelete(false)} style={iconBtn}>Cancel</button>
              <button onClick={() => start(async () => { await deleteCampaign(activeCampaign.id); reload(); })} style={{ ...iconBtn, background: "#dc2626", color: "white", borderColor: "#dc2626" }}>Delete</button>
            </div>
          </div>
        )}
      </Card>

      {/* Hero ROAS + KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        <div style={{ background: "linear-gradient(135deg,#0c1e35,#0f3460)", borderRadius: "14px", color: "white", padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Percent size={15} style={{ color: "rgba(255,255,255,0.6)" }} />
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Return on Ad Spend</p>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "44px", lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {roas === null ? "—" : `${roas.toFixed(2)}×`}
            </p>
            {roas !== null && (
              <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 10px", borderRadius: "999px", background: profit >= 0 ? "rgba(62,203,154,0.18)" : "rgba(244,63,94,0.2)", color: profit >= 0 ? "#3ecb9a" : "#fda4af" }}>
                {profit >= 0 ? "+" : ""}{formatUSD(profit)} {profit >= 0 ? "profit" : "loss"}
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "8px" }}>
            {roas === null ? "Enter a spend amount to calculate ROAS"
              : roas >= 1 ? `Every $1 spent returned ${formatUSD(roas)} in revenue`
              : `Below breakeven — $1 spent returned ${formatUSD(roas)}`}
          </p>
          <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Revenue", val: metrics.revenue, color: "#3ecb9a" },
              { label: "Spend", val: spend, color: "#f59e0b" },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{row.label}</span><span>{formatUSD(row.val)}</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.12)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(row.val / Math.max(metrics.revenue, spend, 1)) * 100}%`, background: row.color, borderRadius: "999px", transition: "width 0.3s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          <Kpi label="Ad Spend"     value={formatUSD(spend)}                icon={Wallet}     color="#d97706" bg="linear-gradient(135deg,#fffbeb,#fef3c7)" border="#fcd34d" />
          <Kpi label="Revenue"      value={formatUSD(metrics.revenue)}       icon={TrendingUp} color="#16a34a" bg="linear-gradient(135deg,#f0fdf4,#dcfce7)" border="#86efac" />
          <Kpi label="New Customers" value={String(metrics.newCustomers)}    sub={cpc ? `${formatUSD(cpc)} each` : undefined} icon={Users}      color="#7c3aed" bg="linear-gradient(135deg,#f5f3ff,#ede9fe)" border="#c4b5fd" />
          <Kpi label="Orders"       value={String(metrics.orders)}           sub={cpo ? `${formatUSD(cpo)} each` : undefined} icon={ShoppingBag} color="#1a7fba" bg="linear-gradient(135deg,#edf7fd,#c8e9f8)" border="#b6def5" />
          <Kpi label="Avg Order"    value={formatUSD(metrics.avgOrderValue)} icon={Receipt}    color="#0891b2" bg="linear-gradient(135deg,#ecfeff,#cffafe)" border="#a5f3fc" />
          <Kpi label="Unpaid"       value={String(metrics.unpaidOrders)}     sub={metrics.unpaidValue > 0 ? `${formatUSD(metrics.unpaidValue)} owed` : "all paid"} icon={Activity} color="#e11d48" bg="linear-gradient(135deg,#fff1f2,#ffe4e6)" border="#fda4af" />
        </div>
      </div>

      {/* Cumulative revenue vs spend */}
      <Card title="Revenue vs Spend" sub="Cumulative revenue over the window against the flat marketing spend — where the line crosses is breakeven">
        {metrics.timeSeries.length ? <CumulativeChart series={metrics.timeSeries} spend={spend} />
          : <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No revenue in this window</p>}
      </Card>

      {/* Revenue trend + acquisition */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        <Card title="Revenue by period" sub="Paid revenue per bucket">
          {metrics.timeSeries.length ? <TimeBars data={metrics.timeSeries} barKey="revenue" barColor="#16a34a" barFormat="usd" />
            : <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No data</p>}
        </Card>
        <Card title="Acquisition pace" sub="New customers (bars) and orders (line) per bucket">
          {metrics.timeSeries.length ? <TimeBars data={metrics.timeSeries} barKey="newCustomers" barColor="#7c3aed" lineKey="orders" lineColor="#1a7fba" />
            : <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No data</p>}
        </Card>
      </div>

      {/* Category revenue + referral source */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        <Card title="Revenue by service" sub="Which services the campaign's orders spent on">
          {revByCat.length ? <Donut segments={revByCat} centerValue={formatUSD(metrics.revenueByCategory.reduce((s, c) => s + c.revenue, 0))} centerLabel="total" />
            : <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No orders in this window</p>}
        </Card>
        <Card title="New customers by source" sub="Where customers who joined in this window heard about Akiro">
          {referralSegs.length ? <Donut segments={referralSegs} centerValue={String(metrics.newCustomers)} centerLabel="new" />
            : <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No new customers</p>}
        </Card>
      </div>

      {/* Top services */}
      <Card title="Most popular services" sub="By number of order lines in this window">
        {metrics.topServices.length ? (
          <RankBars rows={metrics.topServices.map((s, i) => ({
            label: s.name,
            value: s.totalOrders,
            display: `${s.totalOrders}×`,
            sub: `${formatUSD(s.totalRevenue)} · ${s.category}`,
            color: CAT_COLORS[i % CAT_COLORS.length],
          }))} />
        ) : <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>No orders in this window</p>}
      </Card>

      {/* Cross-campaign comparison */}
      {comparison.campaigns.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: channelRoas.length >= 2 ? "repeat(auto-fit, minmax(320px, 1fr))" : "1fr", gap: "16px" }}>
          <Card title="Campaign ROAS leaderboard" sub="Every campaign ranked by return — green beats breakeven">
            <RankBars rows={campLeaderboard} />
          </Card>
          {channelRoas.length >= 2 && (
            <Card title="ROAS by channel" sub="Spend and return rolled up per channel">
              <RankBars rows={channelRoas} />
            </Card>
          )}
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length > 0 && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>All Campaigns</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Campaign", "Channel", "Period", "Spend", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} onClick={() => selectCampaign(c.id)} style={{ background: c.id === campaignId ? "#f0f9ff" : i % 2 === 0 ? "white" : "#fafafa", cursor: "pointer" }}>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{c.name}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}><ChannelBadge channel={c.channel} /></td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "11px", color: "#64748b" }}>{fmtRange(c.startDate, c.endDate)}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{formatUSD(c.spend)}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                      <button onClick={(e) => { e.stopPropagation(); setEditing(c); setPrefill(undefined); setShowForm(true); }} style={{ ...iconBtn, padding: "4px 8px" }}><Pencil size={11} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
