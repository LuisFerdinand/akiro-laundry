// app/admin/settings/page.tsx
import { auth }           from "@/auth";
import { redirect }       from "next/navigation";
import { SettingsClient } from "@/components/admin/SettingsClient";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const admin = session.user as { id: string; name: string; email: string };

  return (
    <SettingsClient
      adminId={Number(admin.id)}
      adminName={admin.name ?? ""}
      adminEmail={admin.email ?? ""}
    />
  );
}