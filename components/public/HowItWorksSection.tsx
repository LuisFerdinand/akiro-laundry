// components/public/HowItWorksSection.tsx
"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: "01",
    title: "Place Your Order",
    desc: "Use our app or call us. Tell us what you need, choose your service, and pick a convenient collection time.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="4" width="28" height="32" rx="6" fill="#dbeef9"/>
        <rect x="10" y="8" width="20" height="24" rx="4" fill="white"/>
        <path d="M14 14 h12 M14 18 h8 M14 22 h10" stroke="#1a7fba" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="30" cy="10" r="5" fill="#1a7fba"/>
        <path d="M28 10 l1.5 1.5 L32 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: "#1a7fba",
    soft:  "#edf7fd",
    edge:  "#c8e9f8",
  },
  {
    num: "02",
    title: "We Pick It Up",
    desc: "Our driver arrives at your address at the scheduled time. No waiting around — we come to you.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#d1fae5"/>
        <path d="M8 24 h18 v-8 l-5-6 H8 Z" fill="white" stroke="#10b981" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M26 24 h6 l-2-8 h-4 Z" fill="#d1fae5" stroke="#10b981" strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="13" cy="27" r="3" fill="#10b981"/>
        <circle cx="28" cy="27" r="3" fill="#10b981"/>
        <path d="M8 18 h7" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: "#10b981",
    soft:  "#f0fdf8",
    edge:  "#a7f3d0",
  },
  {
    num: "03",
    title: "We Clean It",
    desc: "Your laundry is washed, dried, ironed, and quality-checked in our professional facility.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#ede9fe"/>
        <rect x="8" y="8" width="24" height="24" rx="6" fill="white" stroke="#8b5cf6" strokeWidth="1.8"/>
        <circle cx="20" cy="21" r="7" stroke="#8b5cf6" strokeWidth="1.8" fill="none"/>
        <circle cx="20" cy="21" r="3" fill="#8b5cf6" opacity="0.2"/>
        <path d="M16 16 a4 4 0 0 1 4-4" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round"/>
        <rect x="10" y="11" width="6" height="2.5" rx="1.2" fill="#ddd6fe"/>
        <circle cx="30" cy="12" r="2" fill="#ffcc00"/>
      </svg>
    ),
    color: "#8b5cf6",
    soft:  "#f5f3ff",
    edge:  "#ddd6fe",
  },
  {
    num: "04",
    title: "Delivered Fresh",
    desc: "Clean, folded, and fragrant — your laundry is delivered back to your door right on schedule.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#fce7f3"/>
        <path d="M20 10 L32 18 V30 H8 V18 Z" fill="white" stroke="#ec4899" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M8 18 L20 10 L32 18" stroke="#ec4899" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M15 30 V24 h10 V30" stroke="#ec4899" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
        <path d="M20 16 v4 M18 19 l2 2 2-2" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: "#ec4899",
    soft:  "#fdf4ff",
    edge:  "#f9a8d4",
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const steps = section.querySelectorAll<HTMLElement>("[data-step]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el  = entry.target as HTMLElement;
            const idx = Number(el.dataset.step);
            setTimeout(() => {
              el.style.opacity   = "1";
              el.style.transform = "translateY(0)";
            }, idx * 130);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );

    steps.forEach((s) => {
      s.style.opacity   = "0";
      s.style.transform = "translateY(32px)";
      s.style.transition =
        "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)";
      observer.observe(s);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #f5fbff 0%, #edf7fd 60%, #f0fdf8 100%)",
      }}
    >
      {/* Decorative line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px pointer-events-none hidden lg:block"
        style={{
          background:
            "linear-gradient(to bottom, transparent, #c8e9f8 20%, #c8e9f8 80%, transparent)",
          transform: "translateX(-50%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Heading */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white border border-[#c8e9f8] rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-widest uppercase">
              Simple Process
            </span>
          </div>
          <h2
            className="font-display font-extrabold leading-tight mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#0a1f2e" }}
          >
            Laundry Done in 4 Easy Steps
          </h2>
          <p className="text-[15px] font-medium text-[#4e6575] max-w-md mx-auto leading-relaxed">
            We handle everything from collection to delivery so your day stays
            free.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              data-step={i}
              className="relative flex flex-col"
            >
              {/* Connector arrow (desktop) */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden lg:flex absolute top-10 items-center pointer-events-none"
                  style={{ right: "-22px", zIndex: 1 }}
                >
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                    <path
                      d="M1 7 h13 M10 2 l5 5-5 5"
                      stroke="#b6def5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

              <div
                className="flex flex-col gap-4 p-6 rounded-[22px] bg-white border h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  border: `1.5px solid ${step.edge}`,
                  boxShadow: `0 4px 16px ${step.color}0d`,
                }}
              >
                {/* Number + icon row */}
                <div className="flex items-center justify-between">
                  <span
                    className="font-display font-extrabold text-3xl"
                    style={{ color: `${step.color}25` }}
                  >
                    {step.num}
                  </span>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: step.soft,
                      border: `1.5px solid ${step.edge}`,
                    }}
                  >
                    {step.icon}
                  </div>
                </div>

                <div>
                  <h3
                    className="font-display font-extrabold text-[16px] mb-2"
                    style={{ color: "#0a1f2e" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[13px] font-medium text-[#6a8090] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Bottom accent line */}
                <div
                  className="h-1 rounded-full mt-auto"
                  style={{
                    background: `linear-gradient(90deg, ${step.color}40, ${step.color})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}