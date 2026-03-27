// app/admin/email-settings/page.tsx
"use client";

import { useState } from "react";
import {
  Mail, Plus, Trash2, Send, TestTube2, CheckCircle2,
  AlertCircle, Loader2, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { sendTestEmail, sendDailySummaryEmail } from "@/lib/actions/daily-email";
import type { EmailRecipient } from "@/lib/actions/daily-email";

// ─── Small reusable components ────────────────────────────────────────────────

function Badge({ children, variant }: { children: React.ReactNode; variant: "success" | "error" | "info" }) {
  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error:   "bg-red-50 border-red-200 text-red-700",
    info:    "bg-blue-50 border-blue-200 text-blue-800",
  };
  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${styles[variant]}`}>
      {variant === "success" && <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
      {variant === "error"   && <AlertCircle  size={16} className="mt-0.5 shrink-0" />}
      {variant === "info"    && <Info         size={16} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailSettingsPage() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([
    { email: "", name: "" },
  ]);
  const [newEmail, setNewEmail]   = useState("");
  const [newName,  setNewName]    = useState("");
  const [emailErr, setEmailErr]   = useState("");
  const [feedback, setFeedback]   = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading,  setLoading]    = useState<"test" | "send" | null>(null);
  const [showEnv,  setShowEnv]    = useState(false);

  // ── Recipients management ──────────────────────────────────────────────────

  const validRecipients = recipients.filter((r) => r.email.trim());

  const addRecipient = () => {
    const email = newEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Please enter a valid email address.");
      return;
    }
    if (validRecipients.some((r) => r.email === email)) {
      setEmailErr("This email is already added.");
      return;
    }
    setRecipients((prev) => [...prev.filter((r) => r.email.trim()), { email, name: newName.trim() || undefined }]);
    setNewEmail("");
    setNewName("");
    setEmailErr("");
  };

  const removeRecipient = (idx: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleTestEmail = async () => {
    if (validRecipients.length === 0) {
      setFeedback({ type: "error", msg: "Add at least one recipient first." });
      return;
    }
    setLoading("test");
    setFeedback(null);
    const result = await sendTestEmail(validRecipients);
    setLoading(null);
    setFeedback(
      result.success
        ? { type: "success", msg: `Test email sent to ${result.recipientCount} recipient${result.recipientCount !== 1 ? "s" : ""}!` }
        : { type: "error", msg: result.error ?? "Failed to send test email." },
    );
  };

  const handleSendNow = async () => {
    if (validRecipients.length === 0) {
      setFeedback({ type: "error", msg: "Add at least one recipient first." });
      return;
    }
    setLoading("send");
    setFeedback(null);
    const result = await sendDailySummaryEmail(undefined, validRecipients);
    setLoading(null);
    setFeedback(
      result.success
        ? {
            type: "success",
            msg: `Summary sent to ${result.recipientCount} recipient${result.recipientCount !== 1 ? "s" : ""}! (${result.orderCount} orders today)`,
          }
        : { type: "error", msg: result.error ?? "Failed to send summary." },
    );
  };

  // ── Env snippet ────────────────────────────────────────────────────────────

  const envSnippet = `# .env.local

# ── Option A: Resend (recommended) ──
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Laundry POS <no-reply@yourdomain.com>

# ── Option B: SMTP (Gmail / Mailtrap / etc.) ──
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=you@gmail.com
# SMTP_PASS=your_app_password
# EMAIL_FROM=you@gmail.com

# ── Recipients (optional — you can also set them in this UI) ──
EMAIL_RECIPIENTS=[{"email":"owner@example.com","name":"Owner"},{"email":"manager@example.com"}]`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
          <Mail size={18} className="text-blue-500" />
        </div>
        <div>
          <h1 className="font-black text-lg text-slate-800 tracking-tight">Email Summary Settings</h1>
          <p className="text-xs text-slate-400 font-medium">Send daily order summaries to multiple recipients</p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && <Badge variant={feedback.type}>{feedback.msg}</Badge>}

      {/* Recipient list */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Recipients</p>
        </div>

        <div className="divide-y divide-slate-100">
          {validRecipients.length === 0 && (
            <p className="px-4 py-5 text-sm text-slate-400 text-center">No recipients added yet.</p>
          )}
          {validRecipients.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-blue-600">
                  {(r.name ?? r.email)[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {r.name && <p className="text-sm font-bold text-slate-700 leading-tight">{r.name}</p>}
                <p className="text-xs text-slate-500 font-medium truncate">{r.email}</p>
              </div>
              <button
                onClick={() => removeRecipient(validRecipients.indexOf(r))}
                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add recipient form */}
        <div className="px-4 py-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                placeholder="email@example.com"
                className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                placeholder="Display name (optional)"
                className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <button
              onClick={addRecipient}
              className="h-9 w-9 self-start flex items-center justify-center rounded-md text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6)" }}
            >
              <Plus size={16} />
            </button>
          </div>
          {emailErr && <p className="text-xs font-medium text-red-500">{emailErr}</p>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleTestEmail}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 h-11 rounded-lg border-2 border-slate-200 text-sm font-black text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading === "test"
            ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
            : <><TestTube2 size={14} /> Send Test</>}
        </button>

        <button
          onClick={handleSendNow}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6,#0f5a85)", boxShadow: "0 4px 16px rgba(26,127,186,0.30)" }}
        >
          {loading === "send"
            ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
            : <><Send size={14} /> Send Today&apos;s Summary</>}
        </button>
      </div>

      {/* How to automate note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-1">
        <p className="text-xs font-black uppercase tracking-widest text-amber-600">Automate Daily Emails</p>
        <p className="text-sm text-amber-800">
          To send the summary automatically every night, call <code className="bg-amber-100 px-1 rounded font-mono text-xs">sendDailySummaryEmail()</code> from a{" "}
          <strong>cron job</strong> or a scheduled API route.
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Add <code className="bg-amber-100 px-1 rounded font-mono">GET /api/cron/daily-email</code> and hit it daily with Vercel Cron, Railway, or an external scheduler like cron-job.org.
        </p>
      </div>

      {/* Env config collapsible */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowEnv((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left"
        >
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Environment Variables</p>
          {showEnv ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        {showEnv && (
          <div className="px-4 py-4">
            <p className="text-xs text-slate-500 mb-3">Add these to your <code className="bg-slate-100 px-1 rounded font-mono">.env.local</code>:</p>
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed whitespace-pre">{envSnippet}</pre>
          </div>
        )}
      </div>

      {/* Cron API route snippet */}
      {showEnv && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Cron Route — <code className="font-mono normal-case">app/api/cron/daily-email/route.ts</code>
            </p>
          </div>
          <div className="px-4 py-4">
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed whitespace-pre">{`import { NextResponse } from "next/server";
import { sendDailySummaryEmail } from "@/lib/actions/daily-email";

// Protect with a secret so only your scheduler can call it
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDailySummaryEmail();
  return NextResponse.json(result);
}

// vercel.json cron example:
// { "crons": [{ "path": "/api/cron/daily-email?secret=YOUR_SECRET", "schedule": "0 20 * * *" }] }`}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
}