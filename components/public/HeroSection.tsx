// components/public/HeroSection.tsx
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { CmsHero, CmsHeroStat } from "@/lib/db/schema/cms";

type HeroData = (CmsHero & { stats: CmsHeroStat[] }) | null;

const STEPS = ["Pickup", "Wash", "Dry", "Deliver"];

export default function HeroSection({ data }: { data: HeroData }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items = [contentRef.current, cardRef.current];
    items.forEach((el, i) => {
      if (!el) return;
      el.style.opacity   = "0";
      el.style.transform = "translateY(28px)";
      setTimeout(() => {
        el.style.transition = "opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1)";
        el.style.opacity    = "1";
        el.style.transform  = "translateY(0)";
      }, 120 + i * 160);
    });
  }, []);

  const badge            = data?.badge            ?? "Open Today · 08:00 – 20:00";
  const headline         = data?.headline         ?? "Fresh Laundry,";
  const headlineAccent   = data?.headlineAccent   ?? "Delivered";
  const headlineSuffix   = data?.headlineSuffix   ?? "to Your Door.";
  const subtext          = data?.subtext          ?? "";
  const primaryCtaLabel  = data?.primaryCtaLabel  ?? "Order a Pickup";
  const primaryCtaHref   = data?.primaryCtaHref   ?? "#contact";
  const secondaryCtaLabel = data?.secondaryCtaLabel ?? "View Services";
  const secondaryCtaHref  = data?.secondaryCtaHref  ?? "#services";
  const heroImageUrl     = data?.heroImageUrl     ?? null;
  const heroImageAlt     = data?.heroImageAlt     ?? "Laundry service";
  const stats            = data?.stats            ?? [];

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden pt-20"
      style={{ background: "linear-gradient(155deg, #f5fbff 0%, #edf7fd 45%, #dff5f0 100%)" }}
    >
      {/* Background orbs */}
      <div className="absolute pointer-events-none" style={{ width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,233,248,0.45) 0%, transparent 65%)", top: -160, right: -140, animation: "heroOrb1 10s ease-in-out infinite" }} />
      <div className="absolute pointer-events-none" style={{ width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(62,203,154,0.14) 0%, transparent 65%)", bottom: 40, left: -80, animation: "heroOrb2 14s ease-in-out infinite" }} />
      <div className="absolute pointer-events-none" style={{ width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,204,0,0.1) 0%, transparent 65%)", top: "40%", left: "38%", animation: "heroOrb3 18s ease-in-out infinite" }} />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #1a7fba18 1px, transparent 1px)", backgroundSize: "36px 36px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)" }} />

      <div className="relative max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center w-full">

        {/* Left: copy */}
        <div ref={contentRef}>
          <div className="inline-flex items-center gap-2 bg-white/70 border border-[#c8e9f8] rounded-full px-4 py-2 mb-7 backdrop-blur-sm shadow-sm">
            <span className="akiro-dot" />
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-wide uppercase">
              {badge}
            </span>
          </div>

          <h1
            className="font-display font-extrabold leading-[1.12] mb-6"
            style={{ fontSize: "clamp(2.1rem, 5vw, 3.5rem)", color: "#0a1f2e" }}
          >
            {headline}{" "}
            <br className="hidden sm:block" />
            <span style={{ background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 50%, #0f5a85 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {headlineAccent}
            </span>{" "}
            {headlineSuffix}
          </h1>

          <p className="text-base font-medium text-[#4e6575] leading-relaxed mb-9 max-w-[420px]">
            {subtext}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 mb-12">
            <a
              href={primaryCtaHref}
              className="inline-flex items-center gap-2.5 font-extrabold text-white text-sm px-7 py-3.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{ background: "linear-gradient(135deg, #2496d6 0%, #1a7fba 50%, #0f5a85 100%)", boxShadow: "0 8px 28px rgba(26,127,186,0.40)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {primaryCtaLabel}
            </a>
            <a
              href={secondaryCtaHref}
              className="inline-flex items-center gap-2 font-extrabold text-[#1a7fba] text-sm px-7 py-3.5 rounded-2xl bg-white border-2 border-[#c8e9f8] hover:border-[#1a7fba]/40 hover:shadow-md transition-all duration-200"
            >
              {secondaryCtaLabel}
            </a>
          </div>

          {/* Stats */}
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-8">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <div className="font-display font-extrabold text-2xl" style={{ color: "#1a7fba" }}>
                    {value}
                  </div>
                  <div className="text-[11px] font-bold text-[#8ca0b0] uppercase tracking-widest mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: image or illustrated card */}
        <div
          ref={cardRef}
          className="hidden md:flex justify-center items-center relative"
          style={{ height: 480 }}
        >
          {heroImageUrl ? (
            /* CMS image uploaded */
            <div className="relative w-full h-full rounded-[32px] overflow-hidden shadow-2xl">
              <Image
                src={heroImageUrl}
                alt={heroImageAlt}
                fill
                className="object-cover"
                priority
              />
            </div>
          ) : (
            /* Fallback illustrated card (original design) */
            <>
              <div className="absolute" style={{ width: 300, height: 360, borderRadius: 32, background: "linear-gradient(145deg, #c8e9f8 0%, #dff5eb 100%)", transform: "rotate(-8deg) translate(-18px, 14px)", boxShadow: "0 20px 50px rgba(26,127,186,0.14)" }} />
              <div className="absolute" style={{ width: 300, height: 360, borderRadius: 32, background: "linear-gradient(145deg, #edf7fd 0%, #f5fbff 100%)", transform: "rotate(-3deg)", boxShadow: "0 16px 40px rgba(26,127,186,0.10)", border: "1.5px solid #c8e9f8" }} />

              <div className="absolute flex flex-col items-center" style={{ width: 300, height: 360, borderRadius: 32, background: "white", boxShadow: "0 28px 70px rgba(26,127,186,0.20), 0 4px 16px rgba(0,0,0,0.06)", border: "1.5px solid #e0f0fa", padding: "28px 24px", gap: 18 }}>
                <div style={{ width: 100, height: 100, borderRadius: 32, background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)", border: "1.5px solid #b6def5", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(26,127,186,0.14)" }}>
                  <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
                    <rect x="8" y="8" width="48" height="48" rx="12" fill="#dbeef9"/>
                    <rect x="12" y="12" width="40" height="40" rx="9" fill="white"/>
                    <circle cx="32" cy="34" r="13" stroke="#1a7fba" strokeWidth="2.2" fill="none"/>
                    <circle cx="32" cy="34" r="6" fill="#1a7fba" opacity="0.15"/>
                    <path d="M26 34 a6 6 0 0 1 6-6" stroke="#1a7fba" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="14" y="16" width="10" height="4" rx="2" fill="#c8e9f8"/>
                    <circle cx="46" cy="18" r="2.5" fill="#ffcc00"/>
                    <circle cx="40" cy="18" r="2.5" fill="#3ecb9a"/>
                  </svg>
                </div>

                <div className="text-center">
                  <div className="font-display font-extrabold text-[17px]" style={{ color: "#0a1f2e" }}>Order #AK-2847</div>
                  <div className="text-xs font-semibold text-[#8ca0b0] mt-1">Currently being washed ✦</div>
                </div>

                <div className="w-full">
                  <div className="flex justify-between text-[10px] font-bold text-[#8ca0b0] uppercase tracking-wider mb-1.5">
                    <span>Progress</span><span>50%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#edf7fd] overflow-hidden">
                    <div style={{ height: "100%", width: "50%", borderRadius: 999, background: "linear-gradient(90deg, #2496d6, #1a7fba)", animation: "barGrow 1.6s cubic-bezier(0.22,1,0.36,1) 0.8s both" }} />
                  </div>
                </div>

                <div className="flex justify-between w-full">
                  {STEPS.map((step, i) => (
                    <div key={step} className="flex flex-col items-center gap-1.5">
                      <div style={{ width: 28, height: 28, borderRadius: 9, background: i < 2 ? "#1a7fba" : "#edf7fd", border: `1.5px solid ${i < 2 ? "#1a7fba" : "#c8e9f8"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {i < 2 ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#b6def5" }} />
                        )}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: i < 2 ? "#1a7fba" : "#b0c4d0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{step}</span>
                    </div>
                  ))}
                </div>

                <div style={{ width: "100%", background: "linear-gradient(135deg, #edf7fd, #dff5eb)", border: "1.5px solid #c8e9f8", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#8ca0b0", textTransform: "uppercase", letterSpacing: "0.08em" }}>Est. Delivery</div>
                    <div className="font-display font-extrabold" style={{ fontSize: 13, color: "#0f5a85", marginTop: 2 }}>Today, 18:30</div>
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: "#3ecb9a22", border: "1.5px solid #3ecb9a44", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 6v6l4 2" stroke="#3ecb9a" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="9" stroke="#3ecb9a" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute" style={{ top: 30, right: -10, background: "white", borderRadius: 16, padding: "8px 14px", boxShadow: "0 8px 24px rgba(26,127,186,0.16)", border: "1.5px solid #e0f0fa", animation: "floatBadge1 4s ease-in-out infinite" }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16 }}>✓</span>
                  <span className="font-extrabold" style={{ fontSize: 11, color: "#0f5a85" }}>Order Confirmed</span>
                </div>
              </div>
              <div className="absolute" style={{ bottom: 60, left: -20, background: "white", borderRadius: 16, padding: "8px 14px", boxShadow: "0 8px 24px rgba(62,203,154,0.18)", border: "1.5px solid #b8f0df", animation: "floatBadge2 5s ease-in-out infinite" }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14 }}>🚚</span>
                  <span className="font-extrabold" style={{ fontSize: 11, color: "#1a7070" }}>Free delivery</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes heroOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,30px) scale(1.06)} }
        @keyframes heroOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-16px,-24px) scale(1.05)} }
        @keyframes heroOrb3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(10px,-18px)} }
        @keyframes barGrow  { from{width:0} to{width:50%} }
        @keyframes floatBadge1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes floatBadge2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(8px)} }
      `}</style>
    </section>
  );
}