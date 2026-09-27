import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getLabPackageById, updateLabPackage } from "@/services/lab/packages-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant();
    const { packageId } = await params;

    const pkg = await getLabPackageById(labMembership.labId, packageId);
    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve package." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const { packageId } = await params;
    const body = await request.json();

    const updated = await updateLabPackage(
      labMembership.labId,
      packageId,
      {
        name: body.name,
        description: body.description,
        sellingPrice: body.sellingPrice !== undefined ? Number(body.sellingPrice) : undefined,
        mrpPrice: body.mrpPrice !== undefined ? Number(body.mrpPrice) : undefined,
        isActive: body.isActive,
        isHomeCollectionAvailable: body.isHomeCollectionAvailable,
        fastingRequired: body.fastingRequired,
        preparationInstructions: body.preparationInstructions,
        estimatedTatHours: body.estimatedTatHours !== undefined ? Number(body.estimatedTatHours) : undefined,
        testIds: body.testIds,
      },
      user.userId
    );

    return NextResponse.json({ success: true, package: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update package." },
      { status: error.statusCode || 500 }
    );
  }
}
