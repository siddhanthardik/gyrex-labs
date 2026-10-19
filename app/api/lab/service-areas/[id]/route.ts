import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { removePincodeCoverage } from "@/services/lab/service-area-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;
    const { id } = await params;

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: "Service area ID is required." },
        { status: 400 }
      );
    }

    await removePincodeCoverage(labId, id.trim());

    return NextResponse.json({
      success: true,
      message: "PIN code removed from service coverage.",
    });
  } catch (error: any) {
    const status = error.statusCode || 400;
    return NextResponse.json(
      { error: error.message || "Failed to remove service area." },
      { status }
    );
  }
}
