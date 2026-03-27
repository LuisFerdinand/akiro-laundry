// proxy.ts  (project root)
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/lib/db/schema";

type AuthedRequest = NextRequest & {
  auth: { user?: { role?: UserRole } } | null;
};

// Routes that are always public — never redirect these
const PUBLIC_PREFIXES = ["/", "/login", "/api/auth"];

export default auth((req: AuthedRequest) => {
  const { pathname } = req.nextUrl;
  const role         = req.auth?.user?.role;

  // Always allow public routes through
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Not authenticated — send to login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(
      new URL(role === "employee" ? "/employee" : "/login", req.url)
    );
  }

  // Employee routes — employee or admin allowed
  if (
    pathname.startsWith("/employee") &&
    role !== "employee" &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Match admin + employee routes only; public routes never hit this middleware
  matcher: ["/admin/:path*", "/employee/:path*"],
};