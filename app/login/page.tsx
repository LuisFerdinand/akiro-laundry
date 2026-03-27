// app/login/page.tsx
"use client";

import { useState, useTransition } from "react";
import { signIn }                  from "next-auth/react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import Image                       from "next/image";
import { Loader2, Eye, EyeOff, Sparkles, Clock, Smartphone, Star, ArrowRight } from "lucide-react";

// ── Coming-soon features shown in the left panel ──────────────────────────────
const FEATURES = [
  {
    icon:  Smartphone,
    color: "#1a7fba",
    bg:    "rgba(26,127,186,0.10)",
    title: "Customer App",
    desc:  "Book pickups, track orders and pay — all from your phone.",
    badge: "Coming Soon",
  },
  {
    icon:  Star,
    color: "#f59e0b",
    bg:    "rgba(245,158,11,0.10)",
    title: "Loyalty Rewards",
    desc:  "Earn points on every wash and redeem them for free services.",
    badge: "Coming Soon",
  },
  {
    icon:  Clock,
    color: "#3ecb9a",
    bg:    "rgba(62,203,154,0.10)",
    title: "Real-time Tracking",
    desc:  "See exactly where your laundry is at every step of the journey.",
    badge: "Coming Soon",
  },
] as const;

// ── Shared input style ────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width:            "100%",
  boxSizing:        "border-box",
  padding:          "13px 16px",
  background:       "white",
  border:           "1.5px solid hsl(210 20% 88%)",
  borderRadius:     "12px",
  color:            "#0a1f2e",
  fontSize:         "15px",
  fontWeight:       500,
  outline:          "none",
  fontFamily:       "Nunito, sans-serif",
  transition:       "border-color 0.18s, box-shadow 0.18s",
  WebkitAppearance: "none",
};

// ── Label ─────────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display:       "block",
      fontSize:      "11px",
      fontWeight:    800,
      color:         "#607080",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom:  "7px",
      fontFamily:    "Sora, sans-serif",
    }}>
      {children}
    </label>
  );
}

