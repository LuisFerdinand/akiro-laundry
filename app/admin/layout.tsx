// app/admin/layout.tsx
import { auth }            from "@/auth";
import { redirect }        from "next/navigation";
import { SidebarProvider } from "@/components/admin/layout/SidebarContext";
import { AdminSidebar }    from "@/components/admin/layout/AdminSidebar";
import { AdminTopBar }     from "@/components/admin/layout/AdminTopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role    = session?.user?.role;

  if (!session || role !== "admin") {
    redirect(role === "employee" ? "/employee" : "/login");
  }

  return (
    <SidebarProvider>
      {/*
        Outer wrapper: full viewport, flex-row.
        overflow-hidden here so ONLY the main content area scrolls —
        the sidebar stays fixed via position:fixed in AdminSidebar,
        and a width-matching spacer pushes the content column over.
      */}
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>

        {/* AdminSidebar renders a position:fixed <aside> + a width-matched spacer div */}
        <AdminSidebar />

        {/*
          Right column: sticky topbar + scrollable content.
          flex-col + overflow-hidden so the column itself doesn't scroll.
          The <main> inside is the only thing that scrolls.
        */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

          {/* AdminTopBar is sticky via position:sticky inside this column */}
          <AdminTopBar
            userName={session.user?.name  ?? "Admin"}
            userEmail={session.user?.email ?? ""}
          />

          {/* Only this area scrolls */}
          <main style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
            {children}
          </main>

        </div>
      </div>
    </SidebarProvider>
  );
}