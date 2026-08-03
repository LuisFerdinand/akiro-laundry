// app/admin/page.tsx
import { getFullDashboardStats } from "@/lib/actions/dashboard-stats";
import { DashboardClient }       from "@/components/admin/DashboardClient";

// ── Update these to your real handles ──────────────────────────────────────
const TIKTOK_HANDLE    = "@akirolaundryandparfume";
const INSTAGRAM_HANDLE = "@rxaxfxi";
const FACEBOOK_HANDLE  = "@akirolaundryandparfume";

export default async function AdminDashboard() {
  const stats = await getFullDashboardStats();

  return (
    <DashboardClient
      stats={stats}
      social={{
        tiktokHandle:    TIKTOK_HANDLE,
        instagramHandle: INSTAGRAM_HANDLE,
        facebookHandle:  FACEBOOK_HANDLE,
      }}
    />
  );
}