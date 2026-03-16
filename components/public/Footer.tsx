// components/public/Footer.tsx
import Link from "next/link";

const LINKS = {
  Services: [
    "Regular Wash",
    "Dry Cleaning",
    "Iron & Press",
    "Express Service",
    "Bedding & Linen",
  ],
  Company: [
    { label: "About Us",    href: "#" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Contact",      href: "#contact" },
  ],
  Account: [
    { label: "Sign In",      href: "/login" },
    { label: "Employee Portal", href: "/employee" },
  ],
};

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden pt-16 pb-8"
      style={{
        background:
          "linear-gradient(160deg, #0a1f2e 0%, #0f2d42 50%, #0a1a28 100%)",
      }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(36,150,214,0.08) 0%, transparent 65%)",
          top: -100,
          right: -80,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(62,203,154,0.06) 0%, transparent 65%)",
          bottom: 40,
          left: -60,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #1a7fba22, #2496d622)",
                  border: "1.5px solid rgba(26,127,186,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="#2496d6" strokeWidth="1.8"/>
                  <circle cx="12" cy="13" r="4" stroke="#2496d6" strokeWidth="1.8"/>
                  <circle cx="7.5" cy="7.5" r="1" fill="#ffcc00"/>
                  <circle cx="10.5" cy="7.5" r="1" fill="#3ecb9a"/>
                </svg>
              </div>
              <span
                className="font-display font-extrabold text-[17px]"
                style={{ color: "white" }}
              >
                Akiro{" "}
                <span style={{ color: "#2496d6" }}>Laundry</span>
              </span>
            </div>

            <p className="text-[13px] font-medium leading-relaxed mb-5" style={{ color: "#6a8eaa" }}>
              Premium laundry & dry-cleaning service in Dili, Timor-Leste. Open
              every day from 08:00 to 20:00.
            </p>

            {/* Social links */}
            <div className="flex gap-2">
              {[
                {
                  href: "#",
                  label: "Facebook",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                  ),
                },
                {
                  href: "#",
                  label: "Instagram",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5"/>
                      <circle cx="12" cy="12" r="4"/>
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                    </svg>
                  ),
                },
                {
                  href: "https://wa.me/67077230001",
                  label: "WhatsApp",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                    </svg>
                  ),
                },
              ].map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#6a8eaa",
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4
              className="font-display font-extrabold text-[11px] uppercase tracking-widest mb-5"
              style={{ color: "#2496d6" }}
            >
              Services
            </h4>
            <ul className="flex flex-col gap-2.5">
              {LINKS.Services.map((s) => (
                <li key={s}>
                  <span className="text-[13px] font-medium" style={{ color: "#6a8eaa" }}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className="font-display font-extrabold text-[11px] uppercase tracking-widest mb-5"
              style={{ color: "#2496d6" }}
            >
              Company
            </h4>
            <ul className="flex flex-col gap-2.5">
              {LINKS.Company.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[13px] font-medium transition-colors duration-200 hover:text-white"
                    style={{ color: "#6a8eaa" }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account + Hours */}
          <div>
            <h4
              className="font-display font-extrabold text-[11px] uppercase tracking-widest mb-5"
              style={{ color: "#2496d6" }}
            >
              Account
            </h4>
            <ul className="flex flex-col gap-2.5 mb-8">
              {LINKS.Account.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[13px] font-medium transition-colors duration-200 hover:text-white"
                    style={{ color: "#6a8eaa" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Hours chip */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(26,127,186,0.12)",
                border: "1px solid rgba(36,150,214,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="akiro-dot" />
                <span
                  className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: "#3ecb9a" }}
                >
                  Open Now
                </span>
              </div>
              <div className="text-[13px] font-bold text-white">
                Every Day
              </div>
              <div
                className="text-[12px] font-semibold"
                style={{ color: "#6a8eaa" }}
              >
                08:00 – 20:00
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px mb-7"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] font-medium" style={{ color: "#4a6880" }}>
            © {new Date().getFullYear()} Akiro Laundry & Perfume. All rights reserved.
          </p>
          <p className="text-[12px] font-medium" style={{ color: "#4a6880" }}>
            Dili, Timor-Leste 🇹🇱
          </p>
        </div>
      </div>
    </footer>
  );
}