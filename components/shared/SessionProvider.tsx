// components/shared/SessionProvider.tsx
// next-auth/react works the same in v5 — SessionProvider is unchanged
"use client";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}