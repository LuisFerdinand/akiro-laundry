// components/public/LocationSection.tsx
//
// Hardcoded "find us" section — intentionally not CMS-driven, matches the
// existing footer map/address (see components/public/OSMap.tsx for the shared
// pin/address constants).
"use client";

import { useEffect, useRef } from "react";
import { OSMap, MAP_LAT, MAP_LNG, MAP_ZOOM, MAP_ADDRESS, googleMapsLink } from "./OSMap";

function InfoRow({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-[13px] flex items-center justify-center flex-shrink-0 text-[#1a7fba]"
        style={{ background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)", border: "1.5px solid #b6def5" }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-extrabold text-[#8ca0b0] uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-[13px] font-bold text-[#0a1f2e]">{value}</div>
      </div>
    </div>
  );
}

export default function LocationSection() {
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
    section.style.opacity    = "0";
    section.style.transform  = "translateY(28px)";
    section.style.transition = "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)";
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const directionsHref = googleMapsLink(MAP_LAT, MAP_LNG);

  return (
    <section id="location" className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, #c8e9f814 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6 relative" ref={sectionRef}>
        {/* Heading */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#edf7fd] border border-[#c8e9f8] rounded-full px-4 py-1.5 mb-4">
            <span className="akiro-dot" style={{ background: "#1a7fba", boxShadow: "0 0 0 3px #1a7fba33" }} />
            <span className="text-xs font-extrabold text-[#1a7fba] tracking-widest uppercase">Visit Us</span>
          </div>
          <h2 className="font-display font-extrabold leading-tight mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#0a1f2e" }}>
            Find Us in Dili
          </h2>
          <p className="text-[15px] font-medium text-[#4e6575] max-w-xl mx-auto leading-relaxed">
            Drop by our store or book a pickup — we&apos;re right in the heart of the city.
          </p>
        </div>

        {/* Map + info card */}
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch">
          <OSMap lat={MAP_LAT} lng={MAP_LNG} zoom={MAP_ZOOM} height={360} />

          <div
            className="bg-white rounded-[22px] p-7 border flex flex-col gap-5 justify-center"
            style={{ border: "1.5px solid #e8f4fb", boxShadow: "0 2px 14px rgba(26,127,186,0.06)" }}
          >
            <InfoRow
              label="Address"
              value={MAP_ADDRESS}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              }
            />
            <InfoRow
              label="Hours"
              value="Every day · 08:00 – 20:00"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
            />
            <InfoRow
              label="Phone"
              value="+670 7675 8 7380"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .95.68l1.45 4.07a1 1 0 0 1-.23 1.04L8.5 10.5s1.45 3.3 5 5l1.7-1.97a1 1 0 0 1 1.04-.23l4.07 1.45a1 1 0 0 1 .69.95V19a2 2 0 0 1-2 2C8.16 21 3 12.84 3 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              }
            />

            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2.5 font-extrabold text-white text-sm px-6 py-3.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)", boxShadow: "0 8px 24px rgba(26,127,186,0.3)" }}
            >
              Get Directions
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
