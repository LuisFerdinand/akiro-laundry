// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, ClipboardList, Users, Wallet,
  Settings, LogOut, WashingMachine, ChevronRight,
  Sparkles, Package, UserCog,
} from "lucide-react";

type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; exact?: boolean }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin",               label: "Dashboard",     icon: LayoutDashboard, exact: true },
      { href: "/admin/orders",        label: "Orders",        icon: ClipboardList  },
      { href: "/admin/customers",     label: "Customers",     icon: Users          },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/cash-register", label: "Cash Register", icon: Wallet         },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/services",      label: "Services",      icon: Sparkles       },
      { href: "/admin/products",      label: "Products",      icon: Package        },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users",         label: "Users & Roles", icon: UserCog        },
      { href: "/admin/settings",      label: "Settings",      icon: Settings       },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "240px", minWidth: "240px",
      height: "100vh", position: "sticky", top: 0,
      display: "flex", flexDirection: "column",
      background: "#0c1e35",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Brand */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "10px",
            background: "linear-gradient(135deg,#1a7fba,#2496d6)",
            boxShadow: "0 4px 12px rgba(26,127,186,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <WashingMachine size={18} style={{ color: "white" }} />
          </div>
          <div>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "14px", color: "white" }}>Akiro</p>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Admin console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: "24px" }}>
            <p style={{
              fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.25)",
              padding: "0 8px", marginBottom: "6px",
            }}>{group.label}</p>
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 10px", borderRadius: "8px", marginBottom: "2px",
                  background: isActive ? "rgba(26,127,186,0.18)" : "transparent",
                  border: isActive ? "1px solid rgba(26,127,186,0.3)" : "1px solid transparent",
                  textDecoration: "none", transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={15} style={{ color: isActive ? "#2496d6" : "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: isActive ? 700 : 500, color: isActive ? "white" : "rgba(255,255,255,0.55)", flex: 1 }}>
                    {label}
                  </span>
                  {isActive && <ChevronRight size={11} style={{ color: "rgba(36,150,214,0.6)" }} />}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sign out */}
      <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 10px", borderRadius: "8px",
            background: "transparent", border: "none", cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(225,29,72,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={15} style={{ color: "rgba(255,255,255,0.35)" }} />
          <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.45)" }}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}