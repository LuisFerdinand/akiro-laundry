// components/employee/layout/nav-items.ts
// Employee navigation — shared by the phone BottomNav and the tablet SideRail.
import { type LucideIcon, LayoutDashboard, PlusCircle, ClipboardList, Wallet } from "lucide-react";

export type NavItem = {
  href: string; label: string; icon: LucideIcon; exact: boolean; isCTA?: boolean;
  exclude?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/employee",               label: "Home",   icon: LayoutDashboard, exact: true  },
  { href: "/employee/orders/new",    label: "New",    icon: PlusCircle,      exact: false, isCTA: true },
  { href: "/employee/orders",        label: "Orders", icon: ClipboardList,   exact: false, exclude: "/employee/orders/new" },
  { href: "/employee/cash-register", label: "Cash",   icon: Wallet,          exact: false },
];

export function isNavActive({ href, exact, exclude }: NavItem, pathname: string): boolean {
  return exact
    ? pathname === href
    : pathname.startsWith(href) && (!exclude || !pathname.startsWith(exclude));
}
