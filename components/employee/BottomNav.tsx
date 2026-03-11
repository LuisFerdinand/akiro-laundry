// components/employee/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Wallet,
} from "lucide-react";

type NavItem = {
  href:   string;
  label:  string;
  icon:   LucideIcon;
  exact:  boolean;
  isCTA?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/employee",              label: "Home",     icon: LayoutDashboard, exact: true  },
  { href: "/employee/orders/new",   label: "New",      icon: PlusCircle,      exact: false, isCTA: true },
  { href: "/employee/orders",       label: "Orders",   icon: ClipboardList,   exact: false },
  { href: "/employee/cash-register",label: "Cash",     icon: Wallet,          exact: false },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="akiro-bottom-nav">
      <div className="flex items-end h-20 max-w-lg mx-auto px-2 pb-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact, isCTA }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          if (isCTA) {
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-end pb-1"
              >
                <div className={`akiro-cta-btn ${isActive ? "akiro-cta-btn--active" : ""}`}>
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-bold mt-1.5 tracking-wide text-brand">
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-end pb-1 gap-1"
            >
              <div className={`akiro-nav-icon-wrap ${isActive ? "akiro-nav-icon-wrap--active" : ""}`}>
                <Icon
                  size={19}
                  className={isActive ? "text-brand" : "text-slate-400"}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[9px] font-bold tracking-wide ${
                  isActive ? "text-brand" : "text-slate-400"
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