export default function LoginPage() {
  const router                       = useRouter();
  const [email,    setEmail]         = useState("");
  const [password, setPassword]      = useState("");
  const [showPass, setShowPass]      = useState(false);
  const [error,    setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email:    email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        // Read the session to get the role, then redirect accordingly
        const { getSession } = await import("next-auth/react");
        const session = await getSession();
        const role = (session?.user as { role?: string })?.role;

        if (role === "admin")         router.push("/admin");
        else if (role === "employee") router.push("/employee");
        else                          router.push("/");

        router.refresh();
      }
    });
  };

  return (
    <div
      style={{
        minHeight:  "100dvh",
        background: "linear-gradient(160deg, #f5fbff 0%, #edf7fd 45%, #f4fdf9 100%)",
        display:    "flex",
        alignItems: "stretch",
        position:   "relative",
        overflow:   "hidden",
      }}
    >
      {/* ── Ambient blobs ─────────────────────────────────────────────────── */}
      <div aria-hidden style={{ position: "absolute", top: -120, left: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, #c8e9f870 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", bottom: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, #3ecb9a40 0%, transparent 70%)", filter: "blur(55px)", pointerEvents: "none" }} />

      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANEL — brand + coming-soon features (hidden on mobile)
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className="login-left-panel"
        style={{
          flex:           "0 0 50%",
          maxWidth:       "50%",
          background:     "linear-gradient(160deg, #0a1f2e 0%, #0f2d42 60%, #0a1a28 100%)",
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "space-between",
          padding:        "48px 52px",
          position:       "relative",
          overflow:       "hidden",
        }}
      >
        {/* Orbs inside dark panel */}
        <div style={{ position: "absolute", top: -80,  right: -60,  width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(36,150,214,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(62,203,154,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Brand */}
        <div style={{ position: "relative" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "12px", textDecoration: "none", marginBottom: "64px" }}>
            <Image
              src="/logo/2.png"
              alt="Akiro Laundry logo"
              width={44}
              height={44}
              style={{ borderRadius: "14px", objectFit: "contain" }}
            />
            <div>
              <p style={{ fontFamily: "Sora, sans-serif", fontSize: "17px", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.01em" }}>
                Akiro <span style={{ color: "#2496d6" }}>Laundry</span>
              </p>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(36,150,214,0.55)", margin: 0 }}>
                Dili · Timor-Leste
              </p>
            </div>
          </Link>

          {/* Headline */}
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "white", lineHeight: 1.2, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
            The smarter way<br />to manage laundry
          </h1>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: "0 0 48px", maxWidth: "340px" }}>
            Akiro gives your team a powerful yet simple dashboard to manage orders, customers and operations — all in one place.
          </p>

          {/* Feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  style={{
                    display:        "flex",
                    alignItems:     "flex-start",
                    gap:            "14px",
                    padding:        "14px 16px",
                    borderRadius:   "16px",
                    background:     "rgba(255,255,255,0.05)",
                    border:         "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={17} style={{ color: f.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "white", margin: 0, fontFamily: "Sora, sans-serif" }}>{f.title}</p>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: f.color, background: `${f.color}22`, borderRadius: "999px", padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {f.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ position: "relative", paddingTop: "32px" }}>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "20px" }} />
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", fontWeight: 500, margin: 0 }}>
            © {new Date().getFullYear()} Akiro Laundry & Perfume · Dili, Timor-Leste
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANEL — login form
      ════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex:           "1 1 auto",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "40px 24px",
          minHeight:      "100dvh",
          position:       "relative",
        }}
      >
        {/* Mobile-only brand header */}
        <div className="login-mobile-brand" style={{ display: "none", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "12px", textDecoration: "none", marginBottom: "6px" }}>
            <Image
              src="/logo/2.png"
              alt="Akiro Laundry logo"
              width={44}
              height={44}
              style={{ borderRadius: "14px", objectFit: "contain" }}
            />
            <div>
              <p style={{ fontFamily: "Sora, sans-serif", fontSize: "17px", fontWeight: 800, color: "#0a1f2e", margin: 0 }}>
                Akiro <span style={{ color: "#1a7fba" }}>Laundry</span>
              </p>
              <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8ca0b0", margin: 0 }}>
                Dili · Timor-Leste
              </p>
            </div>
          </Link>
        </div>

        {/* Form card */}
        <div
          style={{
            width:        "100%",
            maxWidth:     "400px",
            background:   "white",
            borderRadius: "24px",
            border:       "1.5px solid hsl(210 25% 91%)",
            boxShadow:    "0 8px 40px rgba(26,127,186,0.10), 0 2px 8px rgba(0,0,0,0.04)",
            overflow:     "hidden",
          }}
        >
          {/* Top accent bar */}
          <div style={{ height: "3px", background: "linear-gradient(90deg, #1a7fba, #2496d6, #3ecb9a)" }} />

          <div style={{ padding: "32px 28px 28px" }}>

            {/* Heading */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(26,127,186,0.08)", border: "1px solid rgba(26,127,186,0.15)", borderRadius: "999px", padding: "4px 12px", marginBottom: "12px" }}>
                <Sparkles size={11} style={{ color: "#1a7fba" }} />
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#1a7fba", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Sora, sans-serif" }}>Staff Portal</span>
              </div>
              <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: "22px", fontWeight: 800, color: "#0a1f2e", margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Welcome back
              </h2>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#8ca0b0", margin: 0 }}>
                Sign in to access your dashboard
              </p>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Email */}
              <div>
                <Label>Email</Label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.boxShadow = "0 0 0 3.5px rgba(26,127,186,0.11)"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "hsl(210 20% 88%)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* Password */}
              <div>
                <Label>Password</Label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: "48px" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7fba"; e.currentTarget.style.boxShadow = "0 0 0 3.5px rgba(26,127,186,0.11)"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "hsl(210 20% 88%)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
                  >
                    {showPass
                      ? <EyeOff size={16} style={{ color: "#b0bec9" }} />
                      : <Eye    size={16} style={{ color: "#b0bec9" }} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.20)", borderRadius: "10px", padding: "11px 14px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#dc2626", margin: 0, lineHeight: 1.4 }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isPending}
                style={{
                  marginTop:      "4px",
                  width:          "100%",
                  height:         "50px",
                  borderRadius:   "14px",
                  border:         "none",
                  background:     isPending
                    ? "rgba(26,127,186,0.40)"
                    : "linear-gradient(135deg, #1a7fba 0%, #2496d6 50%, #0f5a85 100%)",
                  boxShadow:      isPending ? "none" : "0 6px 20px rgba(26,127,186,0.32)",
                  color:          "white",
                  fontSize:       "15px",
                  fontWeight:     800,
                  cursor:         isPending ? "not-allowed" : "pointer",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "8px",
                  fontFamily:     "Sora, sans-serif",
                  letterSpacing:  "-0.01em",
                  transition:     "all 0.18s",
                }}
              >
                {isPending
                  ? <><Loader2 size={17} className="animate-spin" /> Signing in…</>
                  : <>Sign in <ArrowRight size={15} /></>}
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "24px 0 20px" }}>
              <div style={{ flex: 1, height: "1px", background: "hsl(210 25% 91%)" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#b0bec9" }}>Customer access</span>
              <div style={{ flex: 1, height: "1px", background: "hsl(210 25% 91%)" }} />
            </div>

            {/* Coming soon register */}
            <div
              style={{
                padding:      "14px 16px",
                borderRadius: "14px",
                background:   "linear-gradient(135deg, #f5fbff, #edf7fd)",
                border:       "1.5px solid #c8e9f8",
                display:      "flex",
                alignItems:   "center",
                gap:          "12px",
              }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(26,127,186,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={16} style={{ color: "#1a7fba" }} />
              </div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 800, color: "#0a1f2e", margin: "0 0 2px", fontFamily: "Sora, sans-serif" }}>
                  Customer accounts coming soon
                </p>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "#8ca0b0", margin: 0, lineHeight: 1.4 }}>
                  Track orders & rewards from the Akiro app. Stay tuned!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile back link */}
        <Link
          href="/"
          style={{ marginTop: "24px", fontSize: "13px", fontWeight: 600, color: "#8ca0b0", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
        >
          ← Back to Akiro
        </Link>
      </div>

      {/* ── Responsive styles ─────────────────────────────────────────────── */}
      <style>{`
        input::placeholder { color: #b0bec9; }

        @media (max-width: 768px) {
          .login-left-panel   { display: none !important; }
          .login-mobile-brand { display: flex !important; }
        }
      `}</style>
    </div>
  );
}