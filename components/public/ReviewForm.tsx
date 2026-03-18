// components/public/ReviewForm.tsx
"use client";

import { useState, useTransition } from "react";
import Link                        from "next/link";
import { Star, CheckCircle2, Loader2, ArrowLeft, Sparkles, Heart } from "lucide-react";
import { submitTestimonial } from "@/lib/actions/public/testimonial.actions";

// ── Star labels ───────────────────────────────────────────────────────────────
const STAR_LABELS: Record<number, string> = {
  1: "Not great",
  2: "It was okay",
  3: "Good service",
  4: "Really happy!",
  5: "Absolutely loved it! ✨",
};

// ── Role suggestions ──────────────────────────────────────────────────────────
const ROLE_SUGGESTIONS = [
  "Regular Customer",
  "Business Owner",
  "Hotel Manager",
  "Working Parent",
  "University Student",
  "Restaurant Owner",
];

// ── Shared input style ────────────────────────────────────────────────────────
const base: React.CSSProperties = {
  width:        "100%",
  padding:      "13px 16px",
  border:       "1.5px solid hsl(210 20% 88%)",
  borderRadius: "14px",
  fontSize:     "15px",
  fontWeight:   500,
  background:   "white",
  color:        "#0a1f2e",
  outline:      "none",
  boxSizing:    "border-box",
  WebkitAppearance: "none",
  fontFamily:   "Nunito, sans-serif",
  transition:   "border-color 0.18s, box-shadow 0.18s",
};

function focus(el: HTMLElement) {
  el.style.borderColor = "#1a7fba";
  el.style.boxShadow   = "0 0 0 4px rgba(26,127,186,0.10)";
}
function blur(el: HTMLElement) {
  el.style.borderColor = "hsl(210 20% 88%)";
  el.style.boxShadow   = "none";
}

