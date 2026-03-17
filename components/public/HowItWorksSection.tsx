// components/public/HowItWorksSection.tsx
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { CmsHowItWorksSection, CmsHowItWorksStep } from "@/lib/db/schema/cms";

type HowItWorksData = (CmsHowItWorksSection & { steps: CmsHowItWorksStep[] }) | null;

export default function HowItWorksSection({ data }: { data: HowItWorksData }) {
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
      s.style.transition = "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)";
      observer.observe(s);
    });

    return () => observer.disconnect();
  }, []);

  const badge    = data?.badge    ?? "Simple Process";
  const headline = data?.headline ?? "Laundry Done in 4 Easy Steps";
  const subtext  = data?.subtext  ?? "";
  const steps    = data?.steps    ?? [];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #f5fbff 0%, #edf7fd 60%, #f0fdf8 100%)" }}
    >
      {/* Decorative center line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px pointer-events-none hidden lg:block"
        style={{ background: "linear-gradient(to bottom, transparent, #c8e9f8 20%, #c8e9f8 80%, transparent)", transform: "translateX(-50%)" }}
      />

      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Heading */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white border border-[#c8e9f8] rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-widest uppercase">{badge}</span>
          </div>
          <h2 className="font-display font-extrabold leading-tight mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#0a1f2e" }}>
            {headline}
          </h2>
          <p className="text-[15px] font-medium text-[#4e6575] max-w-md mx-auto leading-relaxed">{subtext}</p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.id} data-step={i} className="relative flex flex-col">
              {/* Connector arrow */}
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-10 items-center pointer-events-none" style={{ right: "-22px", zIndex: 1 }}>
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                    <path d="M1 7 h13 M10 2 l5 5-5 5" stroke="#b6def5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              <div
                className="flex flex-col gap-4 p-6 rounded-[22px] bg-white border h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ border: `1.5px solid ${step.accentColor}22`, boxShadow: `0 4px 16px ${step.accentColor}0d` }}
              >
                {/* Number + icon row */}
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-3xl" style={{ color: `${step.accentColor}25` }}>
                    {step.stepNumber}
                  </span>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
                    style={{ background: `${step.accentColor}12`, border: `1.5px solid ${step.accentColor}22` }}
                  >
                    {step.imageUrl ? (
                      <Image
                        src={step.imageUrl}
                        alt={step.imageAlt ?? step.title}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      /* Fallback numbered circle */
                      <span className="font-display font-extrabold text-lg" style={{ color: step.accentColor }}>
                        {step.stepNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-extrabold text-[16px] mb-2" style={{ color: "#0a1f2e" }}>
                    {step.title}
                  </h3>
                  <p className="text-[13px] font-medium text-[#6a8090] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Bottom accent line */}
                <div
                  className="h-1 rounded-full mt-auto"
                  style={{ background: `linear-gradient(90deg, ${step.accentColor}40, ${step.accentColor})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}