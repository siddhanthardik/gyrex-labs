import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  updateBranch,
  deleteBranch,
} from "@/services/lab/branch-management-service";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_READ);
    const labId = labMembership.labId;
    const { branchId } = await params;

    const branch = await prisma.labBranch.findUnique({
      where: { id: branchId },
      include: {
        serviceAreas: true,
      },
    });

    if (!branch || branch.labId !== labId) {
      return NextResponse.json(
        { error: "Branch not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      branch,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "Failed to retrieve branch." },
      { status }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;
    const { branchId } = await params;

    const body = await request.json();
    const updated = await updateBranch(labId, branchId, body);

    return NextResponse.json({
      success: true,
      branch: updated,
    });
  } catch (error: any) {
    const status = error.statusCode || 400;
    return NextResponse.json(
      { error: error.message || "Failed to update branch." },
      { status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;
    const { branchId } = await params;

    const result = await deleteBranch(labId, branchId);

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.statusCode || 400;
    return NextResponse.json(
      { error: error.message || "Failed to delete branch." },
      { status }
    );
  }
}
