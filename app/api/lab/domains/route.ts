import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getLabDomain,
  registerCustomDomain,
  refreshCustomDomainStatus,
  disconnectCustomDomain,
  buildDnsInstructions,
  ConflictError,
  ServiceUnavailableError,
} from "@/services/lab/domain-service";
import { isLabCustomDomainEntitled } from "@/services/subscription/entitlement-service";

/**
 * Maps errors to consistent HTTP status codes:
 * 400 Bad Request
 * 401 Unauthorized
 * 403 Forbidden
 * 409 Conflict
 * 503 Service Unavailable
 * 500 Internal Server Error
 */
function mapErrorToStatus(error: any): number {
  if (error?.statusCode && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  if (error instanceof ConflictError || error?.name === "ConflictError") {
    return 409;
  }
  if (error instanceof ServiceUnavailableError || error?.name === "ServiceUnavailableError") {
    return 503;
  }
  if (error?.name === "AuthorizationError" || error?.message?.includes("Access denied")) {
    return 403;
  }
  if (
    error?.message?.includes("already registered by another laboratory") ||
    error?.message?.includes("cooldown period") ||
    error?.message?.includes("already has custom domain")
  ) {
    return 409;
  }
  if (
    error?.message?.includes("Invalid custom domain") ||
    error?.message?.includes("is not allowed") ||
    error?.message?.includes("valid domain name string is required") ||
    error?.message?.includes("too short") ||
    error?.message?.includes("not permitted")
  ) {
    return 400;
  }
  return 500;
}

/**
 * GET /api/lab/domains
 * Returns the authenticated lab's default storefront URL, custom-domain entitlement status,
 * currently configured domain, and public DNS instructions.
 */
export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_READ);
    const labId = labMembership.labId;

    const [isEntitled, domain] = await Promise.all([
      isLabCustomDomainEntitled(labId),
      getLabDomain(labId),
    ]);

    const defaultStorefrontUrl = `https://labs.gyrex.in/${labMembership.slug}`;

    return NextResponse.json({
      success: true,
      isEntitled,
      defaultStorefrontUrl,
      domain,
      dnsInstructions: buildDnsInstructions(domain),
    });
  } catch (error: any) {
    const status = mapErrorToStatus(error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve domain settings." },
      { status }
    );
  }
}

/**
 * POST /api/lab/domains
 * Connects a new custom domain for the authenticated laboratory.
 * Resolves labId strictly from authenticated tenant session context.
 */
export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const rawDomain = body?.domain;
    if (!rawDomain || typeof rawDomain !== "string" || !rawDomain.trim()) {
      return NextResponse.json(
        { error: "A valid domain name string is required." },
        { status: 400 }
      );
    }

    const domain = await registerCustomDomain(labId, rawDomain);

    return NextResponse.json({
      success: true,
      domain,
      dnsInstructions: buildDnsInstructions(domain),
      message: "Custom domain registered successfully. Please add the required DNS records at your domain registrar.",
    });
  } catch (error: any) {
    const status = mapErrorToStatus(error);
    return NextResponse.json(
      { error: error.message || "Failed to register custom domain." },
      { status }
    );
  }
}

/**
 * PATCH /api/lab/domains
 * Refreshes Cloudflare Edge SSL status, certificate state, and reconciliation.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const result = await refreshCustomDomainStatus(labId);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      sslStatus: result.sslStatus,
      message: result.message,
      domain: result.domain,
      dnsInstructions: buildDnsInstructions(result.domain),
    });
  } catch (error: any) {
    const status = mapErrorToStatus(error);
    return NextResponse.json(
      { error: error.message || "Failed to refresh custom domain status." },
      { status }
    );
  }
}

/**
 * DELETE /api/lab/domains
 * Disconnects the laboratory's custom domain.
 * Idempotent, tenant-scoped, and marks domain as REMOVED.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const result = await disconnectCustomDomain(labId);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    const status = mapErrorToStatus(error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect custom domain." },
      { status }
    );
  }
}
