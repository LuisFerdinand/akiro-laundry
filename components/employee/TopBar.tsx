/* eslint-disable @typescript-eslint/no-explicit-any */
// components/employee/TopBar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, LogOut, ChevronDown, User, ShieldCheck } from "lucide-react";
import type { UserRole } from "@/lib/db/schema";

export function TopBar() {
  const { data: session } = useSession();

  const userName  = session?.user?.name  ?? "Staff";
  const userEmail = session?.user?.email ?? "";
  const userRole  = ((session?.user as any)?.role ?? "employee") as UserRole;
  const initial   = userName.charAt(0).toUpperCase();
  const isAdmin   = userRole === "admin";

  return (
    <header className="akiro-topbar sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">

        {/* ── Logo ───────────────────────────────────────────── */}
        <Link href="/employee" className="flex items-center gap-2.5 select-none">
            <Image
              src="/logo/2.png"
              alt="Akiro logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          <div className="leading-none">
            <p
              className="font-extrabold text-[15px] tracking-tight"
              style={{ fontFamily: "Sora, sans-serif", color: "#0f2744" }}
            >
              Akiro
            </p>
            <p
              className="text-[8.5px] tracking-[0.2em] uppercase font-semibold mt-[2px]"
              style={{ color: "rgba(26,127,186,0.55)" }}
            >
              Laundry &amp; Perfume
            </p>
          </div>
        </Link>

        {/* ── User dropdown ───────────────────────────────────── */}
        <DropdownMenu>
          {/* Trigger — plain button, no asChild */}
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-2.5 py-1.5 transition-all duration-150 border border-gray-300 rounded-md"
            onMouseEnter={(e) => {
              e.currentTarget.style.background   = "rgba(26,127,186,0.12)";
              e.currentTarget.style.borderColor  = "rgba(26,127,186,0.28)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background   = "rgba(26,127,186,0.07)";
              e.currentTarget.style.borderColor  = "rgba(26,127,186,0.14)";
            }}
          >
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: 26, height: 26,
                background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)",
                boxShadow: "0 2px 6px rgba(26,127,186,0.35)",
              }}
            >
              <span className="font-black text-white leading-none" style={{ fontSize: "11px" }}>
                {initial}
              </span>
            </div>

            {/* Name */}
            <span
              className="hidden sm:block font-bold text-[12px] leading-none max-w-[80px] truncate"
              style={{ color: "#0f2744" }}
            >
              {userName}
            </span>

            <ChevronDown size={12} strokeWidth={2.5} style={{ color: "rgba(26,127,186,0.6)", flexShrink: 0 }} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            style={{
              width: "208px",
              background: "white",
              border: "1.5px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.10)",
              padding: "4px",
            }}
          >
            {/* ── User info header — plain div, avoids base-ui MenuGroupLabel conflict ── */}
            <div style={{ padding: "10px 12px 8px" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center rounded-lg shrink-0"
                  style={{
                    width: 32, height: 32,
                    background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)",
                    boxShadow: "0 2px 6px rgba(26,127,186,0.3)",
                  }}
                >
                  <span className="font-black text-white text-xs leading-none">{initial}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[13px] text-slate-800 truncate leading-tight">
                    {userName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    {userEmail}
                  </p>
                </div>
              </div>

              {/* Role badge */}
              <div className="mt-2">
                <span
                  className="inline-flex items-center justify-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary "
                >
                  <User size={12} strokeWidth={3} />
                  {userRole}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator style={{ background: "#f1f5f9", margin: "2px 0" }} />

            {/* ── Home ── */}
            <DropdownMenuItem
              style={{ padding: 0, background: "transparent", cursor: "pointer" }}
              onSelect={(e) => e.preventDefault()}
            >
              <Link
                href="/employee"
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-slate-700 font-semibold text-[13px]"
                style={{ textDecoration: "none" }}
              >
                <Home size={12} style={{ color: "#1a7fba" }} />
                Home
              </Link>
            </DropdownMenuItem>

            {/* ── Admin console — only shown for admin role ── */}
            {isAdmin && (
              <DropdownMenuItem
                style={{ padding: 0, background: "transparent", cursor: "pointer" }}
                onSelect={(e) => e.preventDefault()}
              >
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg font-semibold text-[13px]"
                  style={{ color: "#d97706", textDecoration: "none" }}
                >
                  <ShieldCheck size={12} style={{ color: "#d97706" }} />
                  Admin console
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator style={{ background: "#f1f5f9", margin: "2px 0" }} />

            {/* ── Sign out ── */}
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer font-semibold text-[13px]"
              style={{ color: "#e11d48" }}
            >
              <LogOut size={12} style={{ color: "#e11d48" }} />
              Sign out
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}