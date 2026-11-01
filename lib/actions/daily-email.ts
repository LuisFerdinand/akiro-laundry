// lib/actions/daily-email.ts
"use server";

import { db } from "@/lib/db";
import { customers, orderItems, servicePricing } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { startOfDayBiz, endOfDayBiz, formatBiz } from "@/lib/utils/business-time";
import {
  collectedAmount, revenueEvent, summarizeRevenue,
  type RevenueMethod, type RevenueSummary,
} from "@/lib/utils/revenue";
import { fetchRevenueRows } from "@/lib/db/queries/revenue.queries";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface DailySummaryEmailResult {
  success: boolean;
  error?: string;
  recipientCount?: number;
  orderCount?: number;
}

/** An order placed on the day, with what has been received against it so far. */
interface PlacedOrder {
  orderNumber:   string;
  customerName:  string;
  status:        string;
  paymentStatus: string;
  total:         number;
  received:      number;
  items:         { serviceName: string; quantity: string }[];
}

/** A payment received on the day for an order placed on an earlier day. */
interface EarlierPayment {
  orderNumber:  string;
  customerName: string;
  placedOn:     string;
  kind:         "paid" | "dp";
  amount:       number;
}

interface DayReport {
  summary:         RevenueSummary;
  placed:          PlacedOrder[];
  earlierPayments: EarlierPayment[];
}

// ─── Email Recipients Config ──────────────────────────────────────────────────
// Priority order:
// 1. EMAIL_RECIPIENTS env var (JSON array)
// 2. EMAIL_TO env var (single address)
// 3. Hardcoded fallback below

const HARDCODED_RECIPIENTS: EmailRecipient[] = [
  { email: "akirolaundry@gmail.com", name: "Akiro Laundry" },
];

function getRecipients(): EmailRecipient[] {
  try {
    const raw = process.env.EMAIL_RECIPIENTS;
    if (raw) return JSON.parse(raw) as EmailRecipient[];
  } catch {
    // ignore parse errors
  }
  const single = process.env.EMAIL_TO;
  if (single) return [{ email: single }];

  // Hardcoded fallback — always receives the daily summary if no env var is set
  return HARDCODED_RECIPIENTS;
}

// ─── HTML Email Builder ───────────────────────────────────────────────────────

const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const METHOD_LABEL: Record<RevenueMethod, string> = {
  cash: "Cash", transfer: "Transfer", qris: "QRIS", other: "Other",
};

