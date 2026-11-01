// components/admin/layout/AdminBottomNav.tsx
"use client";
//
// Phone navigation for the admin console (below md the sidebar is hidden). Four
// pinned pages — Dashboard, Orders, Customers, Buku Kecil — plus "More", a
// bottom sheet with every other page, so the whole console stays reachable.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, LogOut, Menu, Monitor, ShieldCheck, X } from "lucide-react";
import {
  MOBILE_PRIMARY, MOBILE_PRIMARY_HREFS, NAV_GROUPS, isNavActive, type NavItem,
} from "./nav-config";

interface Props {
  userName:  string;
  userEmail: string;
}

const BRAND = "#1a7fba";
const MUTED = "#8b9bab";

/** The sheet lists everything not already in the bar; the 10 CMS pages collapse into their overview. */
const SHEET_GROUPS = NAV_GROUPS
  .map((g) => ({
    label: g.label,
    items: (g.label === "Content" ? g.items.slice(0, 1) : g.items)
      .filter((i) => !(MOBILE_PRIMARY_HREFS as readonly string[]).includes(i.href)),
  }))
  .filter((g) => g.items.length > 0);

export function AdminBottomNav({ userName, userEmail }: Props) {
  const pathname = usePathname();
  // The sheet is "open for" the page it was opened on, so navigating anywhere
  // closes it without an effect; Escape closes it too.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open    = openFor === pathname;
  const setOpen = (next: boolean | ((v: boolean) => boolean)) =>
    setOpenFor((cur) => ((typeof next === "function" ? next(cur === pathname) : next) ? pathname : null));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenFor(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const primaryActive = MOBILE_PRIMARY.some((i) => isNavActive(pathname, i.href, i.exact));
  const moreActive = open || !primaryActive;

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex h-16 max-w-xl items-stretch px-1.5">
          {MOBILE_PRIMARY.map((item) => (
            <Tab key={item.href} item={item} active={!open && isNavActive(pathname, item.href, item.exact)} />
          ))}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            className="flex flex-1 flex-col items-center justify-center gap-1 active:scale-95"
          >
            <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${moreActive ? "bg-sky-50" : ""}`}>
              <Menu size={19} strokeWidth={moreActive ? 2.5 : 1.9} style={{ color: moreActive ? BRAND : MUTED }} />
            </span>
            <span className="text-[10px] font-extrabold tracking-wide" style={{ color: moreActive ? BRAND : MUTED }}>More</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="All pages">
          <button
            type="button" aria-label="Close menu" onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />

            <div className="flex items-center gap-3 px-5 pb-3 pt-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#1a7fba,#2496d6)" }}
              >
                {userName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold text-slate-900">{userName}</p>
                <p className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <ShieldCheck size={11} strokeWidth={2.8} /> Administrator
                  {userEmail && <span className="truncate font-semibold text-slate-400"> · {userEmail}</span>}
                </p>
              </div>
              <button
                type="button" onClick={() => setOpen(false)} aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {SHEET_GROUPS.map((group) => (
                <section key={group.label} className="mb-4">
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{group.label}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map((item) => (
                      <SheetTile key={item.href} item={item} active={isNavActive(pathname, item.href, item.exact)} />
                    ))}
                  </div>
                </section>
              ))}

              <section className="mb-1 grid grid-cols-2 gap-2">
                <Link href="/" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-50 text-[12.5px] font-bold text-slate-600 ring-1 ring-slate-200 active:scale-95">
                  <Home size={14} /> Home page
                </Link>
                <Link href="/employee" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-[12.5px] font-bold text-emerald-700 ring-1 ring-emerald-200 active:scale-95">
                  <Monitor size={14} /> Employee view
                </Link>
                <button
                  type="button" onClick={() => signOut({ callbackUrl: "/login" })}
                  className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-50 text-[12.5px] font-extrabold text-rose-600 ring-1 ring-rose-200 active:scale-95"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className="flex flex-1 flex-col items-center justify-center gap-1 active:scale-95">
      <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-sky-50" : ""}`}>
        <Icon size={19} strokeWidth={active ? 2.5 : 1.9} style={{ color: active ? BRAND : MUTED }} />
      </span>
      <span className="text-[10px] font-extrabold tracking-wide" style={{ color: active ? BRAND : MUTED }}>{item.label}</span>
    </Link>
  );
}

function SheetTile({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 py-2.5 text-center ring-1 transition active:scale-95 ${
        active ? "bg-sky-50 ring-sky-300" : "bg-slate-50 ring-slate-200/80"
      }`}
    >
      <Icon size={19} strokeWidth={2} style={{ color: active ? BRAND : "#64748b" }} />
      <span className={`text-[11px] font-bold leading-tight ${active ? "text-sky-700" : "text-slate-600"}`}>{item.label}</span>
    </Link>
  );
}
