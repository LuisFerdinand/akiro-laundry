// lib/actions/marketing.ts
"use server";

import { db } from "@/lib/db";
import {
  marketingCampaigns,
  customers,
  orders,
  orderItems,
  servicePricing,
} from "@/lib/db/schema";
import type { MarketingCampaign } from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { startOfDayBiz, endOfDayBiz, formatBiz } from "@/lib/utils/business-time";
import { REFERRAL_SOURCES } from "@/lib/utils/order-form";

const DAY_MS = 86_400_000;
const parseISO = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

// ─── CRUD ────────────────────────────────────────────────────────────────────

export interface CampaignInput {
  name:      string;
  channel:   string;
  spend:     number;
  startDate: string; // ISO "YYYY-MM-DD"
  endDate:   string;
  notes?:    string;
}

function validate(data: CampaignInput): string | null {
  if (!data.name.trim()) return "Campaign name is required.";
  if (!Number.isFinite(data.spend) || data.spend < 0) return "Spend must be zero or more.";
  if (!data.startDate || !data.endDate) return "Start and end dates are required.";
  if (data.startDate > data.endDate) return "Start date must be on or before the end date.";
  return null;
}

export async function getCampaigns(): Promise<MarketingCampaign[]> {
  return db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.startDate));
}

export async function createCampaign(
  data: CampaignInput,
): Promise<{ success: boolean; id?: number; error?: string }> {
  const err = validate(data);
  if (err) return { success: false, error: err };
  try {
    const [c] = await db
      .insert(marketingCampaigns)
      .values({
        name:      data.name.trim(),
        channel:   data.channel,
        spend:     data.spend.toFixed(2),
        startDate: startOfDayBiz(parseISO(data.startDate)),
        endDate:   endOfDayBiz(parseISO(data.endDate)),
        notes:     data.notes?.trim() || null,
      })
      .returning({ id: marketingCampaigns.id });
    revalidatePath("/admin/marketing");
    return { success: true, id: c.id };
  } catch {
    return { success: false, error: "Failed to create campaign." };
  }
}

export async function updateCampaign(
  id: number,
  data: CampaignInput,
): Promise<{ success: boolean; error?: string }> {
  const err = validate(data);
  if (err) return { success: false, error: err };
  try {
    await db
      .update(marketingCampaigns)
      .set({
        name:      data.name.trim(),
        channel:   data.channel,
        spend:     data.spend.toFixed(2),
        startDate: startOfDayBiz(parseISO(data.startDate)),
        endDate:   endOfDayBiz(parseISO(data.endDate)),
        notes:     data.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(marketingCampaigns.id, id));
    revalidatePath("/admin/marketing");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update campaign." };
  }
}

export async function deleteCampaign(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    revalidatePath("/admin/marketing");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete campaign." };
  }
}

// ─── Period metrics (the "matrix") ───────────────────────────────────────────

export interface TimeBucket {
  label:        string;
  revenue:      number;
  orders:       number;
  newCustomers: number;
}

export interface PeriodMetrics {
  from:            string;
  to:              string;
  days:            number;
  newCustomers:    number;
  revenue:         number;
  orders:          number;
  avgOrderValue:   number;
  paidOrders:      number;
  unpaidOrders:    number;
  unpaidValue:     number;
  timeSeries:      TimeBucket[];
  topServices: {
    id: number; name: string; category: string; totalOrders: number; totalRevenue: number;
  }[];
  revenueByCategory: { category: string; revenue: number }[];
  referralBreakdown: { source: string; count: number }[];
}

