// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight:      "100dvh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "24px",
        background:     "linear-gradient(160deg, #f5fbff 0%, #edf7fd 45%, #f4fdf9 100%)",
        position:       "relative",
        overflow:       "hidden",
      }}
    >
      {/* Ambient blobs */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: -120, left: -120,
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, #c8e9f870 0%, transparent 70%)",
          filter: "blur(60px)", pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute", bottom: -80, right: -80,
          width: 360, height: 360, borderRadius: "50%",
          background: "radial-gradient(circle, #3ecb9a40 0%, transparent 70%)",
          filter: "blur(55px)", pointerEvents: "none",
        }}
      />

      <div
        style={{
          position:      "relative",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          textAlign:     "center",
          maxWidth:      "480px",
          width:         "100%",
          gap:           "0",
        }}
      >
        {/* Washing machine illustration */}
        <div style={{ marginBottom: "32px", position: "relative" }}>
          {/* Machine body */}
          <div
            style={{
              width:        "120px",
              height:       "130px",
              borderRadius: "20px",
              background:   "linear-gradient(160deg, #ffffff, #edf7fd)",
              border:       "2px solid #c8e9f8",
              boxShadow:    "0 12px 40px rgba(26,127,186,0.14), 0 2px 8px rgba(26,127,186,0.08)",
              display:      "flex",
              flexDirection:"column",
              alignItems:   "center",
              justifyContent:"center",
              gap:          "8px",
              margin:       "0 auto",
              position:     "relative",
            }}
          >
            {/* Door porthole */}
            <div
              style={{
                width:        "72px",
                height:       "72px",
                borderRadius: "50%",
                border:       "3px solid #c8e9f8",
                background:   "linear-gradient(135deg, #edf7fd, #dff5f0)",
                display:      "flex",
                alignItems:   "center",
                justifyContent:"center",
                position:     "relative",
                overflow:     "hidden",
              }}
            >
              {/* Spinning clothes */}
              <div
                style={{
                  width:     "40px",
                  height:    "40px",
                  borderRadius: "50%",
                  background: "conic-gradient(#1a7fba 0deg 90deg, #3ecb9a 90deg 180deg, #ffcc00 180deg 270deg, #ff7558 270deg 360deg)",
                  animation: "spin 2s linear infinite",
                  opacity:   0.7,
                }}
              />
              {/* Inner ring */}
              <div style={{ position: "absolute", width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)" }} />
            </div>

            {/* Control dot */}
            <div style={{ display: "flex", gap: "5px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1a7fba" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8e9f8" }} />
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c8e9f8" }} />
            </div>
          </div>

          {/* Soap bubbles */}
          {[
            { size: 12, top: -8,  left: 20,  delay: "0s",    color: "#c8e9f8" },
            { size: 8,  top: -18, left: 60,  delay: "0.4s",  color: "#3ecb9a33" },
            { size: 10, top: -6,  left: 95,  delay: "0.8s",  color: "#1a7fba33" },
            { size: 6,  top: -22, left: 45,  delay: "1.2s",  color: "#ffcc0044" },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                position:    "absolute",
                width:       b.size,
                height:      b.size,
                borderRadius:"50%",
                background:  b.color,
                border:      "1px solid rgba(200,233,248,0.6)",
                top:         b.top,
                left:        b.left,
                animation:   `float 2s ease-in-out ${b.delay} infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* 404 number */}
        <div
          style={{
            fontFamily:    "Sora, sans-serif",
            fontSize:      "clamp(5rem, 20vw, 7rem)",
            fontWeight:    800,
            lineHeight:    1,
            letterSpacing: "-0.04em",
            color:         "transparent",
            backgroundImage: "linear-gradient(135deg, #1a7fba 0%, #2496d6 40%, #3ecb9a 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip:"text",
            marginBottom:  "16px",
            userSelect:    "none",
          }}
        >
          404
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily:  "Sora, sans-serif",
            fontSize:    "clamp(1.4rem, 5vw, 1.9rem)",
            fontWeight:  800,
            color:       "#0a1f2e",
            margin:      "0 0 12px",
            lineHeight:  1.2,
          }}
        >
          This page got lost in the wash
        </h1>

        {/* Subtext */}
        <p
          style={{
            fontSize:    "15px",
            fontWeight:  500,
            color:       "#607080",
            lineHeight:  1.65,
            margin:      "0 0 36px",
            maxWidth:    "360px",
          }}
        >
          Looks like the page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        {/* Buttons */}
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            gap:           "12px",
            width:         "100%",
            maxWidth:      "280px",
          }}
        >
          <Link
            href="/"
            style={{
              display:        "block",
              padding:        "14px 24px",
              borderRadius:   "16px",
              background:     "linear-gradient(135deg, #1a7fba, #2496d6)",
              color:          "white",
              textDecoration: "none",
              fontSize:       "14px",
              fontWeight:     800,
              fontFamily:     "Sora, sans-serif",
              boxShadow:      "0 6px 20px rgba(26,127,186,0.32)",
              textAlign:      "center",
              letterSpacing:  "-0.01em",
            }}
          >
            Back to Home
          </Link>

          <Link
            href="/#contact"
            style={{
              display:        "block",
              padding:        "14px 24px",
              borderRadius:   "16px",
              border:         "1.5px solid #c8e9f8",
              background:     "white",
              color:          "#1a7fba",
              textDecoration: "none",
              fontSize:       "14px",
              fontWeight:     700,
              fontFamily:     "Sora, sans-serif",
              textAlign:      "center",
              boxShadow:      "0 2px 8px rgba(26,127,186,0.07)",
            }}
          >
            Contact Us
          </Link>
        </div>

        {/* Brand footer */}
        <div
          style={{
            marginTop:   "48px",
            display:     "flex",
            alignItems:  "center",
            gap:         "8px",
            opacity:     0.5,
          }}
        >
          <div
            style={{
              width:          "28px",
              height:         "28px",
              borderRadius:   "9px",
              background:     "linear-gradient(135deg, #edf7fd, #c8e9f8)",
              border:         "1.5px solid #c8e9f8",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="#1a7fba" strokeWidth="1.8"/>
              <circle cx="12" cy="13" r="4" stroke="#1a7fba" strokeWidth="1.8"/>
              <circle cx="7.5" cy="7.5" r="1" fill="#ffcc00"/>
              <circle cx="10.5" cy="7.5" r="1" fill="#3ecb9a"/>
            </svg>
          </div>
          <span
            style={{
              fontFamily:  "Sora, sans-serif",
              fontSize:    "13px",
              fontWeight:  800,
              color:       "#0a1f2e",
            }}
          >
            Akiro <span style={{ color: "#1a7fba" }}>Laundry</span>
          </span>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin  { from { transform: rotate(0deg)   } to { transform: rotate(360deg) } }
        @keyframes float { from { transform: translateY(0)  } to { transform: translateY(-8px) } }
      `}</style>
    </div>
  );
}