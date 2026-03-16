// components/public/Navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Services",     href: "#services"      },
  { label: "How It Works", href: "#how-it-works"  },
  { label: "Testimonials", href: "#testimonials"  },
  { label: "Contact",      href: "#contact"       },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-[#1a7fba]/10 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between">

        {/* ── Logo ── */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo/2.png"
            alt="Akiro Laundry Logo"
            width={38}
            height={38}
            className="rounded-[14px]"
            priority
          />
          <span
            className="font-display font-extrabold text-[17px] tracking-tight"
            style={{ color: "#0f5a85" }}
          >
            Akiro{" "}
            <span style={{ color: "#1a7fba" }}>Laundry</span>
          </span>
        </div>

        {/* ── Desktop links ── */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm font-semibold text-[#607080] hover:text-[#1a7fba] transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* ── Desktop CTA ── */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-bold text-[#1a7fba] hover:text-[#0f5a85] transition-colors"
          >
            Sign In
          </Link>
          <a
            href="#contact"
            className="text-sm font-bold text-white px-4 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #2496d6 0%, #1a7fba 100%)",
              boxShadow: "0 4px 14px rgba(26,127,186,0.35)",
            }}
          >
            Order Pickup
          </a>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-[5px]"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span
            className={`w-5 h-0.5 bg-[#1a7fba] rounded transition-all duration-300 origin-center ${
              menuOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-[#1a7fba] rounded transition-all duration-300 ${
              menuOpen ? "opacity-0 scale-x-0" : ""
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-[#1a7fba] rounded transition-all duration-300 origin-center ${
              menuOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-400 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}
      >
        <div className="px-6 py-5 flex flex-col gap-4 border-t border-[#e8f4fb]">
          {NAV_LINKS.map(({ label, href }) => (
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
            <Link
              href="/login"
              className="flex-1 text-sm font-bold text-[#1a7fba] border-2 border-[#c8e9f8] py-2.5 rounded-xl text-center"
            >
              Sign In
            </Link>
            <a
              href="#contact"
              className="flex-1 text-sm font-bold text-white py-2.5 rounded-xl text-center"
              style={{ background: "linear-gradient(135deg, #2496d6, #1a7fba)" }}
            >
              Order Pickup
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}