function buildEmailHtml(params: { date: string; report: DayReport }) {
  const { date, report } = params;
  const { summary, placed: orderList, earlierPayments } = report;

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending:    { bg: "#fef3c7", color: "#92400e", label: "Pending" },
      processing: { bg: "#dbeafe", color: "#1e3a5f", label: "Processing" },
      done:       { bg: "#d1fae5", color: "#065f46", label: "Done" },
      picked_up:  { bg: "#f3f4f6", color: "#374151", label: "Picked Up" },
    };
    const s = map[status] ?? { bg: "#f3f4f6", color: "#374151", label: status };
    return `<span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${s.label}</span>`;
  };

  const payBadge = (status: string) =>
    status === "paid"
      ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Paid</span>`
      : status === "partial"
        ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Partial (DP)</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Unpaid</span>`;

  const th = (label: string, align = "left") =>
    `<th style="padding:8px;text-align:${align};font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;white-space:nowrap;">${label}</th>`;

  const rows = orderList.map((o) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 8px;font-family:monospace;font-size:12px;color:#1a7fba;font-weight:700;">${o.orderNumber}</td>
      <td style="padding:10px 8px;font-size:13px;color:#1e293b;font-weight:600;">${o.customerName}</td>
      <td style="padding:10px 8px;font-size:12px;color:#64748b;">${o.items.map((i) => i.serviceName + (i.quantity ? ` (${i.quantity})` : "")).join(", ")}</td>
      <td style="padding:10px 8px;">${statusBadge(o.status)}</td>
      <td style="padding:10px 8px;">${payBadge(o.paymentStatus)}</td>
      <td style="padding:10px 8px;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${formatUSD(o.total)}</td>
      <td style="padding:10px 8px;font-size:13px;font-weight:700;color:${o.received > 0 ? "#16a34a" : "#cbd5e1"};text-align:right;">${formatUSD(o.received)}</td>
    </tr>
  `).join("");

  const earlierRows = earlierPayments.map((p) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 8px;font-family:monospace;font-size:12px;color:#1a7fba;font-weight:700;">${p.orderNumber}</td>
      <td style="padding:10px 8px;font-size:13px;color:#1e293b;font-weight:600;">${p.customerName}</td>
      <td style="padding:10px 8px;font-size:12px;color:#64748b;">${p.placedOn}</td>
      <td style="padding:10px 8px;">${p.kind === "paid" ? payBadge("paid") : payBadge("partial")}</td>
      <td style="padding:10px 8px;font-size:13px;font-weight:700;color:#16a34a;text-align:right;">${formatUSD(p.amount)}</td>
    </tr>
  `).join("");

  const methodLine = summary.byMethod.length === 0
    ? "No payments received today."
    : summary.byMethod.map((m) => `${METHOD_LABEL[m.method]} <b style="color:#1e293b;">${formatUSD(m.amount)}</b>`).join(" &nbsp;·&nbsp; ");

  const stat = (label: string, value: string, color: string, last = false) => `
        <td class="stat-cell${last ? " br-off" : ""}" width="25%" style="padding:20px 16px;${last ? "" : "border-right:1px solid #f1f5f9;"}border-bottom:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">${label}</p>
          <p class="stat-value" style="margin:6px 0 0;font-size:22px;font-weight:900;color:${color};">${value}</p>
        </td>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no">
<title>Daily Order Summary</title>
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; border-radius: 0 !important; }
    .header-pad { padding: 20px !important; }
    .content-pad { padding: 16px !important; }
    .stat-cell { display: block !important; width: 50% !important; box-sizing: border-box !important; }
    .stat-cell.br-off { border-right: none !important; }
    .stat-value { font-size: 20px !important; }
    .order-table th, .order-table td { padding: 8px 6px !important; font-size: 12px !important; }
    .table-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div class="container" style="max-width:720px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div class="header-pad" style="background:linear-gradient(135deg,#1a7fba,#2496d6);padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">📋 Daily Order Summary</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.80);font-size:14px;">${date}</p>
    </div>

    <!-- Stats -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-bottom:1px solid #f1f5f9;">
      <tr>
        ${stat("Revenue", formatUSD(summary.revenue), "#16a34a")}
        ${stat("Orders Placed", String(summary.placed.orders), "#1e293b")}
        ${stat("Order Value", formatUSD(summary.placed.value), "#1a7fba")}
        ${stat("Still Owed", formatUSD(summary.placed.outstanding), "#dc2626", true)}
      </tr>
    </table>
    <div style="padding:14px 32px;background:#f8fafc;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
        <b style="color:#475569;">Revenue</b> is the money received today (${summary.payments} payment${summary.payments === 1 ? "" : "s"}, including DPs and balances on earlier orders) — the same figure as the dashboard.
        <b style="color:#475569;">Order Value</b> is everything placed today, and <b style="color:#475569;">Still Owed</b> is what is unpaid on those orders.<br>
        Received by method: ${methodLine}
      </p>
    </div>

    <!-- Orders placed today -->
    <div class="content-pad" style="padding:24px 32px;">
      <h2 style="margin:0 0 14px;font-size:14px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em;">Orders Placed Today</h2>
      ${orderList.length === 0
        ? `<p style="color:#94a3b8;font-size:14px;text-align:center;padding:32px 0;">No orders today.</p>`
        : `<div class="table-scroll">
          <table class="order-table" style="width:100%;min-width:520px;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                ${th("Order #")}${th("Customer")}${th("Services")}${th("Status")}${th("Payment")}${th("Total", "right")}${th("Received", "right")}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
      }
    </div>

    ${earlierPayments.length === 0 ? "" : `
    <!-- Payments on earlier orders -->
    <div class="content-pad" style="padding:0 32px 24px;">
      <h2 style="margin:0 0 14px;font-size:14px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em;">Payments On Earlier Orders</h2>
      <div class="table-scroll">
        <table class="order-table" style="width:100%;min-width:420px;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;">
              ${th("Order #")}${th("Customer")}${th("Placed")}${th("Payment")}${th("Received", "right")}
            </tr>
          </thead>
          <tbody>${earlierRows}</tbody>
        </table>
      </div>
    </div>`}

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated daily summary from your Laundry POS system.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Core: build the day's report ─────────────────────────────────────────────

