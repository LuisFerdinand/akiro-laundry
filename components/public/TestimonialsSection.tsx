// components/public/TestimonialsSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { CmsTestimonialsSection, CmsTestimonial } from "@/lib/db/schema/cms";

type TestimonialsData = (CmsTestimonialsSection & { testimonials: CmsTestimonial[] }) | null;

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 14 14" fill="#ffcc00">
          <path d="M7 1l1.55 3.14 3.46.5-2.5 2.44.59 3.44L7 8.77l-3.1 1.75.59-3.44L2 4.64l3.46-.5L7 1z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection({ data }: { data: TestimonialsData }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const badge           = data?.badge           ?? "Customer Love";
  const headline        = data?.headline        ?? "Trusted by Thousands";
  const subtext         = data?.subtext         ?? "";
  const aggregateRating = data?.aggregateRating ?? "4.9";
  const reviewCount     = data?.reviewCount     ?? "";
  const testimonials    = data?.testimonials    ?? [];

  return (
    <section id="testimonials" ref={sectionRef} className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 0%, #f0f8ff18 50%, transparent 100%)" }} />

      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Heading */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#edf7fd] border border-[#c8e9f8] rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-widest uppercase">{badge}</span>
          </div>
          <h2 className="font-display font-extrabold leading-tight mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#0a1f2e" }}>
            {headline}
          </h2>
          <p className="text-[15px] font-medium text-[#4e6575] max-w-md mx-auto leading-relaxed">{subtext}</p>

          {/* Aggregate stars */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <StarRating count={5} />
            <span className="text-sm font-extrabold text-[#0a1f2e]">{aggregateRating}</span>
            {reviewCount && (
              <span className="text-sm font-medium text-[#8ca0b0]">from {reviewCount} reviews</span>
            )}
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={t.id}
              className="bg-white rounded-[22px] p-6 border border-[#e8f4fb] transition-all duration-500"
              style={{
                boxShadow: "0 2px 14px rgba(26,127,186,0.06)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(28px)",
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {/* Quote mark */}
              <div className="font-display text-5xl leading-none mb-3 font-extrabold" style={{ color: `${t.accentColor}20` }}>
                &ldquo;
              </div>

              <p className="text-[13.5px] font-medium text-[#4e6575] leading-relaxed mb-5">{t.body}</p>

              {/* Author row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.avatarUrl ? (
                    <Image
                      src={t.avatarUrl}
                      alt={t.avatarAlt ?? t.authorName}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-[11px] object-cover"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-[11px] flex items-center justify-center text-xs font-extrabold text-white"
                      style={{ background: `linear-gradient(135deg, ${t.accentColor}, ${t.accentColor}cc)` }}
                    >
                      {t.initials}
                    </div>
                  )}
                  <div>
                    <div className="text-[13px] font-extrabold text-[#0a1f2e]">{t.authorName}</div>
                    <div className="text-[11px] font-semibold text-[#8ca0b0]">{t.authorRole}</div>
                  </div>
                </div>
                <StarRating count={t.rating} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}