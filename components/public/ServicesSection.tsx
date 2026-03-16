// components/public/ServicesSection.tsx
"use client";

import { useEffect, useRef } from "react";

const SERVICES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#dbeef9"/>
        <circle cx="16" cy="17" r="7" stroke="#1a7fba" strokeWidth="2" fill="none"/>
        <circle cx="16" cy="17" r="3" fill="#1a7fba" opacity="0.2"/>
        <path d="M11 11 a5 5 0 0 1 5-5" stroke="#1a7fba" strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="8" y="8" width="5" height="2" rx="1" fill="#c8e9f8"/>
        <circle cx="24" cy="9" r="1.5" fill="#ffcc00"/>
      </svg>
    ),
    title: "Regular Wash",
    desc: "Everyday clothes washed, dried, and neatly folded. Ideal for shirts, trousers, and casual wear.",
    price: "From $2/kg",
    accent: "#1a7fba",
    bg: "#edf7fd",
    border: "#c8e9f8",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#fdf3e0"/>
        <path d="M10 22 L10 12 L16 8 L22 12 L22 22 Z" stroke="#f59e0b" strokeWidth="1.8" fill="#fef3c7" strokeLinejoin="round"/>
        <path d="M13 22 L13 17 L19 17 L19 22" stroke="#f59e0b" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
        <path d="M9 22 L23 22" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: "Dry Cleaning",
    desc: "Gentle solvent-based cleaning for delicate fabrics — suits, dresses, blazers, and formal wear.",
    price: "From $4/item",
    accent: "#d97706",
    bg: "#fef9ee",
    border: "#fde68a",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#d1fae5"/>
        <path d="M9 14 h14 M9 18 h10" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="8" y="10" width="16" height="14" rx="3" stroke="#10b981" strokeWidth="1.8" fill="none"/>
        <path d="M12 10 V8 M20 10 V8" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    title: "Iron & Press",
    desc: "Professional steam-ironing for a crisp, wrinkle-free finish on all garments.",
    price: "From $1/item",
    accent: "#10b981",
    bg: "#f0fdf8",
    border: "#a7f3d0",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#ede9fe"/>
        <circle cx="16" cy="15" r="6" stroke="#8b5cf6" strokeWidth="1.8" fill="none"/>
        <path d="M16 9 v3 M16 18 v3 M9 15 h3 M19 15 h3" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="16" cy="15" r="2" fill="#8b5cf6" opacity="0.25"/>
      </svg>
    ),
    title: "Perfume & Fragrance",
    desc: "Choose from our curated collection of premium fragrances to freshen your laundry.",
    price: "Add-on service",
    accent: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#fce7f3"/>
        <path d="M8 14 h5 M8 18 h3 M8 22 h7" stroke="#ec4899" strokeWidth="1.6" strokeLinecap="round"/>
        <rect x="4" y="4" width="24" height="24" rx="6" fill="none" stroke="#ec4899" strokeWidth="1.5"/>
        <path d="M18 8 L24 14 L22 24 L16 26 L10 24 L8 14 Z" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Bedding & Linen",
    desc: "Duvets, bedsheets, pillowcases, curtains, and tablecloths — washed and fresh every time.",
    price: "From $5/set",
    accent: "#ec4899",
    bg: "#fdf4ff",
    border: "#f9a8d4",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#ccfbf1"/>
        <path d="M10 22 L10 14 M16 22 L16 10 M22 22 L22 16" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M8 22 L24 22" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: "Express Service",
    desc: "Same-day or next-day turnaround when you need your clothes back in a hurry.",
    price: "+50% surcharge",
    accent: "#0d9488",
    bg: "#f0fdfa",
    border: "#99f6e4",
  },
];

export default function ServicesSection() {
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
      c.style.transition =
        "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)";
      observer.observe(c);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Soft bg tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, #c8e9f814 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Heading */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#edf7fd] border border-[#c8e9f8] rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-widest uppercase">
              What We Offer
            </span>
          </div>
          <h2
            className="font-display font-extrabold leading-tight mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#0a1f2e" }}
          >
            Every Fabric, Every Need
          </h2>
          <p className="text-[15px] font-medium text-[#4e6575] max-w-xl mx-auto leading-relaxed">
            From your daily work shirts to your finest silk gowns — we handle it all
            with care, precision, and a personal touch.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service, i) => (
            <div
              key={service.title}
              data-card={i}
              className="group relative bg-white rounded-[22px] p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default"
              style={{
                border: `1.5px solid ${service.border}`,
                boxShadow: `0 2px 14px ${service.accent}0d`,
              }}
            >
              {/* Icon */}
              <div
                className="mb-4 w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: service.bg, border: `1.5px solid ${service.border}` }}
              >
                {service.icon}
              </div>

              <h3
                className="font-display font-extrabold text-[16px] mb-2"
                style={{ color: "#0a1f2e" }}
              >
                {service.title}
              </h3>
              <p className="text-[13px] font-medium text-[#6a8090] leading-relaxed mb-4">
                {service.desc}
              </p>

              <div
                className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-full"
                style={{
                  color: service.accent,
                  background: service.bg,
                  border: `1.5px solid ${service.border}`,
                }}
              >
                {service.price}
              </div>

              {/* Hover shimmer accent */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, transparent, ${service.accent}, transparent)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}