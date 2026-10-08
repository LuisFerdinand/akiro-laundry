// components/employee/dashboard/confetti.ts
// A one-shot confetti burst for dashboard milestones — a throwaway full-screen
// canvas, no dependency. Skipped entirely when the device asks for reduced motion.

const COLORS   = ["#1a7fba", "#38bdf8", "#ffcc00", "#3ecb9a", "#ff7558", "#a78bfa"];
const DURATION = 2400; // ms

export function burstConfetti(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const width  = window.innerWidth;
  const height = window.innerHeight;
  const dpr    = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.createElement("canvas");
  canvas.width  = width * dpr;
  canvas.height = height * dpr;
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "200",
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  // Two cannons in the lower corners, firing up and inwards.
  const pieces = Array.from({ length: 150 }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle    = ((fromLeft ? -62 : -118) * Math.PI) / 180 + (Math.random() - 0.5) * 0.8;
    const speed    = 10 + Math.random() * 10;
    return {
      x:     fromLeft ? -10 : width + 10,
      y:     height * 0.8,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      w:     6 + Math.random() * 6,
      h:     9 + Math.random() * 8,
      rot:   Math.random() * Math.PI,
      spin:  (Math.random() - 0.5) * 0.35,
      color: COLORS[i % COLORS.length],
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION);
    for (const p of pieces) {
      p.vy  += 0.34;  // gravity
      p.vx  *= 0.99;  // drag
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      // Squash the height with the spin so each piece flutters.
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
      ctx.restore();
    }
    if (elapsed < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