export async function getPeriodMetrics(fromISO: string, toISO: string): Promise<PeriodMetrics> {
  const start = startOfDayBiz(parseISO(fromISO));
  const end   = endOfDayBiz(parseISO(toISO));
  const inRange = (d: Date | null | undefined) => !!d && d >= start && d <= end;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));

  const orderRows = await db
    .select({
      id:            orders.id,
      totalPrice:    orders.totalPrice,
      paymentStatus: orders.paymentStatus,
      paidAt:        orders.paidAt,
      createdAt:     orders.createdAt,
    })
    .from(orders)
    .where(
      or(
        and(gte(orders.createdAt, start), lte(orders.createdAt, end)),
        and(gte(orders.paidAt, start), lte(orders.paidAt, end)),
      ),
    );

  const createdInRange = orderRows.filter((o) => inRange(new Date(o.createdAt)));
  const paidInRange = orderRows.filter(
    (o) => o.paymentStatus === "paid" && inRange(new Date(o.paidAt ?? o.createdAt)),
  );
  const revenue = paidInRange.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);
  const paidCreated = createdInRange.filter((o) => o.paymentStatus === "paid");
  const unpaidCreated = createdInRange.filter((o) => o.paymentStatus !== "paid");
  const avgOrderValue = paidInRange.length > 0 ? revenue / paidInRange.length : 0;

  // ── New customers + referral breakdown ──
  const custRows = await db
    .select({ createdAt: customers.createdAt, referralSource: customers.referralSource })
    .from(customers)
    .where(and(gte(customers.createdAt, start), lte(customers.createdAt, end)));

  const refCounts = new Map<string, number>();
  for (const c of custRows) {
    const key = c.referralSource ?? "Unknown";
    refCounts.set(key, (refCounts.get(key) ?? 0) + 1);
  }
  const referralBreakdown = [...REFERRAL_SOURCES, "Unknown"]
    .map((source) => ({ source, count: refCounts.get(source) ?? 0 }))
    .filter((r) => r.count > 0);

  // ── Time series (≈10–12 buckets) ──
  const bucketCount = Math.min(12, Math.max(2, days <= 14 ? days : 12));
  const bucketDays = Math.ceil(days / bucketCount);
  const timeSeries: TimeBucket[] = [];
  for (let bStart = start.getTime(); bStart <= end.getTime(); bStart += bucketDays * DAY_MS) {
    const bStartD = new Date(bStart);
    const bEndD = new Date(Math.min(bStart + bucketDays * DAY_MS - 1, end.getTime()));
    const bIn = (d: Date) => d >= bStartD && d <= bEndD;
    timeSeries.push({
      label: formatBiz(bStartD, { month: "short", day: "numeric" }),
      revenue: paidInRange
        .filter((o) => bIn(new Date(o.paidAt ?? o.createdAt)))
        .reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
      orders: createdInRange.filter((o) => bIn(new Date(o.createdAt))).length,
      newCustomers: custRows.filter((c) => bIn(new Date(c.createdAt))).length,
    });
  }

  // ── Services / categories within the window ──
  let topServices: PeriodMetrics["topServices"] = [];
  const revByCat = new Map<string, number>();
  const createdIds = createdInRange.map((o) => o.id);
  if (createdIds.length > 0) {
    const itemRows = await db
      .select({
        servicePricingId: orderItems.servicePricingId,
        subtotal:         orderItems.subtotal,
        name:             servicePricing.name,
        category:         servicePricing.category,
      })
      .from(orderItems)
      .leftJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
      .where(inArray(orderItems.orderId, createdIds));

    const byService = new Map<number, { name: string; category: string; count: number; revenue: number }>();
    for (const r of itemRows) {
      const cur = byService.get(r.servicePricingId) ?? {
        name: r.name ?? "—", category: r.category ?? "—", count: 0, revenue: 0,
      };
      cur.count += 1;
      cur.revenue += parseFloat(r.subtotal ?? "0");
      byService.set(r.servicePricingId, cur);
      const cat = r.category ?? "Other";
      revByCat.set(cat, (revByCat.get(cat) ?? 0) + parseFloat(r.subtotal ?? "0"));
    }

    topServices = [...byService.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, v]) => ({
        id, name: v.name, category: v.category, totalOrders: v.count, totalRevenue: v.revenue,
      }));
  }

  const revenueByCategory = [...revByCat.entries()]
    .map(([category, rev]) => ({ category, revenue: rev }))
    .sort((a, b) => b.revenue - a.revenue);

  const label = (d: Date) => formatBiz(d, { month: "short", day: "numeric", year: "numeric" });

  return {
    from: label(start),
    to: label(end),
    days,
    newCustomers: custRows.length,
    revenue,
    orders: createdInRange.length,
    avgOrderValue,
    paidOrders: paidCreated.length,
    unpaidOrders: unpaidCreated.length,
    unpaidValue: unpaidCreated.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0),
    timeSeries,
    topServices,
    revenueByCategory,
    referralBreakdown,
  };
}

