// components/admin/layout/AdminSidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Wrench,
  Wallet,
  Sparkles,
  Package,
  UserCog,
  Settings,
  ChevronRight,
} from "lucide-react";

// ─── Nav groups ───────────────────────────────────────────────────────────────

type NavGroup = {
  label: string;
  items: {
    href:   string;
    icon:   React.ElementType;
    label:  string;
    exact?: boolean;
  }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin",           icon: LayoutDashboard, label: "Dashboard",     exact: true },
      { href: "/admin/orders",    icon: ShoppingBag,     label: "Orders"                    },
      { href: "/admin/customers", icon: Users,           label: "Customers"                  },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/cash-register", icon: Wallet, label: "Cash Register" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/services", icon: Wrench,   label: "Services"  },
      { href: "/admin/products", icon: Package,  label: "Products"  },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users",    icon: UserCog,  label: "Users & Roles" },
      { href: "/admin/settings", icon: Settings, label: "Settings"      },
    ],
  },
];

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  href, icon: Icon, label, isActive, collapsed,
}: {
  href:      string;
  icon:      React.ElementType;
  label:     string;
  isActive:  boolean;
  collapsed: boolean;
}) {
  const linkContent = (
    <Link
      href={href}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            collapsed ? 0 : "10px",
        padding:        collapsed ? "10px 0" : "9px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        width:          "100%",
        borderRadius:   "8px",
        marginBottom:   "2px",
        textDecoration: "none",
        transition:     "all 0.12s",
        background:     isActive ? "rgba(26,127,186,0.18)" : "transparent",
        border:         isActive
          ? "1px solid rgba(26,127,186,0.30)"
          : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon
        size={15}
        style={{
          color:      isActive ? "#2496d6" : "rgba(255,255,255,0.40)",
          flexShrink: 0,
        }}
      />

      {!collapsed && (
        <>
          <span
            style={{
              fontSize:   "13px",
              fontWeight: isActive ? 700 : 500,
              color:      isActive ? "white" : "rgba(255,255,255,0.55)",
              flex:       1,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          {isActive && (
            <ChevronRight
              size={11}
              style={{ color: "rgba(36,150,214,0.60)", flexShrink: 0 }}
            />
          )}
        </>
      )}
    </Link>
  );

  if (!collapsed) return linkContent;

  return (
    <Tooltip>
      <TooltipTrigger>
        {linkContent}
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={12}
        className="border-0"
        style={{
          background:   "#0f172a",
          color:        "white",
          fontSize:     "12px",
          fontWeight:   700,
          padding:      "6px 10px",
          borderRadius: "8px",
          boxShadow:    "0 4px 16px rgba(0,0,0,0.25)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const { collapsed: collapsedState, mounted } = useSidebar();
  const pathname = usePathname();

  // Before the client has mounted, always treat sidebar as expanded so the
  // server-rendered HTML and the first client render match exactly.
  // Once mounted=true the real localStorage value kicks in.
  const collapsed = mounted ? collapsedState : false;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const W = collapsed ? 64 : 224;

  return (
    <>
      {/* Fixed sidebar */}
      <aside
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          width:         W,
          height:        "100vh",
          background:    "#0c1e35",
          borderRight:   "1px solid rgba(255,255,255,0.06)",
          display:       "flex",
          flexDirection: "column",
          transition:    "width 0.22s cubic-bezier(.4,0,.2,1)",
          overflow:      "hidden",
          zIndex:        50,
        }}
      >
        {/* ── Logo ─────────────────────────────────────── */}
        <div
          style={{
            height:         "60px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding:        collapsed ? "0" : "0 16px",
            gap:            "10px",
            borderBottom:   "1px solid rgba(255,255,255,0.06)",
            flexShrink:     0,
            overflow:       "hidden",
          }}
        >
          <Image
            src="/logo/2.png"
            alt="Akiro"
            width={30}
            height={30}
            style={{ objectFit: "contain", flexShrink: 0 }}
            priority
          />
          {!collapsed && (
            <div style={{ lineHeight: 1 }}>
              <p
                style={{
                  fontFamily:    "Sora, sans-serif",
                  fontWeight:    800,
                  fontSize:      "15px",
                  color:         "white",
                  letterSpacing: "-0.01em",
                  whiteSpace:    "nowrap",
                }}
              >
                Akiro
              </p>
              <p
                style={{
                  fontSize:      "8px",
                  fontWeight:    700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color:         "rgba(26,127,186,0.55)",
                  marginTop:     "2px",
                  whiteSpace:    "nowrap",
                }}
              >
                Laundry &amp; Perfume
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ──────────────────────────────────────── */}
        <TooltipProvider>
        <nav
          style={{
            flex:          1,
            padding:       "16px 8px",
            display:       "flex",
            flexDirection: "column",
            overflowY:     "auto",
            overflowX:     "hidden",
          }}
        >
          {NAV_GROUPS.map((group, groupIndex) => (
            <div
              key={group.label}
              style={{
                display:       "flex",
                flexDirection: "column",
                marginBottom:  collapsed ? 0 : "24px",
              }}
            >
              {/* Separator between groups when collapsed */}
              {collapsed && groupIndex > 0 && (
                <div
                  style={{
                    height:     "1px",
                    background: "rgba(255,255,255,0.08)",
                    margin:     "6px 10px",
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Group label — visible only when expanded */}
              {!collapsed && (
                <p
                  style={{
                    fontSize:      "9px",
                    fontWeight:    800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color:         "rgba(255,255,255,0.25)",
                    padding:       "0 8px",
                    marginBottom:  "6px",
                  }}
                >
                  {group.label}
                </p>
              )}

              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActive(item.href, item.exact)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}
        </nav>
        </TooltipProvider>

        {/* ── Footer ───────────────────────────────────── */}
        {!collapsed && (
          <div
            style={{
              padding:    "10px 14px",
              borderTop:  "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.20)", fontWeight: 600 }}>
              Admin Console v1.0
            </p>
          </div>
        )}
      </aside>

      {/* Spacer so page content doesn't render under the fixed sidebar */}
      <div
        style={{
          width:      W,
          flexShrink: 0,
          transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </>
  );
}