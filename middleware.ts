// middleware.ts  (project root)
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/lib/db/schema";

type AuthedRequest = NextRequest & {
  auth: { user?: { role?: UserRole } } | null;
};

export default auth((req: AuthedRequest) => {
  const { pathname } = req.nextUrl;
  const role         = req.auth?.user?.role;

  // ── Protected routes only ─────────────────────────────────────────────────
  // Public pages (/, /login, /register, static assets) are never intercepted
  // because the matcher below excludes them entirely.

  // Not authenticated — send to login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes: only admins allowed
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(
      new URL(role === "employee" ? "/employee" : "/login", req.url)
    );
  }

  // Employee routes: employee or admin allowed
  if (
    pathname.startsWith("/employee") &&
    role !== "employee" &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // All other authenticated requests (including admin/employee visiting "/")
  // pass through freely.
  return NextResponse.next();
});

export const config = {
  // Only intercept protected portal routes.
  // The public landing page ("/") and login page are NOT in this list,
  // so any logged-in user can visit them without being redirected.
  matcher: ["/admin/:path*", "/employee/:path*"],
};