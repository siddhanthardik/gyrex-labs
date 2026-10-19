import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getLabBranches,
  createBranch,
} from "@/services/lab/branch-management-service";
import { getLabEntitlementsSummary } from "@/services/subscription/entitlement-service";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_READ);
    const labId = labMembership.labId;

    const [branches, entitlement] = await Promise.all([
      getLabBranches(labId),
      getLabEntitlementsSummary(labId),
    ]);

    return NextResponse.json({
      success: true,
      branches,
      entitlement,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "Failed to retrieve branches." },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const body = await request.json();
    const created = await createBranch(labId, body);

    return NextResponse.json({
      success: true,
      branch: created,
    });
  } catch (error: any) {
    const status = error.statusCode || 400;
    return NextResponse.json(
      { error: error.message || "Failed to create branch." },
      { status }
    );
  }
}
