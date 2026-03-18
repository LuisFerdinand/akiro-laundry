/* eslint-disable @typescript-eslint/no-explicit-any */
// components/employee/layout/TopBar.tsx
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
import { Home, LogOut, User, ShieldCheck } from "lucide-react";
import type { UserRole } from "@/lib/db/schema";

export function TopBar() {
  const { data: session } = useSession();

  const userName  = session?.user?.name  ?? "Staff";
  const userEmail = session?.user?.email ?? "";
  const userRole  = ((session?.user as any)?.role ?? "employee") as UserRole;
  const initial   = userName.charAt(0).toUpperCase();
  const isAdmin   = userRole === "admin";

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-100/60">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">

        {/* Logo */}
        <Link href="/employee" className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-sky-50 to-blue-100 border border-blue-200 flex items-center justify-center shadow-sm">
            <Image src="/logo/2.png" alt="Akiro" width={20} height={20} className="object-contain" priority />
          </div>
          <div className="leading-none">
            <p className="font-extrabold text-[15px] tracking-tight text-[#0f2744]" style={{ fontFamily: "Sora, sans-serif" }}>
              Akiro
            </p>
            <p className="text-[8px] tracking-[0.2em] uppercase font-bold mt-[2px] text-blue-400/70">
              Laundry &amp; Perfume
            </p>
          </div>
        </Link>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-black text-[13px] cursor-pointer transition-transform active:scale-95"
              style={{
                fontFamily: "Sora, sans-serif",
                background: "linear-gradient(145deg, #2496d6, #1a7fba)",
                boxShadow: "0 3px 10px rgba(26,127,186,0.38)",
              }}
            >
              {initial}
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-52 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60 p-1"
          >
            {/* User info */}
            <div className="px-3 py-2.5 mb-1">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-black text-xs shrink-0"
                  style={{ background: "linear-gradient(145deg, #2496d6, #1a7fba)" }}
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[13px] text-slate-800 truncate leading-tight">{userName}</p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{userEmail}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50">
                <User size={10} strokeWidth={3} />
                {userRole}
              </span>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 mx-1" />

            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="p-0 rounded-xl cursor-pointer"
            >
              <Link
                href="/"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-700 font-semibold text-[13px]"
              >
                <Home size={13} className="text-blue-500" />
                Home Page
              </Link>
            </DropdownMenuItem>

            {isAdmin && (
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="p-0 rounded-xl cursor-pointer"
              >
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-amber-600 font-semibold text-[13px]"
                >
                  <ShieldCheck size={13} className="text-amber-500" />
                  Admin console
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-slate-100 mx-1" />

            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer font-semibold text-[13px] text-rose-500"
            >
              <LogOut size={13} className="text-rose-400" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}