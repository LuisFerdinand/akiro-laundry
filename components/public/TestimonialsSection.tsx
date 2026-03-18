// components/public/TestimonialsSection.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { CmsTestimonialsSection, CmsTestimonial } from "@/lib/db/schema/cms";

type TestimonialsData = (CmsTestimonialsSection & { testimonials: CmsTestimonial[] }) | null;

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 14 14" fill={i < count ? "#ffcc00" : "#dde8f0"}>
          <path d="M7 1l1.55 3.14 3.46.5-2.5 2.44.59 3.44L7 8.77l-3.1 1.75.59-3.44L2 4.64l3.46-.5L7 1z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: CmsTestimonial }) {
  return (
    <div
      className="group relative flex-shrink-0 w-[300px] sm:w-[340px] rounded-[24px] bg-white overflow-hidden border"
      style={{
        borderColor: `${t.accentColor}20`,
        boxShadow: `0 4px 20px ${t.accentColor}0e, 0 1px 4px rgba(0,0,0,0.04)`,
      }}
    >
      {/* ── Image block ─────────────────────────────────────── */}
      <div
        className="relative h-[140px] w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${t.accentColor}18 0%, ${t.accentColor}06 100%)`,
        }}
      >
        {t.avatarUrl ? (
          <>
            <Image
              src={t.avatarUrl}
              alt={t.avatarAlt ?? t.authorName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="340px"
            />
            {/* Bottom fade into card body */}
            <div
              className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.95) 100%)",
              }}
            />
            {/* Subtle top vignette */}
            <div
              className="absolute inset-x-0 top-0 h-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 100%)",
              }}
            />
          </>
        ) : (
          /* No image — coloured wash with oversized initials */
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-display text-5xl font-extrabold opacity-20 select-none"
              style={{ color: t.accentColor }}
            >
              {t.initials}
            </span>
          </div>
        )}

        {/* Stars pill — top-right corner over image */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl bg-white/80 px-2 py-1 backdrop-blur-sm">
          <StarRating count={t.rating} />
        </div>

        {/* Floating avatar — bottom-left, overlaps into card body */}
        <div className="absolute -bottom-5 left-5 z-10">
          <div
            className="relative h-[52px] w-[52px] overflow-hidden rounded-2xl ring-[3px] ring-white shadow-md"
            style={{
              background: `linear-gradient(145deg, ${t.accentColor}dd, ${t.accentColor})`,
            }}
          >
            {t.avatarUrl ? (
              <Image
                src={t.avatarUrl}
                alt={t.authorName}
                fill
                className="object-cover object-top"
                sizes="52px"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold text-white">
                {t.initials}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Card body ──────────────────────────────────────── */}
      <div className="px-5 pb-5 pt-8">
        {/* Author */}
        <div className="mb-3">
          <p className="font-display text-[13px] font-extrabold leading-tight text-[#0a1f2e]">
            {t.authorName}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#8ca0b0]">{t.authorRole}</p>
        </div>

        {/* Quote */}
        <div className="relative">
          <span
            className="pointer-events-none absolute -left-1 -top-2 select-none font-display text-3xl font-extrabold leading-none"
            style={{ color: `${t.accentColor}30` }}
          >
            &ldquo;
          </span>
          <p className="pl-3 text-[13px] font-medium leading-relaxed text-[#4e6575]">
            {t.body}
          </p>
        </div>

        {/* Accent line */}
        <div
          className="mt-4 h-[3px] w-10 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${t.accentColor}50, ${t.accentColor})`,
          }}
        />
      </div>
    </div>
  );
}

export default function TestimonialsSection({ data }: { data: TestimonialsData }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number | null>(null);
  const offsetRef  = useRef(0);
  const pausedRef  = useRef(false);
  const [visible, setVisible] = useState(false);

  const badge           = data?.badge           ?? "Customer Love";
  const headline        = data?.headline        ?? "Trusted by Thousands";
  const subtext         = data?.subtext         ?? "";
  const aggregateRating = data?.aggregateRating ?? "4.9";
  const reviewCount     = data?.reviewCount     ?? "";
  const testimonials    = data?.testimonials    ?? [];

  // Section entrance reveal
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
      { threshold: 0.08 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Infinite auto-scroll ticker
  useEffect(() => {
    const track = trackRef.current;
    if (!track || testimonials.length === 0) return;

    const CARD_W  = typeof window !== "undefined" && window.innerWidth >= 640 ? 340 : 300;
    const GAP     = 16;
    const ITEM_W  = CARD_W + GAP;
    const SPEED   = 0.45; // px per rAF frame (~27px/s at 60fps)
    const setLen  = testimonials.length * ITEM_W;

    function tick() {
      if (!pausedRef.current) {
        offsetRef.current += SPEED;
        // Reset when one full set has scrolled past — creates seamless loop
        if (offsetRef.current >= setLen) offsetRef.current -= setLen;
        if (track) track.style.transform = `translateX(${-offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [testimonials]);

  const pause  = useCallback(() => { pausedRef.current = true;  }, []);
  const resume = useCallback(() => { pausedRef.current = false; }, []);

  // Triple-duplicate so the loop never shows a gap even on wide screens
  const loopedItems = [...testimonials, ...testimonials, ...testimonials];

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="relative overflow-hidden py-24 sm:py-32"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #f5fbff 30%, #edf7fd 70%, #ffffff 100%)",
      }}
    >
      {/* Ambient centre glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
        style={{
          background: "radial-gradient(ellipse, #c8e9f860 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* ── Heading ───────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className="mb-14 text-center transition-all duration-700"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8e9f8] bg-white px-4 py-1.5 shadow-sm">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#ffcc00", boxShadow: "0 0 0 3px #ffcc0033" }}
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
            <p className="mx-auto mt-3 max-w-md text-[15px] font-medium leading-relaxed text-[#4e6575]">
              {subtext}
            </p>
          )}

          {/* Aggregate rating row */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <StarRating count={5} />
            <span className="font-display text-sm font-extrabold text-[#0a1f2e]">
              {aggregateRating}
            </span>
            {reviewCount && (
              <span className="text-sm font-medium text-[#8ca0b0]">
                from {reviewCount} reviews
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Carousel — full-width, bleeds past max-w container ── */}
      <div
        className="relative"
        style={{
          // Edge fade masks so cards softly disappear at viewport edges
          maskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
      >
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{ gap: "16px", paddingLeft: "16px", paddingBottom: "16px" }}
        >
          {loopedItems.map((t, i) => (
            <TestimonialCard key={`${t.id}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}