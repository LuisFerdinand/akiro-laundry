// components/admin/layout/AdminTopBar.tsx
"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Home,
  Monitor,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface Props {
  userName:  string;
  userEmail: string;
}

export function AdminTopBar({ userName, userEmail }: Props) {
  const { collapsed: collapsedState, mounted, toggle } = useSidebar();

  // Match the server render (expanded) until the client has hydrated.
  const collapsed = mounted ? collapsedState : false;

  const initial = userName.charAt(0).toUpperCase();

  return (
    <header
      style={{
        height:       "60px",
        flexShrink:   0,
        display:      "flex",
        alignItems:   "center",
        padding:      "0 28px 0 20px",
        gap:          "14px",
        background:   "linear-gradient(135deg, #0c1e35, #0f3460)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow:    "0 2px 12px rgba(0,0,0,0.18)",
        position:     "sticky",
        top:          0,
        zIndex:       40,
      }}
    >
      {/* ── Sidebar toggle ─────────────────────────────── */}
      <button
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          width:          32,
          height:         32,
          borderRadius:   "8px",
          border:         "1.5px solid rgba(255,255,255,0.12)",
          background:     "rgba(255,255,255,0.06)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          cursor:         "pointer",
          flexShrink:     0,
          color:          "rgba(255,255,255,0.55)",
          transition:     "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background  = "rgba(255,255,255,0.12)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
          e.currentTarget.style.color       = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background  = "rgba(255,255,255,0.06)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          e.currentTarget.style.color       = "rgba(255,255,255,0.55)";
        }}
      >
        {collapsed
          ? <PanelLeftOpen  size={15} />
          : <PanelLeftClose size={15} />}
      </button>

      {/* ── Spacer ─────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── User dropdown ──────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         "8px",
            padding:     "5px 10px",
            borderRadius:"8px",
            border:      "1.5px solid rgba(255,255,255,0.12)",
            background:  "rgba(255,255,255,0.07)",
            cursor:      "pointer",
            outline:     "none",
            transition:  "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background  = "rgba(255,255,255,0.12)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background  = "rgba(255,255,255,0.07)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
        >
          {/* Avatar */}
          <div style={{
            width:          32,
            height:         32,
            borderRadius:   "50%",
            flexShrink:     0,
            background:     "linear-gradient(135deg,#1a7fba,#2496d6)",
            boxShadow:      "0 2px 8px rgba(26,127,186,0.4)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "white", lineHeight: 1 }}>
              {initial}
            </span>
          </div>

          {/* Name */}
          <div style={{ textAlign: "left" }}>
            <p style={{
              fontSize:     "13px",
              fontWeight:   700,
              color:        "white",
              lineHeight:   1.2,
              maxWidth:     110,
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}>
              {userName}
            </p>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
              Administrator
            </p>
          </div>

          <ChevronDown size={13} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
        </DropdownMenuTrigger>

        {/* ── Dropdown panel ── */}
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          style={{
            width:        "216px",
            background:   "white",
            border:       "1.5px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow:    "0 8px 30px rgba(0,0,0,0.12)",
            padding:      "4px",
          }}
        >
          {/* User info header */}
          <div style={{ padding: "10px 12px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width:          36,
                height:         36,
                borderRadius:   "50%",
                flexShrink:     0,
                background:     "linear-gradient(135deg,#1a7fba,#2496d6)",
                boxShadow:      "0 2px 8px rgba(26,127,186,0.3)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "white", lineHeight: 1 }}>
                  {initial}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize:     "13px",
                  fontWeight:   700,
                  color:        "#1e293b",
                  lineHeight:   1.3,
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                }}>
                  {userName}
                </p>
                <p style={{
                  fontSize:     "10px",
                  color:        "#94a3b8",
                  marginTop:    "1px",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                }}>
                  {userEmail}
                </p>
              </div>
            </div>

            {/* Role badge */}
            <div style={{ marginTop: "8px" }}>
              <span style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "4px",
                fontSize:       "9px",
                fontWeight:     800,
                textTransform:  "uppercase",
                letterSpacing:  "0.1em",
                color:          "#d97706",
                background:     "#fffbeb",
                border:         "1px solid #fcd34d",
                padding:        "3px 8px",
                borderRadius:   "999px",
              }}>
                <ShieldCheck size={9} strokeWidth={3} />
                Administrator
              </span>
            </div>
          </div>

          <DropdownMenuSeparator style={{ background: "#f1f5f9", margin: "2px 0" }} />

          {/* Dashboard */}
          <DropdownMenuItem
            style={{ padding: 0, background: "transparent", cursor: "pointer" }}
            onSelect={(e) => e.preventDefault()}
          >
            <Link
              href="/admin"
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            "10px",
                width:          "100%",
                padding:        "8px 12px",
                borderRadius:   "8px",
                textDecoration: "none",
                fontSize:       "13px",
                fontWeight:     600,
                color:          "#334155",
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: "7px", background: "#edf7fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Home size={12} style={{ color: "#1a7fba" }} />
              </div>
              Dashboard
            </Link>
          </DropdownMenuItem>

          {/* Employee view */}
          <DropdownMenuItem
            style={{ padding: 0, background: "transparent", cursor: "pointer" }}
            onSelect={(e) => e.preventDefault()}
          >
            <Link
              href="/employee"
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            "10px",
                width:          "100%",
                padding:        "8px 12px",
                borderRadius:   "8px",
                textDecoration: "none",
                fontSize:       "13px",
                fontWeight:     600,
                color:          "#334155",
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: "7px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Monitor size={12} style={{ color: "#16a34a" }} />
              </div>
              Employee view
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator style={{ background: "#f1f5f9", margin: "2px 0" }} />

          {/* Sign out */}
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "10px",
              padding:      "8px 12px",
              borderRadius: "8px",
              fontSize:     "13px",
              fontWeight:   600,
              color:        "#e11d48",
              cursor:       "pointer",
            }}
          >
            <div style={{ width: 24, height: 24, borderRadius: "7px", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <LogOut size={12} style={{ color: "#e11d48" }} />
            </div>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}