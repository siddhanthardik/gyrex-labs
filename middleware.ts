import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth/session";
import { isPlatformRole } from "./lib/auth/permissions";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, Next internal files, and public auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/lab/onboarding/signup" ||
    pathname === "/lab/onboarding/verify" ||
    pathname.startsWith("/api/files/logo/") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // 2. CSRF Origin Verification for state-changing API endpoints
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/")
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: "CSRF origin validation failed: Invalid cross-origin request." },
          { status: 403 }
        );
      }
    }
  }

  // 3. Retrieve and verify session token from HTTP-only cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 4. Protect Superadmin routes (/superadmin/* and /api/superadmin/*)
  const isSuperadminRoute =
    pathname === "/superadmin" ||
    pathname.startsWith("/superadmin/") ||
    pathname === "/api/superadmin" ||
    pathname.startsWith("/api/superadmin/");
  if (isSuperadminRoute) {
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Tenant users (LAB_OWNER, LAB_ADMIN, LAB_STAFF) MUST NEVER access Superadmin!
    if (!isPlatformRole(session.role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Access denied: Platform administrator role required." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/login?error=forbidden", request.url));
    }
  }

  // 5. Protect Laboratory Admin routes (/lab/* and /api/lab/*)
  const isLabRoute =
    pathname === "/lab" ||
    pathname.startsWith("/lab/") ||
    pathname === "/api/lab" ||
    pathname.startsWith("/api/lab/");
  if (isLabRoute) {
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Platform admins are allowed, or laboratory members with valid lab memberships
    const hasLabMembership = session.labMemberships.length > 0 || isPlatformRole(session.role);
    if (!hasLabMembership) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Access denied: No laboratory membership found." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/login?error=no_lab_membership", request.url));
    }
  }

  // 6. Forward request with authenticated user context in headers
  const response = NextResponse.next();
  if (session) {
    response.headers.set("x-user-id", session.userId);
    response.headers.set("x-user-role", session.role);
    if (session.activeLabId) {
      response.headers.set("x-lab-id", session.activeLabId);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
