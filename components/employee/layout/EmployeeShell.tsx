// components/employee/layout/EmployeeShell.tsx
// Page frame for the employee POS. Phones: TopBar + BottomNav around a single
// column. Tablets (md+): a fixed SideRail and a wide content area — the
// dashboard, orders and cash pages use the width; form-style pages (new / edit
// order, order detail) cap themselves at max-w-3xl.
import { TopBar }    from "./TopBar";
import { BottomNav } from "./BottomNav";
import { SideRail }  from "./SideRail";

export function EmployeeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen akiro-page-bg">
      <TopBar />
      <SideRail />
      <div className="md:pl-22">
        <main className="page-enter mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
