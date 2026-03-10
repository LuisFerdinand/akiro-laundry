// components/employee/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, ClipboardList, History } from "lucide-react";

const NAV_ITEMS = [
  { href: "/employee",             label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/employee/orders/new",  label: "New Order", icon: PlusCircle,      exact: false },
  { href: "/employee/orders",      label: "Orders",    icon: ClipboardList,   exact: false },
  { href: "/employee/history",     label: "History",   icon: History,         exact: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href);

          if (label === "New Order") {
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-1"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md -mt-4 transition-transform active:scale-95 ${
                    isActive
                      ? "bg-brand-dark"
                      : "brand-gradient shadow-[0_4px_12px_rgba(21,83,126,0.4)]"
                  }`}
                >
                  <Icon size={22} className="text-white" strokeWidth={2} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-1"
            >
              <Icon
                size={20}
                className={isActive ? "text-brand" : "text-muted-foreground"}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-semibold tracking-wide ${
                  isActive ? "text-brand" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}