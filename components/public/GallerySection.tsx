// components/public/GallerySection.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import type { CmsGallerySection, CmsGalleryImage } from "@/lib/db/schema/cms";

type GalleryData = (CmsGallerySection & { images: CmsGalleryImage[] }) | null;

// ── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: CmsGalleryImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const img = images[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(5,20,35,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 2l14 14M16 2L2 16" />
        </svg>
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-3 sm:left-6 z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Previous"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4l-6 6 6 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative mx-16 sm:mx-24 overflow-hidden rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-[70vh] w-[70vw] max-w-[900px] sm:w-[60vw]">
          <Image
            src={img.imageUrl}
            alt={img.altText}
            fill
            className="rounded-[20px] object-contain"
            sizes="(max-width: 640px) 90vw, 70vw"
            priority
          />
        </div>
        {img.caption && (
          <p className="mt-3 text-center text-sm font-medium text-white/70">{img.caption}</p>
        )}
        <p className="mt-2 text-center text-xs font-semibold text-white/40">
          {index + 1} / {images.length}
        </p>
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-3 sm:right-6 z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Next"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Gallery item ─────────────────────────────────────────────────────────────
function GalleryItem({
  image,
  index,
  onClick,
}: {
  image: CmsGalleryImage;
  index: number;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setRevealed(true), (index % 6) * 80);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  // sizeHint comes from the DB enum: "square" | "tall" | "wide"
  const spanClass =
    image.sizeHint === "tall" ? "row-span-2" :
    image.sizeHint === "wide" ? "col-span-2" : "";

  const heightClass =
    image.sizeHint === "tall" ? "h-[360px] sm:h-[440px]" :
    image.sizeHint === "wide" ? "h-[200px] sm:h-[220px]" :
                                "h-[200px] sm:h-[210px]";

  return (
    <div
      ref={ref}
      className={`${spanClass} group relative cursor-pointer overflow-hidden rounded-[20px] bg-[#edf7fd]`}
      style={{
        transition: "opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)",
        opacity:    revealed ? 1 : 0,
        transform:  revealed ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${image.altText}`}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={`relative w-full ${heightClass}`}>
        <Image
          src={image.imageUrl}
          alt={image.altText}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "linear-gradient(to bottom, rgba(10,31,46,0.15) 0%, rgba(10,31,46,0.60) 100%)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" />
            </svg>
          </div>
          {image.caption && (
            <p className="px-4 text-center text-xs font-semibold text-white/90">
              {image.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export default function GallerySection({ data }: { data?: GalleryData }) {
  const headingRef = useRef<HTMLDivElement>(null);
  const [headingVisible, setHeadingVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const badge    = data?.badge    ?? "Our Facility";
  const headline = data?.headline ?? "A Glimpse Inside Akiro";
  const subtext  = data?.subtext  ?? "Clean space, professional care — see where the magic happens.";
  // Only render active images
  const images   = data?.images?.filter((img) => img.isActive) ?? [];

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHeadingVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const openLightbox  = useCallback((i: number) => setLightboxIndex(i), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage     = useCallback(() =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
  [images.length]);
  const nextImage     = useCallback(() =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length)),
  [images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <section
        id="gallery"
        className="relative overflow-hidden py-24 sm:py-32"
        style={{ background: "linear-gradient(160deg, #f5fbff 0%, #ffffff 40%, #f0fdf8 100%)" }}
      >
        {/* Ambient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-0 h-[400px] w-[400px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #c8e9f870 0%, transparent 70%)", filter: "blur(50px)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3ecb9a50 0%, transparent 70%)", filter: "blur(45px)" }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

          {/* Heading */}
          <div
            ref={headingRef}
            className="mb-12 text-center transition-all duration-700 sm:mb-16"
            style={{
              opacity:   headingVisible ? 1 : 0,
              transform: headingVisible ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8e9f8] bg-white px-4 py-1.5 shadow-sm">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "#1a7fba", boxShadow: "0 0 0 3px #1a7fba22" }}
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
          </div>

          {/* Masonry grid */}
          <div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
            style={{ gridAutoRows: "auto" }}
          >
            {images.map((img, i) => (
              <GalleryItem
                key={img.id}
                image={img}
                index={i}
                onClick={() => openLightbox(i)}
              />
            ))}
          </div>

          {/* View more hint */}
          <div
            className="mt-10 flex justify-center transition-all delay-300 duration-700"
            style={{
              opacity:   headingVisible ? 1 : 0,
              transform: headingVisible ? "translateY(0)" : "translateY(12px)",
            }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-[#8ca0b0]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1a7fba" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 7h12M8 3l4 4-4 4" />
              </svg>
              Click any photo to view full size
            </p>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </>
  );
}