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
  const role = req.auth?.user?.role;

  // Not authenticated — send to login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // "user" role has no portal access
  if (role === "user") {
    // Let them land on login or a future customer-facing page
    if (pathname.startsWith("/admin") || pathname.startsWith("/employee")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(
      new URL(role === "employee" ? "/employee" : "/login", req.url)
    );
  }

  // Employee routes — employee or admin only
  if (pathname.startsWith("/employee") && role !== "employee" && role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/employee/:path*", "/admin/:path*"],
};