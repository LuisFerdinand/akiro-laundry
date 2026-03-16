// components/employee/layout/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon, LayoutDashboard, PlusCircle, ClipboardList, Wallet } from "lucide-react";

type NavItem = {
  href: string; label: string; icon: LucideIcon; exact: boolean; isCTA?: boolean;
  exclude?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/employee",               label: "Home",   icon: LayoutDashboard, exact: true  },
  { href: "/employee/orders/new",    label: "New",    icon: PlusCircle,      exact: false, isCTA: true },
  { href: "/employee/orders",        label: "Orders", icon: ClipboardList,   exact: false, exclude: "/employee/orders/new" },
  { href: "/employee/cash-register", label: "Cash",   icon: Wallet,          exact: false },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-blue-100/50">
      <div className="flex items-end h-[68px] max-w-lg mx-auto px-3 pb-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact, isCTA, exclude }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href) && (!exclude || !pathname.startsWith(exclude));

          if (isCTA) {
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-1 -translate-y-3">
                <div
                  className="w-12 h-12 rounded-[18px] flex items-center justify-center transition-transform active:scale-90"
                  style={{
                    background: isActive
                      ? "linear-gradient(145deg, #0f5a85, #1a7fba)"
                      : "linear-gradient(145deg, #2496d6, #1a7fba, #0f5a85)",
                    boxShadow: "0 6px 20px rgba(26,127,186,0.45), 0 2px 6px rgba(26,127,186,0.2)",
                  }}
                >
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black tracking-wide text-blue-500">{label}</span>
              </Link>
            );
          }

          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-end gap-1 pb-0.5">
              <div
                className={`w-9 h-8 rounded-[10px] flex items-center justify-center transition-all duration-150 ${
                  isActive ? "bg-blue-50" : ""
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? "text-blue-500" : "text-slate-350"}
                  style={{ color: isActive ? "#1a7fba" : "#b0bec9" }}
                />
              </div>
              <span
                className="text-[9px] font-black tracking-wide"
                style={{ color: isActive ? "#1a7fba" : "#b0bec9" }}
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