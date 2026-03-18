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

    const items = section.querySelectorAll<HTMLElement>("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.reveal ?? 0);
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0) scale(1)";
            }, delay);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(28px) scale(0.98)";
      el.style.transition =
        "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)";
      observer.observe(el);
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
      className="relative overflow-hidden py-24 sm:py-32"
      style={{
        background:
          "linear-gradient(170deg, #f5fbff 0%, #edf7fd 45%, #f4fdf9 100%)",
      }}
    >
      {/* ── Ambient blobs ─────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, #c8e9f880 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, #3ecb9a60 0%, transparent 70%)",
          filter: "blur(55px)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* ── Heading ─────────────────────────────────────────── */}
        <div
          data-reveal="0"
          className="mb-16 text-center sm:mb-20"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8e9f8] bg-white px-4 py-1.5 shadow-sm">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#3ecb9a", boxShadow: "0 0 0 3px #3ecb9a33" }}
            />
            <span className="font-display text-xs font-extrabold uppercase tracking-widest text-[#1a7fba]">
              {badge}
            </span>
          </div>

          <h2
            className="font-display font-extrabold leading-tight text-[#0a1f2e]"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
          >
            {headline}
          </h2>

          {subtext && (
            <p className="mx-auto mt-4 max-w-lg text-[15px] font-medium leading-relaxed text-[#4e6575]">
              {subtext}
            </p>
          )}
        </div>

        {/* ── Step rows ────────────────────────────────────────── */}
        <div className="space-y-10 sm:space-y-14">
          {steps.map((step, i) => {
            const isEven = i % 2 === 1;
            const delay  = i * 120;

            return (
              <div
                key={step.id}
                data-reveal={delay}
                className={[
                  "group relative flex flex-col overflow-hidden rounded-[28px] bg-white",
                  "border shadow-sm transition-shadow duration-300 hover:shadow-xl",
                  "sm:flex-row",
                  isEven ? "sm:flex-row-reverse" : "",
                ].join(" ")}
                style={{
                  borderColor: `${step.accentColor}28`,
                  boxShadow: `0 4px 24px ${step.accentColor}12`,
                }}
              >
                {/* ── Image panel ───────────────────────────── */}
                <div className="relative min-h-[220px] w-full sm:w-[45%] sm:min-h-0 lg:w-[42%]">
                  {/* Soft colored wash behind image */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${step.accentColor}18 0%, ${step.accentColor}06 100%)`,
                    }}
                  />

                  {step.imageUrl ? (
                    <Image
                      src={step.imageUrl}
                      alt={step.imageAlt ?? step.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, 45vw"
                    />
                  ) : (
                    /* Placeholder when no image */
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-display text-[72px] font-extrabold leading-none opacity-10"
                        style={{ color: step.accentColor }}
                      >
                        {step.stepNumber}
                      </span>
                    </div>
                  )}

                  {/* Step badge — sits on top of image */}
                  <div
                    className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl font-display text-sm font-extrabold text-white shadow-md"
                    style={{
                      background: `linear-gradient(145deg, ${step.accentColor}ee, ${step.accentColor})`,
                      boxShadow: `0 4px 12px ${step.accentColor}55`,
                    }}
                  >
                    {step.stepNumber}
                  </div>

                  {/* Gradient fade into content panel (side direction depends on layout) */}
                  <div
                    className={[
                      "absolute inset-y-0 w-12 pointer-events-none hidden sm:block",
                      isEven ? "left-0" : "right-0",
                    ].join(" ")}
                    style={{
                      background: isEven
                        ? "linear-gradient(to right, white, transparent)"
                        : "linear-gradient(to left, white, transparent)",
                    }}
                  />

                  {/* Mobile-only bottom fade */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-10 sm:hidden"
                    style={{
                      background: "linear-gradient(to bottom, transparent, white)",
                    }}
                  />
                </div>

                {/* ── Content panel ─────────────────────────── */}
                <div
                  className={[
                    "relative flex flex-1 flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10",
                    isEven ? "sm:pr-10 lg:pr-14" : "sm:pl-10 lg:pl-14",
                  ].join(" ")}
                >
                  {/* Decorative large number */}
                  <span
                    className="pointer-events-none absolute right-6 top-4 font-display text-[100px] font-extrabold leading-none select-none sm:top-1/2 sm:-translate-y-1/2"
                    style={{ color: `${step.accentColor}0e` }}
                  >
                    {step.stepNumber}
                  </span>

                  {/* Icon chip */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      background: `${step.accentColor}15`,
                      border: `1.5px solid ${step.accentColor}25`,
                    }}
                  >
                    {step.imageUrl ? (
                      /* If the step has an image we already show it — use a coloured circle as icon fallback */
                      <span
                        className="font-display text-base font-extrabold"
                        style={{ color: step.accentColor }}
                      >
                        {step.stepNumber}
                      </span>
                    ) : (
                      <span
                        className="font-display text-base font-extrabold"
                        style={{ color: step.accentColor }}
                      >
                        {step.stepNumber}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3
                      className="font-display text-xl font-extrabold leading-snug sm:text-2xl"
                      style={{ color: "#0a1f2e" }}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#6a8090] sm:text-[15px]">
                      {step.description}
                    </p>
                  </div>

                  {/* Accent pill */}
                  <div
                    className="h-1 w-16 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${step.accentColor}50, ${step.accentColor})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}