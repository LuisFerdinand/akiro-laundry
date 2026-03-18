/* eslint-disable react-hooks/set-state-in-effect */
// components/admin/layout/SidebarContext.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  mounted:   boolean;
  toggle:    () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  mounted:   false,
  toggle:    () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });

  return (
    <SidebarContext.Provider value={{ collapsed, mounted, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}