// components/public/ServicesSection.tsx
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { CmsServicesSection, CmsServiceCard } from "@/lib/db/schema/cms";

type ServicesData = (CmsServicesSection & { cards: CmsServiceCard[] }) | null;

export default function ServicesSection({ data }: { data: ServicesData }) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const cards = section.querySelectorAll<HTMLElement>("[data-card]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const idx  = Number(card.dataset.card);
            setTimeout(() => {
              card.style.opacity   = "1";
              card.style.transform = "translateY(0)";
            }, idx * 90);
            observer.unobserve(card);
          }
        });
      },
      { threshold: 0.12 }
    );

    cards.forEach((c) => {
      c.style.opacity   = "0";
      c.style.transform = "translateY(30px)";
      c.style.transition = "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)";
      observer.observe(c);
    });

    return () => observer.disconnect();
  }, []);

  const badge    = data?.badge    ?? "What We Offer";
  const headline = data?.headline ?? "Every Fabric, Every Need";
  const subtext  = data?.subtext  ?? "";
  const cards    = data?.cards    ?? [];

  return (
    <section id="services" ref={sectionRef} className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, #c8e9f814 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Heading */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#edf7fd] border border-[#c8e9f8] rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-widest uppercase">{badge}</span>
          </div>
          <h2 className="font-display font-extrabold leading-tight mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#0a1f2e" }}>
            {headline}
          </h2>
          <p className="text-[15px] font-medium text-[#4e6575] max-w-xl mx-auto leading-relaxed">{subtext}</p>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <div
              key={card.id}
              data-card={i}
              className="group relative bg-white rounded-[22px] p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default"
              style={{ border: `1.5px solid ${card.accentColor}22`, boxShadow: `0 2px 14px ${card.accentColor}0d` }}
            >
              {/* Icon / image */}
              <div
                className="mb-4 w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ background: `${card.accentColor}12`, border: `1.5px solid ${card.accentColor}22` }}
              >
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={card.imageAlt ?? card.title}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  /* Fallback generic icon */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke={card.accentColor} strokeWidth="1.8" />
                    <path d="M12 8v4l3 3" stroke={card.accentColor} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              <h3 className="font-display font-extrabold text-[16px] mb-2" style={{ color: "#0a1f2e" }}>
                {card.title}
              </h3>
              <p className="text-[13px] font-medium text-[#6a8090] leading-relaxed mb-4">
                {card.description}
              </p>

              <div
                className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-full"
                style={{ color: card.accentColor, background: `${card.accentColor}12`, border: `1.5px solid ${card.accentColor}22` }}
              >
                {card.price}
              </div>

              {/* Hover shimmer */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${card.accentColor}, transparent)` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}