// components/employee/TopBar.tsx
import React from "react";
import { Sparkles } from "lucide-react";

export function TopBar() {
  return (
    <header className="akiro-topbar px-5 py-3 flex items-center justify-between sticky top-0 z-50">
      {/* Logo mark */}
      <div className="flex items-center gap-3">
        <div className="akiro-logo-bubble">
          <Sparkles size={16} className="text-brand" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-brand-dark font-extrabold text-base leading-none tracking-tight">
            Akiro
          </p>
          <p className="text-brand/60 text-[9px] tracking-[0.18em] uppercase font-semibold mt-0.5">
            Laundry &amp; Perfume
          </p>
        </div>
      </div>

      {/* Hours pill */}
      <div className="akiro-hours-pill">
        <span className="akiro-dot" />
        <div className="text-right leading-none">
          <p className="text-brand-dark text-xs font-bold">08:00 – 20:00</p>
        </div>
      </div>
    </header>
  );
}