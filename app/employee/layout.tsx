// app/employee/layout.tsx
import { TopBar }    from "@/components/employee/layout/TopBar";
import { BottomNav } from "@/components/employee/layout/BottomNav";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen akiro-page-bg">
      <TopBar />
      <main className="pb-24 page-enter max-w-lg sm:max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}