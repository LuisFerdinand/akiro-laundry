// lib/actions/daily-email.ts
"use server";

import { db } from "@/lib/db";
import { orders, orderItems, customers, servicePricing } from "@/lib/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";

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

function buildEmailHtml(params: {
  date: string;
  orders: {
    orderNumber: string;
    customerName: string;
    status: string;
    paymentStatus: string;
    totalPrice: string;
    items: { serviceName: string; quantity: string }[];
    createdAt: string;
  }[];
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
}) {
  const { date, orders: orderList, totalRevenue, paidRevenue, unpaidRevenue } = params;

  const formatUSD = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

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
      : `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Unpaid</span>`;

  const rows = orderList.map((o) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 8px;font-family:monospace;font-size:12px;color:#1a7fba;font-weight:700;">${o.orderNumber}</td>
      <td style="padding:10px 8px;font-size:13px;color:#1e293b;font-weight:600;">${o.customerName}</td>
      <td style="padding:10px 8px;font-size:12px;color:#64748b;">${o.items.map((i) => i.serviceName + (i.quantity ? ` (${i.quantity})` : "")).join(", ")}</td>
      <td style="padding:10px 8px;">${statusBadge(o.status)}</td>
      <td style="padding:10px 8px;">${payBadge(o.paymentStatus)}</td>
      <td style="padding:10px 8px;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${formatUSD(parseFloat(o.totalPrice))}</td>
    </tr>
  `).join("");

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
        <td class="stat-cell" width="25%" style="padding:20px 16px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Total Orders</p>
          <p class="stat-value" style="margin:6px 0 0;font-size:28px;font-weight:900;color:#1e293b;">${orderList.length}</p>
        </td>
        <td class="stat-cell br-off" width="25%" style="padding:20px 16px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Total Revenue</p>
          <p class="stat-value" style="margin:6px 0 0;font-size:22px;font-weight:900;color:#1a7fba;">${formatUSD(totalRevenue)}</p>
        </td>
        <td class="stat-cell" width="25%" style="padding:20px 16px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Paid</p>
          <p class="stat-value" style="margin:6px 0 0;font-size:22px;font-weight:900;color:#16a34a;">${formatUSD(paidRevenue)}</p>
        </td>
        <td class="stat-cell br-off" width="25%" style="padding:20px 16px;border-bottom:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Unpaid</p>
          <p class="stat-value" style="margin:6px 0 0;font-size:22px;font-weight:900;color:#dc2626;">${formatUSD(unpaidRevenue)}</p>
        </td>
      </tr>
    </table>

    <!-- Table -->
    <div class="content-pad" style="padding:24px 32px;">
      <h2 style="margin:0 0 14px;font-size:14px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em;">Order Details</h2>
      ${orderList.length === 0
        ? `<p style="color:#94a3b8;font-size:14px;text-align:center;padding:32px 0;">No orders today.</p>`
        : `<div class="table-scroll">
          <table class="order-table" style="width:100%;min-width:480px;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;white-space:nowrap;">Order #</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Customer</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Services</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Status</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Payment</th>
                <th style="padding:8px;text-align:right;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;white-space:nowrap;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
      }
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated daily summary from your Laundry POS system.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Core: Fetch today's orders ───────────────────────────────────────────────

async function fetchTodayOrders(targetDate?: Date) {
  const day = targetDate ?? new Date();
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end   = new Date(day); end.setHours(23, 59, 59, 999);

  const orderRows = await db
    .select({
      order:        orders,
      customerName: customers.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

  if (orderRows.length === 0) return [];

  const { inArray } = await import("drizzle-orm");
  const orderIds = orderRows.map((r) => r.order.id);

  const allItems = await db
    .select({ item: orderItems, serviceName: servicePricing.name })
    .from(orderItems)
    .leftJoin(servicePricing, eq(orderItems.servicePricingId, servicePricing.id))
    .where(inArray(orderItems.orderId, orderIds));

  const itemsByOrder = new Map<number, { serviceName: string; quantity: string }[]>();
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

  return orderRows.map((r) => ({
    orderNumber:   r.order.orderNumber,
    customerName:  r.customerName ?? "Unknown",
    status:        r.order.status,
    paymentStatus: r.order.paymentStatus,
    totalPrice:    r.order.totalPrice,
    createdAt:     r.order.createdAt.toISOString(),
    items:         itemsByOrder.get(r.order.id) ?? [],
  }));
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

    const day       = targetDate ?? new Date();
    const orderList = await fetchTodayOrders(day);

    const dateStr = day.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const totalRevenue  = orderList.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);
    const paidRevenue   = orderList.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);
    const unpaidRevenue = totalRevenue - paidRevenue;

    const html = buildEmailHtml({ date: dateStr, orders: orderList, totalRevenue, paidRevenue, unpaidRevenue });

    await sendEmail({
      to:      recipients.map((r) => r.email),
      subject: `Daily Order Summary – ${dateStr} (${orderList.length} orders)`,
      html,
    });

    return { success: true, recipientCount: recipients.length, orderCount: orderList.length };
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

    const today     = new Date();
    const orderList = await fetchTodayOrders(today);

    const dateStr = today.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const totalRevenue  = orderList.reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);
    const paidRevenue   = orderList.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + parseFloat(o.totalPrice ?? "0"), 0);
    const unpaidRevenue = totalRevenue - paidRevenue;

    const html = buildEmailHtml({
      date:   `[TEST] ${dateStr}`,
      orders: orderList,
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
    });

    await sendEmail({
      to:      targets.map((r) => r.email),
      subject: `[TEST] Daily Order Summary – ${dateStr} (${orderList.length} orders)`,
      html,
    });

    return { success: true, recipientCount: targets.length, orderCount: orderList.length };
  } catch (err) {
    console.error("[sendTestEmail]", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}