// ── FieldLabel ────────────────────────────────────────────────────────────────
function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <label style={{
        display:       "block",
        fontSize:      "12px",
        fontWeight:    800,
        color:         "#607080",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        fontFamily:    "Sora, sans-serif",
      }}>
        {children}
      </label>
      {hint && (
        <p style={{ fontSize: "12px", color: "#9db0bf", fontWeight: 500, marginTop: "3px" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Star picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div>
      {/* Stars */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`${s} star`}
            onClick={() => onChange(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background:  "none",
              border:      "none",
              padding:     "4px",
              cursor:      "pointer",
              transform:   display >= s ? "scale(1.15)" : "scale(1)",
              transition:  "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)",
              lineHeight:  1,
            }}
          >
            <Star
              size={38}
              fill={display >= s ? "#ffcc00" : "transparent"}
              stroke={display >= s ? "#ffcc00" : "#d0dce8"}
              strokeWidth={display >= s ? 0 : 1.5}
            />
          </button>
        ))}
      </div>

      {/* Label */}
      <div
        style={{
          height:       "24px",
          fontSize:     "14px",
          fontWeight:   700,
          color:        display ? "#1a7fba" : "#b0bec9",
          fontFamily:   "Sora, sans-serif",
          transition:   "color 0.15s",
        }}
      >
        {display ? STAR_LABELS[display] : "Tap to rate"}
      </div>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ name }: { name: string }) {
  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        textAlign:      "center",
        padding:        "40px 24px 48px",
        gap:            "20px",
        animation:      "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Icon */}
      <div
        style={{
          width:          "80px",
          height:         "80px",
          borderRadius:   "28px",
          background:     "linear-gradient(135deg, #3ecb9a22, #10b98122)",
          border:         "2px solid #3ecb9a40",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        <CheckCircle2 size={40} style={{ color: "#3ecb9a" }} />
      </div>

      <div>
        <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: "22px", fontWeight: 800, color: "#0a1f2e", margin: "0 0 8px" }}>
          Thank you, {name.split(" ")[0]}!
        </h2>
        <p style={{ fontSize: "15px", color: "#607080", fontWeight: 500, lineHeight: 1.6, maxWidth: "280px", margin: "0 auto" }}>
          Your review has been submitted and will appear on our website after a quick review.
        </p>
      </div>

      {/* Hearts decoration */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[...Array(5)].map((_, i) => (
          <Heart
            key={i}
            size={16}
            fill="#ffcc00"
            stroke="none"
            style={{ opacity: 0.6 + i * 0.08, transform: `scale(${0.8 + i * 0.1})` }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "300px" }}>
        <Link
          href="/"
          style={{
            display:        "block",
            padding:        "13px",
            borderRadius:   "14px",
            background:     "linear-gradient(135deg, #1a7fba, #2496d6)",
            color:          "white",
            textDecoration: "none",
            fontSize:       "14px",
            fontWeight:     800,
            fontFamily:     "Sora, sans-serif",
            boxShadow:      "0 4px 14px rgba(26,127,186,0.30)",
            textAlign:      "center",
          }}
        >
          Back to Home
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding:      "13px",
            borderRadius: "14px",
            border:       "1.5px solid hsl(210 20% 88%)",
            background:   "white",
            color:        "#607080",
            fontSize:     "14px",
            fontWeight:   700,
            cursor:       "pointer",
            fontFamily:   "Sora, sans-serif",
          }}
        >
          Leave another review
        </button>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function ReviewForm() {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted]  = useState(false);
  const [error,     setError]      = useState<string | null>(null);

  const [name,   setName]   = useState("");
  const [role,   setRole]   = useState("");
  const [rating, setRating] = useState(0);
  const [body,   setBody]   = useState("");

  const MAX_CHARS   = 400;
  const charsLeft   = MAX_CHARS - body.length;
  const charsWarn   = charsLeft < 50;

  const handleSubmit = () => {
    setError(null);

    if (!rating) { setError("Please choose a star rating before submitting."); return; }
    if (!name.trim())  { setError("Please enter your name."); return; }
    if (!role.trim())  { setError("Please tell us your role."); return; }
    if (body.trim().length < 20) { setError("Your review is a bit short — tell us a little more!"); return; }

    startTransition(async () => {
      const result = await submitTestimonial({ authorName: name, authorRole: role, rating, body });
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  };

  if (submitted) {
    return (
      <div className="akiro-page-bg" style={{ minHeight: "100dvh" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 0 env(safe-area-inset-bottom, 24px)" }}>
          <SuccessScreen name={name} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="akiro-page-bg"
      style={{
        minHeight:  "100dvh",
        paddingBottom: "env(safe-area-inset-bottom, 24px)",
      }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 0 40px" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            position:   "relative",
            overflow:   "hidden",
            padding:    "56px 24px 36px",
            background: "linear-gradient(160deg, #0a1f2e 0%, #0f2d42 60%, #0a1a28 100%)",
          }}
        >
          {/* Decorative orbs */}
          <div style={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(36,150,214,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: -20, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(62,203,154,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Back link */}
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.50)", fontSize: "13px", fontWeight: 600, textDecoration: "none", marginBottom: "20px" }}
          >
            <ArrowLeft size={14} />
            Back to Akiro
          </Link>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "14px", background: "linear-gradient(135deg,rgba(26,127,186,0.30),rgba(36,150,214,0.20))", border: "1.5px solid rgba(36,150,214,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} style={{ color: "#2496d6" }} />
            </div>
            <div>
              <p style={{ fontFamily: "Sora, sans-serif", fontSize: "16px", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.01em" }}>
                Akiro <span style={{ color: "#2496d6" }}>Laundry</span>
              </p>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(36,150,214,0.60)", margin: 0 }}>
                Dili · Timor-Leste
              </p>
            </div>
          </div>

          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: "clamp(1.5rem, 6vw, 1.9rem)", fontWeight: 800, color: "white", margin: "0 0 8px", lineHeight: 1.2 }}>
            How was your experience?
          </h1>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.6 }}>
            Your review helps us improve and lets other customers know what to expect. It only takes a minute!
          </p>
        </div>

        {/* ── Form card ───────────────────────────────────────────────────── */}
        <div
          style={{
            margin:       "0 12px",
            marginTop:    "-20px",
            background:   "white",
            borderRadius: "24px",
            border:       "1.5px solid hsl(210 25% 91%)",
            boxShadow:    "0 8px 32px rgba(26,127,186,0.10)",
            overflow:     "hidden",
          }}
        >
          <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* ── Star rating ──────────────────────────────────────────────── */}
            <div>
              <FieldLabel hint="Tap a star to rate your experience">
                Overall Rating <span style={{ color: "#ef4444" }}>*</span>
              </FieldLabel>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            {/* ── Divider ──────────────────────────────────────────────────── */}
            <div style={{ height: "1px", background: "hsl(210 25% 93%)" }} />

            {/* ── Name ─────────────────────────────────────────────────────── */}
            <div>
              <FieldLabel hint="This is how your name will appear in the review">
                Your Name <span style={{ color: "#ef4444" }}>*</span>
              </FieldLabel>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Santos"
                autoComplete="name"
                style={base}
                onFocus={(e) => focus(e.target)}
                onBlur={(e)  => blur(e.target)}
              />
            </div>

            {/* ── Role ─────────────────────────────────────────────────────── */}
            <div>
              <FieldLabel hint="How do you use our service?">
                Your Role <span style={{ color: "#ef4444" }}>*</span>
              </FieldLabel>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Regular Customer, Hotel Manager…"
                style={base}
                onFocus={(e) => focus(e.target)}
                onBlur={(e)  => blur(e.target)}
              />
              {/* Quick-pick chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "10px" }}>
                {ROLE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRole(s)}
                    style={{
                      padding:      "5px 12px",
                      borderRadius: "999px",
                      border:       `1.5px solid ${role === s ? "#1a7fba" : "hsl(210 20% 88%)"}`,
                      background:   role === s ? "rgba(26,127,186,0.08)" : "white",
                      color:        role === s ? "#1a7fba" : "#8ca0b0",
                      fontSize:     "12px",
                      fontWeight:   700,
                      cursor:       "pointer",
                      transition:   "all 0.15s",
                      fontFamily:   "Nunito, sans-serif",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Review body ───────────────────────────────────────────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
                <FieldLabel hint="What did you love? What could be better?">
                  Your Review <span style={{ color: "#ef4444" }}>*</span>
                </FieldLabel>
                <span style={{ fontSize: "11px", fontWeight: 600, color: charsWarn ? "#f59e0b" : "#b0bec9" }}>
                  {charsLeft} left
                </span>
              </div>
              <textarea
                value={body}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) setBody(e.target.value);
                }}
                placeholder="Tell us about your experience with Akiro Laundry — the quality, speed, team, anything you'd like to share…"
                rows={5}
                style={{ ...base, resize: "none", lineHeight: 1.65 }}
                onFocus={(e) => focus(e.target)}
                onBlur={(e)  => blur(e.target)}
              />
              {/* Progress bar */}
              <div style={{ height: "3px", borderRadius: "999px", background: "hsl(210 25% 92%)", marginTop: "8px", overflow: "hidden" }}>
                <div style={{
                  height:     "100%",
                  borderRadius: "999px",
                  width:      `${(body.length / MAX_CHARS) * 100}%`,
                  background: body.length > MAX_CHARS * 0.85
                    ? "linear-gradient(90deg,#f59e0b,#ef4444)"
                    : "linear-gradient(90deg,#1a7fba,#3ecb9a)",
                  transition: "width 0.2s, background 0.3s",
                }} />
              </div>
            </div>

            {/* ── Error ─────────────────────────────────────────────────────── */}
            {error && (
              <div
                style={{
                  padding:      "12px 14px",
                  borderRadius: "12px",
                  background:   "rgba(239,68,68,0.07)",
                  border:       "1.5px solid rgba(239,68,68,0.18)",
                  fontSize:     "13px",
                  fontWeight:   600,
                  color:        "#dc2626",
                  lineHeight:   1.5,
                }}
              >
                {error}
              </div>
            )}

            {/* ── Submit ────────────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              style={{
                width:        "100%",
                padding:      "15px",
                borderRadius: "16px",
                border:       "none",
                background:   pending
                  ? "rgba(26,127,186,0.45)"
                  : "linear-gradient(135deg, #1a7fba 0%, #2496d6 50%, #0f5a85 100%)",
                color:        "white",
                fontSize:     "15px",
                fontWeight:   800,
                cursor:       pending ? "not-allowed" : "pointer",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                gap:          "8px",
                boxShadow:    pending ? "none" : "0 6px 20px rgba(26,127,186,0.35)",
                transition:   "all 0.15s",
                fontFamily:   "Sora, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              {pending
                ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                : <><Sparkles size={16} /> Submit My Review</>}
            </button>

            {/* Fine print */}
            <p style={{ textAlign: "center", fontSize: "11px", color: "#b0bec9", fontWeight: 500, margin: "0 0 4px", lineHeight: 1.6 }}>
              Your review will be visible after a quick approval by our team.
              We never share your personal information.
            </p>
          </div>
        </div>

        {/* ── Bottom spacing for mobile nav bars ─────────────────────────── */}
        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
}