// ─── Cross-campaign comparison ───────────────────────────────────────────────

export interface CampaignComparisonRow {
  id:           number;
  name:         string;
  channel:      string;
  spend:        number;
  revenue:      number;
  orders:       number;
  newCustomers: number;
  roas:         number | null;
}

export interface ChannelRollup {
  channel:      string;
  spend:        number;
  revenue:      number;
  newCustomers: number;
  roas:         number | null;
}

export interface CampaignComparison {
  campaigns: CampaignComparisonRow[];
  channels:  ChannelRollup[];
}

export async function getCampaignComparison(): Promise<CampaignComparison> {
  const camps = await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.startDate));
  if (camps.length === 0) return { campaigns: [], channels: [] };

  const spans = camps.map((c) => ({
    start: new Date(c.startDate).getTime(),
    end:   new Date(c.endDate).getTime(),
  }));
  const minStart = new Date(Math.min(...spans.map((s) => s.start)));
  const maxEnd   = new Date(Math.max(...spans.map((s) => s.end)));

  const [orderRows, custRows] = await Promise.all([
    db
      .select({
        totalPrice:    orders.totalPrice,
        paymentStatus: orders.paymentStatus,
        paidAt:        orders.paidAt,
        createdAt:     orders.createdAt,
      })
      .from(orders)
      .where(or(gte(orders.createdAt, minStart), gte(orders.paidAt, minStart))),
    db
      .select({ createdAt: customers.createdAt })
      .from(customers)
      .where(and(gte(customers.createdAt, minStart), lte(customers.createdAt, maxEnd))),
  ]);

  const campaigns: CampaignComparisonRow[] = camps.map((c) => {
    const s = new Date(c.startDate).getTime();
    const e = new Date(c.endDate).getTime();
    const spend = Number(c.spend);
    const revenue = orderRows
      .filter((o) => {
        if (o.paymentStatus !== "paid") return false;
        const t = new Date(o.paidAt ?? o.createdAt).getTime();
        return t >= s && t <= e;
      })
      .reduce((sum, o) => sum + parseFloat(o.totalPrice ?? "0"), 0);
    const ordersInWin = orderRows.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= s && t <= e;
    }).length;
    const newCust = custRows.filter((cu) => {
      const t = new Date(cu.createdAt).getTime();
      return t >= s && t <= e;
    }).length;
    return {
      id: c.id,
      name: c.name,
      channel: c.channel,
      spend,
      revenue,
      orders: ordersInWin,
      newCustomers: newCust,
      roas: spend > 0 ? revenue / spend : null,
    };
  });

  const byChannel = new Map<string, { spend: number; revenue: number; newCustomers: number }>();
  for (const row of campaigns) {
    const cur = byChannel.get(row.channel) ?? { spend: 0, revenue: 0, newCustomers: 0 };
    cur.spend += row.spend;
    cur.revenue += row.revenue;
    cur.newCustomers += row.newCustomers;
    byChannel.set(row.channel, cur);
  }
  const channels: ChannelRollup[] = [...byChannel.entries()]
    .map(([channel, v]) => ({
      channel,
      spend: v.spend,
      revenue: v.revenue,
      newCustomers: v.newCustomers,
      roas: v.spend > 0 ? v.revenue / v.spend : null,
    }))
    .sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1));

  return {
    campaigns: campaigns.sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1)),
    channels,
  };
}
