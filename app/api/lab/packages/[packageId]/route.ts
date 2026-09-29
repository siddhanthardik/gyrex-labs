import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getLabPackageById,
  updateLabPackage,
  deactivateLabPackage,
} from "@/services/lab/packages-service";

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

    const sellingPrice =
      body.sellingPrice !== undefined && body.sellingPrice !== null && body.sellingPrice !== ""
        ? Number(body.sellingPrice)
        : undefined;

    if (sellingPrice !== undefined && (isNaN(sellingPrice) || sellingPrice <= 0)) {
      return NextResponse.json(
        { error: "Package selling price must be greater than zero." },
        { status: 400 }
      );
    }

    const mrpPrice =
      body.mrpPrice !== undefined && body.mrpPrice !== null && body.mrpPrice !== ""
        ? Number(body.mrpPrice)
        : undefined;

    if (mrpPrice !== undefined && (isNaN(mrpPrice) || mrpPrice <= 0)) {
      return NextResponse.json(
        { error: "MRP price must be a valid positive number." },
        { status: 400 }
      );
    }

    const updated = await updateLabPackage(
      labMembership.labId,
      packageId,
      {
        name: body.name?.trim(),
        code: body.code?.trim(),
        description: body.description?.trim(),
        sellingPrice,
        mrpPrice,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        isHomeCollectionAvailable:
          body.isHomeCollectionAvailable !== undefined
            ? Boolean(body.isHomeCollectionAvailable)
            : undefined,
        fastingRequired:
          body.fastingRequired !== undefined ? Boolean(body.fastingRequired) : undefined,
        preparationInstructions: body.preparationInstructions?.trim(),
        estimatedTatHours:
          body.estimatedTatHours !== undefined ? Number(body.estimatedTatHours) : undefined,
        testIds: Array.isArray(body.testIds) ? body.testIds : undefined,
      },
      user.userId
    );

    return NextResponse.json({ success: true, package: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update package." },
      { status: error.statusCode || 400 }
    );
  }
}

/**
 * Safely deactivates a package rather than hard-deleting,
 * preserving historical order and reporting records.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const { packageId } = await params;

    const result = await deactivateLabPackage(
      labMembership.labId,
      packageId,
      user.userId
    );

    return NextResponse.json({
      success: true,
      message: "Package deactivated successfully.",
      package: result.package,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to deactivate package." },
      { status: error.statusCode || 400 }
    );
  }
}
