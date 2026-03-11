// app/employee/layout.tsx
import { TopBar }    from "@/components/employee/TopBar";
import { BottomNav } from "@/components/employee/BottomNav";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen akiro-page-bg">
      <TopBar />
      <main className="pb-24 page-enter max-w-lg mx-auto px-4 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}