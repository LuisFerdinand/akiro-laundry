// app/login/page.tsx
"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, WashingMachine } from "lucide-react";

export default function LoginPage() {
  const router                        = useRouter();
  const [email,    setEmail]          = useState("");
  const [password, setPassword]       = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [error,    setError]          = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

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
        router.push("/");
        router.refresh();
      }
    });
  };

  return (
    <div style={{
      minHeight: "100svh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #0c2340 50%, #0f3460 100%)",
      padding: "24px 16px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background orbs */}
      {[
        { top: "-80px", right: "-80px",   w: 300, h: 300, opacity: 0.25 },
        { bottom: "-100px", left: "-60px", w: 360, h: 360, opacity: 0.15 },
      ].map((s, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%", pointerEvents: "none",
          width: s.w, height: s.h,
          top: "top" in s ? s.top : undefined,
          bottom: "bottom" in s ? s.bottom : undefined,
          left: "left" in s ? s.left : undefined,
          right: "right" in s ? s.right : undefined,
          background: `radial-gradient(circle, rgba(26,127,186,${s.opacity}) 0%, transparent 70%)`,
        }} />
      ))}

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "400px", position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}>
        <div style={{ height: "3px", background: "linear-gradient(90deg,#1a7fba,#2496d6,#0f5a85)" }} />

        <div style={{ padding: "36px 32px 32px" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "16px",
              background: "linear-gradient(135deg,#1a7fba,#2496d6)",
              boxShadow: "0 8px 24px rgba(26,127,186,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <WashingMachine size={26} style={{ color: "white" }} />
            </div>
            <h1 style={{
              fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "22px",
              color: "white", letterSpacing: "-0.02em", marginBottom: "4px",
            }}>Akiro Laundry</h1>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
              Staff portal — sign in to continue
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Email */}
            <div>
              <label style={{
                display: "block", fontSize: "10px", fontWeight: 800,
                color: "rgba(255,255,255,0.5)", textTransform: "uppercase",
                letterSpacing: "0.1em", marginBottom: "7px",
              }}>Email</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com" autoComplete="email"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px", color: "white", fontSize: "14px", outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(36,150,214,0.6)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: "block", fontSize: "10px", fontWeight: 800,
                color: "rgba(255,255,255,0.5)", textTransform: "uppercase",
                letterSpacing: "0.1em", marginBottom: "7px",
              }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 44px 12px 14px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px", color: "white", fontSize: "14px", outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(36,150,214,0.6)"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: "absolute", right: "12px", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: "4px",
                }}>
                  {showPass
                    ? <EyeOff size={15} style={{ color: "rgba(255,255,255,0.35)" }} />
                    : <Eye    size={15} style={{ color: "rgba(255,255,255,0.35)" }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(225,29,72,0.12)",
                border: "1.5px solid rgba(225,29,72,0.3)",
                borderRadius: "8px", padding: "10px 14px",
              }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#fda4af" }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit} disabled={isPending}
              style={{
                marginTop: "6px", width: "100%", height: "48px",
                borderRadius: "10px", border: "none",
                background: isPending
                  ? "rgba(255,255,255,0.1)"
                  : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
                boxShadow: isPending ? "none" : "0 6px 20px rgba(26,127,186,0.5)",
                color: "white", fontSize: "14px", fontWeight: 800,
                cursor: isPending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending
                ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      <style>{`input::placeholder{color:rgba(255,255,255,0.2)}`}</style>
    </div>
  );
}