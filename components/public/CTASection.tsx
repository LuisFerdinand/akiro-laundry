// components/public/CTASection.tsx
"use client";

import { useEffect, useRef } from "react";
import type { CmsCtaSection, CmsContactItem } from "@/lib/db/schema/cms";

// Icon map for the four known icon types
function ContactIcon({ type }: { type: string }) {
  switch (type) {
    case "phone":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .95.68l1.45 4.07a1 1 0 0 1-.23 1.04L8.5 10.5s1.45 3.3 5 5l1.7-1.97a1 1 0 0 1 1.04-.23l4.07 1.45a1 1 0 0 1 .69.95V19a2 2 0 0 1-2 2C8.16 21 3 12.84 3 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "email":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "location":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "hours":
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function CTASection({
  cta,
  contactItems,
}: {
  cta: CmsCtaSection | null;
  contactItems: CmsContactItem[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.style.opacity   = "1";
          section.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    section.style.opacity   = "0";
    section.style.transform = "translateY(28px)";
    section.style.transition = "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)";
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const badge             = cta?.badge             ?? "Ready to Get Started?";
  const headline          = cta?.headline          ?? "Book Your First Pickup";
  const headlineAccent    = cta?.headlineAccent    ?? "Free of Charge";
  const subtext           = cta?.subtext           ?? "";
  const primaryCtaLabel   = cta?.primaryCtaLabel   ?? "Call Now";
  const primaryCtaHref    = cta?.primaryCtaHref    ?? "tel:+67077230001";
  const secondaryCtaLabel = cta?.secondaryCtaLabel ?? "WhatsApp";
  const secondaryCtaHref  = cta?.secondaryCtaHref  ?? "https://wa.me/67077230001";

  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">

        {/* Main CTA banner */}
        <div
          ref={sectionRef}
          className="relative rounded-[32px] overflow-hidden p-10 md:p-16 mb-12"
          style={{ background: "linear-gradient(145deg, #1a7fba 0%, #2496d6 50%, #0f5a85 100%)", boxShadow: "0 24px 70px rgba(26,127,186,0.45)" }}
        >
          {/* Orbs */}
          <div className="absolute pointer-events-none" style={{ width: 380, height: 380, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -120, right: -80 }} />
          <div className="absolute pointer-events-none" style={{ width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: -60, left: 60 }} />
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

          <div className="relative md:flex items-center justify-between gap-10">
            <div className="mb-8 md:mb-0">
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-5 backdrop-blur-sm">
                <span className="akiro-dot" style={{ background: "#ffcc00", boxShadow: "0 0 0 3px #ffcc0033" }} />
                <span className="text-xs font-extrabold text-white tracking-widest uppercase">{badge}</span>
              </div>

              <h2 className="font-display font-extrabold leading-tight text-white mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
                {headline}
                <br />
                <span style={{ color: "#a8dbf8" }}>{headlineAccent}</span>
              </h2>

              <p className="text-[15px] font-medium text-white/75 leading-relaxed max-w-md">{subtext}</p>
            </div>

            <div className="flex flex-col gap-3 flex-shrink-0">
              <a
                href={primaryCtaHref}
                className="inline-flex items-center justify-center gap-2.5 font-extrabold text-[#0f5a85] bg-white text-sm px-8 py-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl whitespace-nowrap"
                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .95.68l1.45 4.07a1 1 0 0 1-.23 1.04L8.5 10.5s1.45 3.3 5 5l1.7-1.97a1 1 0 0 1 1.04-.23l4.07 1.45a1 1 0 0 1 .69.95V19a2 2 0 0 1-2 2C8.16 21 3 12.84 3 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                {primaryCtaLabel}
              </a>
              <a
                href={secondaryCtaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 font-extrabold text-white bg-white/15 border border-white/30 text-sm px-8 py-4 rounded-2xl backdrop-blur-sm transition-all duration-200 hover:bg-white/25 whitespace-nowrap"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                {secondaryCtaLabel}
              </a>
            </div>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactItems.map((item) => {
            const Inner = (
              <div className="flex items-center gap-4 p-5 bg-white rounded-[20px] border border-[#e8f4fb] hover:border-[#c8e9f8] hover:shadow-lg transition-all duration-200 group h-full">
                <div
                  className="w-10 h-10 rounded-[13px] flex items-center justify-center flex-shrink-0 text-[#1a7fba] transition-colors"
                  style={{ background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)", border: "1.5px solid #b6def5" }}
                >
                  <ContactIcon type={item.iconType} />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-[#8ca0b0] uppercase tracking-widest mb-0.5">
                    {item.label}
                  </div>
                  <div className="text-[13px] font-bold text-[#0a1f2e] group-hover:text-[#1a7fba] transition-colors">
                    {item.value}
                  </div>
                </div>
              </div>
            );

            return item.href ? (
              <a key={item.id} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                {Inner}
              </a>
            ) : (
              <div key={item.id}>{Inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}