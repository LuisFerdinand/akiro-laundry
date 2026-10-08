// components/employee/layout/SideRail.tsx
// Tablet navigation (md+). A fixed rail on the left keeps every screen one tap
// away and gives the content the full height of a landscape tablet — the phone
// TopBar + BottomNav would eat ~125px of it.
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrinterStatusButton } from "@/components/employee/PrinterStatusButton";
import { NAV_ITEMS, isNavActive } from "./nav-items";
import { UserMenu } from "./UserMenu";

export function SideRail() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-22 flex-col items-center py-5 bg-white/90 backdrop-blur-xl border-r border-blue-100/70 shadow-[4px_0_24px_rgba(26,127,186,0.06)]">
      <Link href="/employee" aria-label="Akiro home" className="mb-5 flex flex-col items-center gap-1 select-none">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 border border-blue-200 flex items-center justify-center shadow-sm">
          <Image src="/logo/2.png" alt="" width={28} height={28} className="object-contain" priority />
        </span>
        <span className="font-display text-[11px] font-extrabold tracking-tight text-[#0f2744]">Akiro</span>
      </Link>

      <nav className="flex w-full flex-col items-center gap-1.5 px-2">
        {NAV_ITEMS.map((item) => {
          const { href, label, icon: Icon, isCTA } = item;
          const active = isNavActive(item, pathname);

          if (isCTA) {
            return (
              <Link key={href} href={href} className="group my-2 flex flex-col items-center gap-1">
                <span
                  className="flex w-13 h-13 items-center justify-center rounded-[18px] text-white transition-transform group-active:scale-90"
                  style={{
                    background: active
                      ? "linear-gradient(145deg, #0f5a85, #1a7fba)"
                      : "linear-gradient(145deg, #2496d6, #1a7fba, #0f5a85)",
                    boxShadow: "0 6px 20px rgba(26,127,186,0.45), 0 2px 6px rgba(26,127,186,0.2)",
                  }}
                >
                  <Icon size={24} strokeWidth={2.5} />
                </span>
                <span className="text-[11px] font-black tracking-wide text-brand">New order</span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors ${
                active ? "bg-brand-soft" : "hover:bg-slate-50"
              }`}
            >
              {active && <span className="absolute -left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.9}
                className={active ? "text-brand" : "text-slate-400 group-hover:text-slate-600"}
              />
              <span className={`text-[11px] font-black tracking-wide ${active ? "text-brand" : "text-slate-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <PrinterStatusButton variant="rail" />
        <UserMenu side="right" align="end" sideOffset={14} size={40} />
      </div>
    </aside>
  );
}
