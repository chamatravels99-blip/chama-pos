import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
import { SessionPayload } from "@/types";

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    return new TextEncoder().encode("chama_pos_local_development_fallback_secret_32bytes");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  let sessionPayload: SessionPayload | null = null;

  if (sessionCookie?.value) {
    try {
      const secret = getSecretKey();
      const { payload } = await jwtVerify(sessionCookie.value, secret);
      sessionPayload = payload as unknown as SessionPayload;
    } catch {
      sessionPayload = null;
    }
  }

  const isAuthenticated = Boolean(sessionPayload?.userId);

  // 3. Login page handling
  if (pathname === "/login") {
    // If already authenticated, redirect straight to dashboard
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 4. Protect all app routes (/dashboard, /products, /sales, /users, etc.)
  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/suppliers") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin");

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 5. Protect /admin/* specifically - PLATFORM_OWNER/PLATFORM_ADMIN authority only
  if (pathname.startsWith("/admin")) {
    const isPlatformAdmin =
      sessionPayload?.role === "PLATFORM_OWNER" ||
      sessionPayload?.role === "PLATFORM_ADMIN" ||
      sessionPayload?.role === "SUPER_ADMIN";

    if (!isPlatformAdmin) {
      // Non-admin user attempting to access platform console -> redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