async function buildDayReport(targetDate?: Date): Promise<DayReport> {
  const day   = targetDate ?? new Date();
  const start = startOfDayBiz(day);
  const end   = endOfDayBiz(day);

  // One shared definition of revenue (lib/utils/revenue.ts) — the same rows and
  // maths as the dashboard, so today's figure here equals today's figure there.
  const rows    = await fetchRevenueRows(start, end);
  const summary = summarizeRevenue(rows, start, end);

  const placedRows = rows
    .filter((o) => o.createdAt >= start && o.createdAt <= end)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const earlierRows = rows.filter((o) => {
    const ev = revenueEvent(o);
    return ev && ev.date >= start && ev.date <= end && o.createdAt < start;
  });

  const customerIds = [...new Set([...placedRows, ...earlierRows].map((o) => o.customerId))];
  const nameById = new Map<number, string>();
  if (customerIds.length > 0) {
    const names = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(inArray(customers.id, customerIds));
    for (const c of names) nameById.set(c.id, c.name);
  }

  const itemsByOrder = new Map<number, { serviceName: string; quantity: string }[]>();
  if (placedRows.length > 0) {
    const allItems = await db
      .select({ item: orderItems, serviceName: servicePricing.name })
      .from(orderItems)
      .leftJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
      .where(inArray(orderItems.orderId, placedRows.map((o) => o.id)));

    for (const row of allItems) {
      const list = itemsByOrder.get(row.item.orderId) ?? [];
      list.push({
        serviceName: row.serviceName ?? "—",
        quantity: row.item.weightKg
          ? `${row.item.weightKg} kg`
          : row.item.quantity
            ? `${row.item.quantity} pcs`
            : "",
      });
      itemsByOrder.set(row.item.orderId, list);
    }
  }

  const placed: PlacedOrder[] = placedRows.map((o) => ({
    orderNumber:   o.orderNumber,
    customerName:  nameById.get(o.customerId) ?? "Unknown",
    status:        o.status,
    paymentStatus: o.paymentStatus,
    total:         parseFloat(o.totalPrice ?? "0"),
    received:      collectedAmount(o),
    items:         itemsByOrder.get(o.id) ?? [],
  }));

  const earlierPayments: EarlierPayment[] = earlierRows.map((o) => ({
    orderNumber:  o.orderNumber,
    customerName: nameById.get(o.customerId) ?? "Unknown",
    placedOn:     formatBiz(o.createdAt, { month: "short", day: "numeric" }),
    kind:         o.paymentStatus === "paid" ? "paid" : "dp",
    amount:       revenueEvent(o)!.amount,
  }));

  return { summary, placed, earlierPayments };
}

// ─── Send via Resend ──────────────────────────────────────────────────────────

async function sendViaResend(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const from = process.env.EMAIL_FROM ?? "Laundry POS <no-reply@yourdomain.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// ─── Send via SMTP ────────────────────────────────────────────────────────────

async function sendViaSMTP(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require("nodemailer");

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM ?? process.env.SMTP_USER,
    to:      params.to.join(", "),
    subject: params.subject,
    html:    params.html,
  });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function sendEmail(params: { to: string[]; subject: string; html: string }): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "resend";
  if (provider === "smtp") {
    await sendViaSMTP(params);
  } else {
    await sendViaResend(params);
  }
}

// ─── Public Actions ───────────────────────────────────────────────────────────

/**
 * Send the daily summary for today (or a custom date).
 * Uses customRecipients if provided, otherwise falls back to env vars → hardcoded list.
 */
export async function sendDailySummaryEmail(
  targetDate?: Date,
  customRecipients?: EmailRecipient[],
): Promise<DailySummaryEmailResult> {
  try {
    const recipients = customRecipients && customRecipients.length > 0
      ? customRecipients
      : getRecipients();

    if (recipients.length === 0) {
      return { success: false, error: "No email recipients configured." };
    }

    const day    = targetDate ?? new Date();
    const report = await buildDayReport(day);

    const dateStr = formatBiz(day, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    await sendEmail({
      to:      recipients.map((r) => r.email),
      subject: `Daily Order Summary – ${dateStr} (${report.summary.placed.orders} orders · ${formatUSD(report.summary.revenue)} received)`,
      html:    buildEmailHtml({ date: dateStr, report }),
    });

    return { success: true, recipientCount: recipients.length, orderCount: report.summary.placed.orders };
  } catch (err) {
    console.error("[sendDailySummaryEmail]", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Send a test email using REAL today's data.
 * If no recipients passed, falls back to env vars then hardcoded list —
 * so you don't need to fill in the form on the settings page.
 */
export async function sendTestEmail(
  recipients?: EmailRecipient[],
): Promise<DailySummaryEmailResult> {
  try {
    const targets = recipients && recipients.length > 0
      ? recipients
      : getRecipients();

    if (targets.length === 0) {
      return { success: false, error: "No recipients configured." };
    }

    const today  = new Date();
    const report = await buildDayReport(today);

    const dateStr = formatBiz(today, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    await sendEmail({
      to:      targets.map((r) => r.email),
      subject: `[TEST] Daily Order Summary – ${dateStr} (${report.summary.placed.orders} orders · ${formatUSD(report.summary.revenue)} received)`,
      html:    buildEmailHtml({ date: `[TEST] ${dateStr}`, report }),
    });

    return { success: true, recipientCount: targets.length, orderCount: report.summary.placed.orders };
  } catch (err) {
    console.error("[sendTestEmail]", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
