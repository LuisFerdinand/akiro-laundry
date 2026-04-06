// app/admin/receipt-settings/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getReceiptSettings } from "@/lib/actions/receipt-settings";
import { ReceiptTemplateEditor } from "@/components/admin/ReceiptTemplateEditor";

export default async function ReceiptSettingsPage() {
  // ── Auth guard — admin only ───────────────────────────────────────────────
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user as { role?: string }).role !== "admin") {
    redirect("/dashboard");
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const settings = await getReceiptSettings();

  if (!settings) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>
          Receipt settings not found. Please run the seed script first:
        </p>
        <pre
          className="mt-3 text-xs rounded-md p-3"
          style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#334155" }}
        >
          npx tsx scripts/seed-receipt-settings.ts
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1
          className="font-black text-lg tracking-tight"
          style={{ color: "#1e293b" }}
        >
          Receipt Template
        </h1>
        <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
          Customize the thermal receipt printed when an order is created or paid.
          Changes apply immediately — no code deployment required.
        </p>
      </div>

      <ReceiptTemplateEditor settings={settings} />
    </div>
  );
}