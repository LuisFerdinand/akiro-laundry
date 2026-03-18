/* eslint-disable react-hooks/static-components */
// components/public/NavbarClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CmsNavbar, CmsNavLink } from "@/lib/db/schema/cms";
import type { UserRole } from "@/lib/db/schema";

type NavbarData = (CmsNavbar & { links: CmsNavLink[] }) | null;

interface Props {
  data:          NavbarData;
  dashboardHref: string | null; // "/admin" | "/employee" | null (not logged in)
  role:          UserRole | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin:    "Admin Panel",
  employee: "Dashboard",
};

export default function NavbarClient({ data, dashboardHref, role }: Props) {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const brandName = data?.brandName ?? "Akiro Laundry";
  const logoUrl   = data?.logoUrl   ?? null;
  const logoAlt   = data?.logoAlt   ?? "Akiro Laundry Logo";
  const ctaLabel  = data?.ctaLabel  ?? "Book Now";
  const ctaHref   = data?.ctaHref   ?? "#contact";
  const links     = data?.links     ?? [];

  // ── Auth link helpers ──────────────────────────────────────────────────────
  // Desktop: if logged in show "Go to Dashboard / Admin Panel", else "Sign In"
  // Mobile:  same but full-width button style

  const AuthDesktop = () =>
    dashboardHref ? (
      <Link
        href={dashboardHref}
        className="text-sm font-bold text-[#1a7fba] hover:text-[#0f5a85] transition-colors flex items-center gap-1.5"
      >
        {/* Dot indicator */}
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "#3ecb9a", boxShadow: "0 0 0 3px #3ecb9a33" }}
        />
        {ROLE_LABEL[role ?? ""] ?? "Dashboard"}
      </Link>
    ) : (
      <Link
        href="/login"
        className="text-sm font-bold text-[#1a7fba] hover:text-[#0f5a85] transition-colors"
      >
        Sign In
      </Link>
    );

  const AuthMobile = () =>
    dashboardHref ? (
      <Link
        href={dashboardHref}
        className="flex-1 text-sm font-bold text-white py-2.5 rounded-xl text-center"
        style={{ background: "linear-gradient(135deg, #3ecb9a, #10b981)" }}
        onClick={() => setMenuOpen(false)}
      >
        {ROLE_LABEL[role ?? ""] ?? "Dashboard"}
      </Link>
    ) : (
      <Link
        href="/login"
        className="flex-1 text-sm font-bold text-[#1a7fba] border-2 border-[#c8e9f8] py-2.5 rounded-xl text-center"
        onClick={() => setMenuOpen(false)}
      >
        Sign In
      </Link>
    );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-[#1a7fba]/10 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between">

        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image src={logoUrl} alt={logoAlt} width={38} height={38} className="rounded-[14px]" priority />
          ) : (
            <Image src="/logo/2.png" alt={logoAlt} width={38} height={38} className="rounded-[14px]" priority />
          )}
          <span
            className="font-display font-extrabold text-[17px] tracking-tight"
            style={{ color: "#0f5a85" }}
          >
            {brandName.split(" ")[0]}{" "}
            <span style={{ color: "#1a7fba" }}>
              {brandName.split(" ").slice(1).join(" ")}
            </span>
          </span>
        </div>

        {/* ── Desktop nav links ─────────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-7">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm font-semibold text-[#607080] hover:text-[#1a7fba] transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* ── Desktop right side ────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          <AuthDesktop />
          <a
            href={ctaHref}
            className="text-sm font-bold text-white px-4 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #2496d6 0%, #1a7fba 100%)",
              boxShadow:  "0 4px 14px rgba(26,127,186,0.35)",
            }}
          >
            {ctaLabel}
          </a>
        </div>

        {/* ── Mobile hamburger ─────────────────────────────────────────────── */}
        <button
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-[5px]"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`w-5 h-0.5 bg-[#1a7fba] rounded transition-all duration-300 origin-center ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
          <span className={`w-5 h-0.5 bg-[#1a7fba] rounded transition-all duration-300 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
          <span className={`w-5 h-0.5 bg-[#1a7fba] rounded transition-all duration-300 origin-center ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-400 ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}
      >
        <div className="px-6 py-5 flex flex-col gap-4 border-t border-[#e8f4fb]">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm font-semibold text-[#607080]"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <div className="flex gap-3 pt-2 border-t border-[#e8f4fb]">
            <AuthMobile />
            <a
              href={ctaHref}
              className="flex-1 text-sm font-bold text-white py-2.5 rounded-xl text-center"
              style={{ background: "linear-gradient(135deg, #2496d6, #1a7fba)" }}
              onClick={() => setMenuOpen(false)}
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}