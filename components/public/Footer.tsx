// components/public/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import type { CmsFooter, CmsFooterLink } from "@/lib/db/schema/cms";

type FooterData = (CmsFooter & { links: CmsFooterLink[] }) | null;

// ── Akiro's location in Dili, Timor-Leste ────────────────────────────────────
// Change these two values to pin any location.
const MAP_LAT  = -8.5596;
const MAP_LNG  = 125.5789;
const MAP_ZOOM = 16;

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupLinks(links: CmsFooterLink[]): Record<string, CmsFooterLink[]> {
  return links.reduce<Record<string, CmsFooterLink[]>>((acc, link) => {
    if (!acc[link.column]) acc[link.column] = [];
    acc[link.column].push(link);
    return acc;
  }, {});
}

function SocialIcon({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l === "facebook")
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  if (l === "instagram")
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    );
  if (l === "whatsapp")
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ── Info row (icon + text) ────────────────────────────────────────────────────
function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(36,150,214,0.12)", border: "1px solid rgba(36,150,214,0.2)" }}
      >
        <span style={{ color: "#2496d6" }}>{icon}</span>
      </div>
      <span className="text-[13px] font-medium leading-relaxed" style={{ color: "#6a8eaa" }}>
        {children}
      </span>
    </div>
  );
}

// ── Column heading ─────────────────────────────────────────────────────────────
function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="mb-5 font-display text-[11px] font-extrabold uppercase tracking-widest"
      style={{ color: "#2496d6" }}
    >
      {children}
    </h4>
  );
}

