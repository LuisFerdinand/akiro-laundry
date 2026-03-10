// components/employee/TopBar.tsx
import React from "react";

export function TopBar() {
  return (
    <header className="brand-gradient px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">AKIRO</p>
          <p className="text-white/60 text-[10px] tracking-widest uppercase">
            Laundry &amp; Perfume
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white/60 text-[10px]">Open Every Day</p>
        <p className="text-white text-xs font-semibold">08:00 – 20:00</p>
      </div>
    </header>
  );
}