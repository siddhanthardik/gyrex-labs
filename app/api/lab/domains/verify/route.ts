import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { verifyCustomDomain } from "@/services/lab/domain-service";

/**
 * POST /api/lab/domains/verify
 * Rechecks DNS TXT records for the authenticated laboratory's custom domain.
 * Does NOT prematurely declare the domain LIVE or SSL active (deferred to Phase C).
 */
export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const result = await verifyCustomDomain(labId);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      sslStatus: result.sslStatus,
      message: result.message,
      domain: result.domain,
    });
  } catch (error: any) {
    const status =
      error.statusCode ||
      (error.name === "AuthorizationError" || error.message?.includes("Access denied")
        ? 403
        : error.name === "ServiceUnavailableError"
        ? 503
        : 400);
    return NextResponse.json(
      { error: error.message || "Failed to verify custom domain." },
      { status }
    );
  }
}