// ── OpenStreetMap embed (free, no API key) ────────────────────────────────────
function OSMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  // bbox = rough bounding box around the pin so the static tile is centered
  const delta = 0.004;
  const bbox  = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src   = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 220,
        borderRadius: 20,
        border: "1.5px solid rgba(36,150,214,0.2)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, display: "block", filter: "saturate(0.7) brightness(0.88) contrast(1.1)" }}
        loading="lazy"
        title="Akiro Laundry location"
        aria-label="Map showing Akiro Laundry location in Dili, Timor-Leste"
      />
      {/* Branded overlay pin label */}
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 left-3 flex items-center gap-2 rounded-2xl px-3 py-2 backdrop-blur-sm transition-opacity hover:opacity-90"
        style={{
          background: "rgba(10,31,46,0.82)",
          border: "1px solid rgba(36,150,214,0.3)",
        }}
      >
        {/* Pin icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2496d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="font-display text-[11px] font-extrabold text-white">Open in Maps ↗</span>
      </a>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Footer({ data }: { data: FooterData }) {
  const brandName     = data?.brandName     ?? "Akiro Laundry";
  const tagline       = data?.tagline       ?? "Premium laundry & dry-cleaning in Dili, Timor-Leste.";
  const logoUrl       = data?.logoUrl       ?? null;
  const logoAlt       = data?.logoAlt       ?? "Akiro Laundry";
  const copyrightText = data?.copyrightText ?? `© ${new Date().getFullYear()} Akiro Laundry & Perfume. All rights reserved.`;
  const links         = data?.links         ?? [];

  const grouped     = groupLinks(links);
  const socialLinks = grouped["social"]      ?? [];
  const quickLinks  = grouped["quick_links"] ?? [];

  return (
    <footer
      className="relative overflow-hidden pb-8 pt-16"
      style={{ background: "linear-gradient(160deg, #0a1f2e 0%, #0f2d42 50%, #0a1a28 100%)" }}
    >
      {/* Decorative orbs */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 420, height: 420, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(36,150,214,0.07) 0%, transparent 65%)",
          top: -120, right: -100,
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          width: 280, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(62,203,154,0.05) 0%, transparent 65%)",
          bottom: 60, left: -80,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">

        {/* ── Top grid — 4 columns ─────────────────────────────── */}
        <div className="mb-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* ── Col 1 : Brand + contact info ──────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Logo + name */}
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <Image src={logoUrl} alt={logoAlt} width={38} height={38} className="rounded-[14px]" />
              ) : (
                <div
                  style={{
                    width: 38, height: 38, borderRadius: 14,
                    background: "linear-gradient(135deg,rgba(26,127,186,0.15),rgba(36,150,214,0.15))",
                    border: "1.5px solid rgba(26,127,186,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="4" stroke="#2496d6" strokeWidth="1.8" />
                    <circle cx="12" cy="13" r="4" stroke="#2496d6" strokeWidth="1.8" />
                    <circle cx="7.5" cy="7.5" r="1" fill="#ffcc00" />
                    <circle cx="10.5" cy="7.5" r="1" fill="#3ecb9a" />
                  </svg>
                </div>
              )}
              <span className="font-display text-[17px] font-extrabold text-white">
                {brandName.split(" ")[0]}{" "}
                <span style={{ color: "#2496d6" }}>{brandName.split(" ").slice(1).join(" ")}</span>
              </span>
            </div>

            {/* Tagline */}
            <p className="text-[13px] font-medium leading-relaxed" style={{ color: "#6a8eaa" }}>
              {tagline}
            </p>

            {/* Contact info rows */}
            <div className="flex flex-col gap-3">
              <InfoRow
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                }
              >
                Rua Formosa, Dili, Timor-Leste
              </InfoRow>
              <InfoRow
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
              >
                Open every day · 08:00 – 20:00
              </InfoRow>
              <InfoRow
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.87a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" />
                  </svg>
                }
              >
                +670 7700 0000
              </InfoRow>
            </div>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    aria-label={link.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(36,150,214,0.4)]"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#6a8eaa",
                    }}
                  >
                    <SocialIcon label={link.label} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Col 2 : Quick Links ────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <ColHeading>Quick Links</ColHeading>
            {quickLinks.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {quickLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      className="flex items-center gap-2 text-[13px] font-medium transition-colors duration-200 hover:text-white"
                      style={{ color: "#6a8eaa" }}
                    >
                      <span className="h-1 w-1 flex-shrink-0 rounded-full" style={{ background: "#2496d655" }} />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: "Home",         href: "#" },
                  { label: "Services",     href: "#services" },
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "Gallery",      href: "#gallery" },
                  { label: "Testimonials", href: "#testimonials" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="flex items-center gap-2 text-[13px] font-medium transition-colors duration-200 hover:text-white"
                      style={{ color: "#6a8eaa" }}
                    >
                      <span className="h-1 w-1 flex-shrink-0 rounded-full" style={{ background: "#2496d655" }} />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Col 3 : Account + Hours ────────────────────────── */}
          <div className="flex flex-col gap-6">
            <ColHeading>Account</ColHeading>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: "Sign In",         href: "/login" },
                { label: "Employee Portal", href: "/employee" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 text-[13px] font-medium transition-colors duration-200 hover:text-white"
                    style={{ color: "#6a8eaa" }}
                  >
                    <span className="h-1 w-1 flex-shrink-0 rounded-full" style={{ background: "#2496d655" }} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Open hours chip */}
            <div
              className="mt-2 rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="akiro-dot" />
                <span className="font-display text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#3ecb9a" }}>
                  Open Now
                </span>
              </div>
              <div className="text-[13px] font-bold text-white">Every Day</div>
              <div className="text-[12px] font-semibold" style={{ color: "#6a8eaa" }}>08:00 – 20:00</div>
            </div>
          </div>

          {/* ── Col 4 : Map ───────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <ColHeading>Find Us</ColHeading>
            <OSMap lat={MAP_LAT} lng={MAP_LNG} zoom={MAP_ZOOM} />
            <p className="text-center text-[12px] font-medium" style={{ color: "#4a6880" }}>
              Rua Formosa, Dili · Timor-Leste
            </p>
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────────── */}
        <div className="mb-7 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* ── Bottom row ────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[12px] font-medium" style={{ color: "#4a6880" }}>
            {copyrightText}
          </p>
          <p className="text-[12px] font-medium" style={{ color: "#4a6880" }}>
            Dili, Timor-Leste 🇹🇱
          </p>
        </div>
      </div>
    </footer>
  );
}