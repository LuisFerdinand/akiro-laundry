// app/employee/layout.tsx
import { TopBar }    from "@/components/employee/TopBar";
import { BottomNav } from "@/components/employee/BottomNav";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <TopBar />
      <main className="pb-20 page-enter max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}