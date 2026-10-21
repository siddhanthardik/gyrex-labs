/**
 * GYREX LABS — CUSTOM BRANDED DOMAIN ROUTING SERVICE
 *
 * Implements secure hostname resolution, path rewriting, administrative isolation,
 * and security protections for custom branded domains.
 */

import { NextRequest, NextResponse } from "next/server";
import { normalizeHostname } from "@/lib/utils/hostname";

// Known Gyrex platform hostnames (never treated as custom branded domains)
const PLATFORM_HOSTNAMES = new Set([
  "labs.gyrex.in",
  "admin-labs.gyrex.in",
  "fallback.gyrex.in",
  "gyrex.in",
  "localhost",
  "127.0.0.1",
]);

/**
 * Feature flag for Custom Domain Edge Routing.
 * Defaults to FALSE in production until Cloudflare for SaaS and Nginx SNI are validated.
 */
let routingFeatureFlagOverride: boolean | null = null;

export function isCustomDomainRoutingEnabled(): boolean {
  if (routingFeatureFlagOverride !== null) {
    return routingFeatureFlagOverride;
  }
  return process.env.GYREX_ENABLE_CUSTOM_DOMAINS === "true";
}

export function setCustomDomainRoutingFeatureFlagForTesting(enabled: boolean | null): void {
  routingFeatureFlagOverride = enabled;
}

/**
 * Checks whether an incoming host is an official Gyrex platform hostname.
 */
export function isPlatformHostname(rawHost: string | null | undefined): boolean {
  if (!rawHost) return true;
  const host = normalizeHostname(rawHost);
  if (!host) return true;

  if (PLATFORM_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".gyrex.in")) return true;
  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) return true;

  return false;
}

export interface CustomDomainResolution {
  labId: string;
  slug: string;
  domain: string;
}

export type DomainResolver = (host: string) => Promise<CustomDomainResolution | null>;

export interface RoutingDecision {
  action: "passthrough" | "rewrite" | "redirect" | "not_found";
  rewrittenPath?: string;
  redirectUrl?: string;
  headers?: Record<string, string>;
  statusCode?: number;
}

// Protected administrative and internal path prefixes blocked on custom branded domains
const BLOCKED_ADMIN_PREFIXES = [
  "/superadmin",
  "/api/superadmin",
  "/lab",
  "/api/lab",
  "/login",
];

// Valid patient storefront paths allowed on custom domains
const ALLOWED_STOREFRONT_ROOT_PATHS = new Set([
  "",
  "/",
  "/tests",
  "/packages",
  "/cart",
  "/checkout",
  "/prescription",
  "/reports",
]);

/**
 * Evaluates an incoming HTTP request for custom-domain routing.
 * Strictly enforces:
 * 1. Administrative route blocking (superadmin and lab dashboards blocked on custom domains)
 * 2. Hostname normalization and validation
 * 3. Rewriting to the tenant's patient storefront (/[labSlug]/...)
 * 4. Preservation of public API routes (/api/patient/*, /api/webhooks/*, /api/files/*)
 */
export async function evaluateCustomDomainRouting(
  request: NextRequest,
  customResolver?: DomainResolver
): Promise<RoutingDecision> {
  // If feature flag is disabled, bypass custom domain routing entirely
  if (!isCustomDomainRoutingEnabled()) {
    return { action: "passthrough" };
  }

  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = normalizeHostname(rawHost);

  // If request is on a platform domain (e.g. labs.gyrex.in), pass through normally
  if (!host || isPlatformHostname(host)) {
    return { action: "passthrough" };
  }

  const pathname = request.nextUrl.pathname;

  // 1. Administrative Route Isolation
  // Superadmin and Lab Admin dashboards must NEVER be accessible on customer domains
  // to avoid cross-tenant session leaks and cookie fixation.
  for (const adminPrefix of BLOCKED_ADMIN_PREFIXES) {
    if (pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`)) {
      return {
        action: "redirect",
        redirectUrl: `https://labs.gyrex.in/login?callbackUrl=${encodeURIComponent(pathname)}`,
        statusCode: 302,
      };
    }
  }

  // 2. Resolve Active Verified Custom Domain
  let resolved: CustomDomainResolution | null = null;
  if (customResolver) {
    resolved = await customResolver(host);
  } else {
    const { getVerifiedActiveDomainForHost } = await import("./domain-service");
    resolved = await getVerifiedActiveDomainForHost(host);
  }

  // If hostname is not registered or not in ACTIVE state, return 404
  if (!resolved) {
    return { action: "not_found", statusCode: 404 };
  }

  // 3. Skip rewriting for static assets or shared public endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|css|js|woff|woff2)$/)
  ) {
    return {
      action: "passthrough",
      headers: {
        "x-custom-domain": resolved.domain,
        "x-lab-slug": resolved.slug,
        "x-lab-id": resolved.labId,
      },
    };
  }

  // 4. Patient API routes (/api/patient/*, /api/labs/*, /api/files/*)
  // Forward as-is but attach validated tenant context headers
  if (pathname.startsWith("/api/")) {
    return {
      action: "passthrough",
      headers: {
        "x-custom-domain": resolved.domain,
        "x-lab-slug": resolved.slug,
        "x-lab-id": resolved.labId,
      },
    };
  }

  // 5. Storefront URL Rewriting:
  // Maps:
  //   /                      -> /[labSlug]
  //   /tests                 -> /[labSlug]/tests
  //   /packages              -> /[labSlug]/packages
  //   /cart                  -> /[labSlug]/cart
  //   /checkout              -> /[labSlug]/checkout
  //   /prescription          -> /[labSlug]/prescription
  //   /reports               -> /[labSlug]/reports
  //   /booking/:orderNumber  -> /[labSlug]/booking/:orderNumber
  let rewrittenPath: string;

  if (pathname === "" || pathname === "/") {
    rewrittenPath = `/${resolved.slug}`;
  } else if (pathname.startsWith(`/${resolved.slug}`)) {
    // If user already typed /slug on the custom domain, preserve it
    rewrittenPath = pathname;
  } else {
    rewrittenPath = `/${resolved.slug}${pathname}`;
  }

  return {
    action: "rewrite",
    rewrittenPath,
    headers: {
      "x-custom-domain": resolved.domain,
      "x-lab-slug": resolved.slug,
      "x-lab-id": resolved.labId,
    },
  };
}
