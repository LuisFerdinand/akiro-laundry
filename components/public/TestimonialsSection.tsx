// components/public/TestimonialsSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";

const TESTIMONIALS = [
  {
    name: "Maria Santos",
    role: "Restaurant Owner",
    initials: "MS",
    color: "#1a7fba",
    soft: "#edf7fd",
    rating: 5,
    text: "Akiro has been a lifesaver for my business. Our staff uniforms come back perfectly pressed every single time. The express service is incredibly fast — I can order in the morning and have everything back by evening.",
  },
  {
    name: "João Carvalho",
    role: "Hotel Manager",
    initials: "JC",
    color: "#10b981",
    soft: "#f0fdf8",
    rating: 5,
    text: "We use Akiro for all our hotel linen. The quality is outstanding, delivery is always on time, and their team is so professional. Our guests constantly compliment how fresh and clean everything smells.",
  },
  {
    name: "Ana Pereira",
    role: "Working Mother",
    initials: "AP",
    color: "#8b5cf6",
    soft: "#f5f3ff",
    rating: 5,
    text: "As a busy mum of three, Akiro has given me back hours of my week. The pickup and delivery is seamless, and my kids' clothes have never looked better. Highly recommend to every family!",
  },
  {
    name: "David Mendes",
    role: "Corporate Executive",
    initials: "DM",
    color: "#ec4899",
    soft: "#fdf4ff",
    rating: 5,
    text: "My suits and dress shirts require special care and Akiro delivers every time. Impeccable dry cleaning, no shrinkage, always crisp. This is the only laundry service I trust for my formal wardrobe.",
  },
  {
    name: "Sofia Alves",
    role: "University Student",
    initials: "SA",
    color: "#f59e0b",
    soft: "#fefce8",
    rating: 5,
    text: "The prices are super fair and the app makes it so easy to schedule. My dorm doesn't have a washing machine so Akiro is honestly a lifesaver. Love the fragrance add-on too — clothes smell amazing!",
  },
  {
    name: "Carlos Lima",
    role: "Gym Owner",
    initials: "CL",
    color: "#0d9488",
    soft: "#f0fdfa",
    rating: 5,
    text: "We send towels and sportswear in bulk every week. Akiro handles everything without any fuss — bulk pricing is fair and quality is always consistent. They've become an essential partner for our gym.",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 14 14" fill="#ffcc00">
          <path d="M7 1l1.55 3.14 3.46.5-2.5 2.44.59 3.44L7 8.77l-3.1 1.75.59-3.44L2 4.64l3.46-.5L7 1z"/>
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const sectionRef  = useRef<HTMLDivElement>(null);
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

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
    >
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, #f0f8ff18 50%, transparent 100%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Heading */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#edf7fd] border border-[#c8e9f8] rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-widest uppercase">
              Customer Love
            </span>
          </div>
          <h2
            className="font-display font-extrabold leading-tight mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#0a1f2e" }}
          >
            Trusted by Thousands
          </h2>
          <p className="text-[15px] font-medium text-[#4e6575] max-w-md mx-auto leading-relaxed">
            Don&apos;t just take our word for it — here&apos;s what our customers say.
          </p>

          {/* Aggregate stars */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <StarRating count={5} />
            <span className="text-sm font-extrabold text-[#0a1f2e]">4.9</span>
            <span className="text-sm font-medium text-[#8ca0b0]">
              from 2,400+ reviews
            </span>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="bg-white rounded-[22px] p-6 border border-[#e8f4fb] transition-all duration-500"
              style={{
                boxShadow: "0 2px 14px rgba(26,127,186,0.06)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(28px)",
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {/* Quote mark */}
              <div
                className="font-display text-5xl leading-none mb-3 font-extrabold"
                style={{ color: `${t.color}20` }}
              >
                &ldquo;
              </div>

              <p className="text-[13.5px] font-medium text-[#4e6575] leading-relaxed mb-5">
                {t.text}
              </p>

              {/* Author row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-[11px] flex items-center justify-center text-xs font-extrabold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)`,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-[13px] font-extrabold text-[#0a1f2e]">
                      {t.name}
                    </div>
                    <div className="text-[11px] font-semibold text-[#8ca0b0]">
                      {t.role}
                    </div>
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