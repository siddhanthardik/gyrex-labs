import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getLabTestById, updateLabTest } from "@/services/lab/catalogue-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ labTestId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant();
    const { labTestId } = await params;

    const test = await getLabTestById(labMembership.labId, labTestId);
    return NextResponse.json({ success: true, test });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve test details." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ labTestId: string }> }
) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const { labTestId } = await params;
    const body = await request.json();

    const updated = await updateLabTest(
      labMembership.labId,
      labTestId,
      {
        sellingPrice: body.sellingPrice !== undefined ? Number(body.sellingPrice) : undefined,
        mrpPrice: body.mrpPrice !== undefined ? Number(body.mrpPrice) : undefined,
        isActive: body.isActive,
        isHomeCollectionAvailable: body.isHomeCollectionAvailable,
        customTatHours: body.customTatHours !== undefined ? Number(body.customTatHours) : undefined,
        customPreparation: body.customPreparation,
        labSpecificNotes: body.labSpecificNotes,
      },
      user.userId
    );

    return NextResponse.json({ success: true, test: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update test." },
      { status: error.statusCode || 500 }
    );
  }
}
