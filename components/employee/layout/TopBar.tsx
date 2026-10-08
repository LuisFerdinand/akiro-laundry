// components/employee/layout/TopBar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { PrinterStatusButton } from "@/components/employee/PrinterStatusButton";
import { UserMenu } from "./UserMenu";

/** Phone header — tablets (md+) get the logo, printer and account menu in the SideRail. */
export function TopBar() {
  return (
    <header className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-100/60">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-lg sm:max-w-2xl mx-auto">

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

        <div className="flex items-center gap-2.5">
          <PrinterStatusButton />
          <UserMenu />
        </div>

      </div>
    </header>
  );
}
