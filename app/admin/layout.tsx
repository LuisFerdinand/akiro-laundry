// app/admin/layout.tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role    = session?.user?.role;

  if (!session || role !== "admin") {
    redirect(role === "employee" ? "/employee" : "/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          height: "60px", flexShrink: 0,
          display: "flex", alignItems: "center",
          padding: "0 28px",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
        }}>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg,#1a7fba,#2496d6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "white" }}>
                {session.user?.name?.[0]?.toUpperCase() ?? "A"}
              </span>
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                {session.user?.name}
              </p>
              <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>Administrator</p>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: "28px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}