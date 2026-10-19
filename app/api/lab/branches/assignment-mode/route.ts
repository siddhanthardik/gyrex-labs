import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateBranchAssignmentMode } from "@/services/lab/branch-management-service";
import { BranchAssignmentMode } from "@prisma/client";

export async function PUT(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const body = await request.json();
    const mode = body.mode;

    if (mode !== BranchAssignmentMode.AUTOMATIC && mode !== BranchAssignmentMode.PATIENT_CHOICE) {
      return NextResponse.json(
        { error: "Invalid branch assignment mode. Must be 'AUTOMATIC' or 'PATIENT_CHOICE'." },
        { status: 400 }
      );
    }

    const updatedSettings = await updateBranchAssignmentMode(labId, mode);

    return NextResponse.json({
      success: true,
      branchAssignmentMode: updatedSettings.branchAssignmentMode,
    });
  } catch (error: any) {
    const status = error.statusCode || 400;
    return NextResponse.json(
      { error: error.message || "Failed to update branch assignment mode." },
      { status }
    );
  }
}
