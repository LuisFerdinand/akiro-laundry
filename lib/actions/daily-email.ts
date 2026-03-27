// lib/actions/daily-email.ts
"use server";

import { db } from "@/lib/db";
import { orders, orderItems, customers, servicePricing } from "@/lib/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
// Store recipients in env var as JSON string, e.g.:
// EMAIL_RECIPIENTS=[{"email":"owner@example.com","name":"Owner"},{"email":"manager@example.com"}]
// Falls back to EMAIL_TO for single recipient.

function getRecipients(): EmailRecipient[] {
  try {
    const raw = process.env.EMAIL_RECIPIENTS;
    if (raw) return JSON.parse(raw) as EmailRecipient[];
  } catch {
    // ignore parse errors
  }
  const single = process.env.EMAIL_TO;
  if (single) return [{ email: single }];
  return [];
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

  const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

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
      <td style="padding:10px 8px;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${formatIDR(parseFloat(o.totalPrice))}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Daily Order Summary</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:720px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a7fba,#2496d6);padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">📋 Daily Order Summary</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.80);font-size:14px;">${date}</p>
    </div>

    <!-- Stats -->
    <div style="display:flex;gap:0;border-bottom:1px solid #f1f5f9;">
      <div style="flex:1;padding:20px 24px;border-right:1px solid #f1f5f9;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Total Orders</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:900;color:#1e293b;">${orderList.length}</p>
      </div>
      <div style="flex:1;padding:20px 24px;border-right:1px solid #f1f5f9;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Total Revenue</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#1a7fba;">${formatIDR(totalRevenue)}</p>
      </div>
      <div style="flex:1;padding:20px 24px;border-right:1px solid #f1f5f9;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Paid</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#16a34a;">${formatIDR(paidRevenue)}</p>
      </div>
      <div style="flex:1;padding:20px 24px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Unpaid</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#dc2626;">${formatIDR(unpaidRevenue)}</p>
      </div>
    </div>

    <!-- Table -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 14px;font-size:14px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em;">Order Details</h2>
      ${orderList.length === 0
        ? `<p style="color:#94a3b8;font-size:14px;text-align:center;padding:32px 0;">No orders today.</p>`
        : `<table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Order #</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Customer</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Services</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Status</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Payment</th>
                <th style="padding:8px;text-align:right;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
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

// ─── Send via Resend (primary) ────────────────────────────────────────────────
// Install: npm install resend
// Set env: RESEND_API_KEY, EMAIL_FROM

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

// ─── Send via Nodemailer / SMTP (alternative) ─────────────────────────────────
// Install: npm install nodemailer
// Set env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM

async function sendViaSMTP(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  // Dynamically import so it only fails if you try to use this path
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
  const provider = process.env.EMAIL_PROVIDER ?? "resend"; // "resend" | "smtp"
  if (provider === "smtp") {
    await sendViaSMTP(params);
  } else {
    await sendViaResend(params);
  }
}

// ─── Public Actions ───────────────────────────────────────────────────────────

/** Send the daily summary for today (or a custom date) to all configured recipients. */
export async function sendDailySummaryEmail(
  targetDate?: Date,
  customRecipients?: EmailRecipient[],
): Promise<DailySummaryEmailResult> {
  try {
    const recipients = customRecipients ?? getRecipients();
    if (recipients.length === 0) {
      return { success: false, error: "No email recipients configured. Set EMAIL_RECIPIENTS or EMAIL_TO in your .env." };
    }

    const day       = targetDate ?? new Date();
    const orderList = await fetchTodayOrders(day);

    const dateStr = day.toLocaleDateString("en-ID", {
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

/** Send a test email with mock data — useful for verifying your email setup. */
export async function sendTestEmail(
  recipients: EmailRecipient[],
): Promise<DailySummaryEmailResult> {
  try {
    if (recipients.length === 0) {
      return { success: false, error: "Please add at least one recipient." };
    }

    const mockOrders = [
      {
        orderNumber: "ORD-TEST-001", customerName: "John Doe",
        status: "done", paymentStatus: "paid", totalPrice: "85000",
        createdAt: new Date().toISOString(),
        items: [{ serviceName: "Regular Wash", quantity: "3 kg" }],
      },
      {
        orderNumber: "ORD-TEST-002", customerName: "Jane Smith",
        status: "processing", paymentStatus: "unpaid", totalPrice: "120000",
        createdAt: new Date().toISOString(),
        items: [
          { serviceName: "Express Wash", quantity: "2 kg" },
          { serviceName: "Shoe Wash", quantity: "2 pcs" },
        ],
      },
    ];

    const today = new Date();
    const dateStr = today.toLocaleDateString("en-ID", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const html = buildEmailHtml({
      date:          `[TEST] ${dateStr}`,
      orders:        mockOrders,
      totalRevenue:  205000,
      paidRevenue:   85000,
      unpaidRevenue: 120000,
    });

    await sendEmail({
      to:      recipients.map((r) => r.email),
      subject: `[TEST] Daily Order Summary – ${dateStr}`,
      html,
    });

    return { success: true, recipientCount: recipients.length, orderCount: mockOrders.length };
  } catch (err) {
    console.error("[sendTestEmail]", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}