import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  savePackageImage,
  deletePackageImageFile,
  MAX_PACKAGE_IMAGE_SIZE_BYTES,
} from "@/services/lab/package-storage-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const labId = labMembership.labId;
    const { packageId } = await params;

    // Verify package exists and strictly belongs to this laboratory
    const existingPackage = await prisma.package.findFirst({
      where: { id: packageId, labId },
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: "Diagnostic package not found or does not belong to your laboratory." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Please provide a valid image file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_PACKAGE_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Package image exceeds the 5MB size limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await savePackageImage(labId, packageId, buffer);
    if (!result.success || !result.imageUrl) {
      return NextResponse.json(
        { error: result.error || "Failed to process package image." },
        { status: 400 }
      );
    }

    let updated;
    try {
      // Persist new image URL in DB first
      updated = await prisma.package.update({
        where: { id: packageId },
        data: { imageUrl: result.imageUrl },
      });
    } catch (dbErr: any) {
      // If DB update failed, immediately clean up newly written file so no orphan remains
      await deletePackageImageFile(result.imageUrl);
      console.error("Database update failed during package image upload:", dbErr?.message);
      return NextResponse.json(
        { error: "Database error occurred while saving package image." },
        { status: 500 }
      );
    }

    // Unlink old image file only after DB update succeeds and only if no other package shares it
    if (existingPackage.imageUrl && existingPackage.imageUrl !== result.imageUrl) {
      const stillInUse = await prisma.package.findFirst({
        where: { imageUrl: existingPackage.imageUrl, id: { not: packageId } },
      });
      if (!stillInUse) {
        await deletePackageImageFile(existingPackage.imageUrl);
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: updated.imageUrl,
      message: "Package image updated successfully.",
    });
  } catch (error: any) {
    console.error("Package image upload error:", error?.message || "Internal error");
    return NextResponse.json(
      { error: error.message || "Failed to upload package image." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const labId = labMembership.labId;
    const { packageId } = await params;

    // Verify package exists and belongs to this laboratory
    const existingPackage = await prisma.package.findFirst({
      where: { id: packageId, labId },
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: "Diagnostic package not found or does not belong to your laboratory." },
        { status: 404 }
      );
    }

    if (existingPackage.imageUrl) {
      const oldUrl = existingPackage.imageUrl;

      // Update database first to clear the image reference
      await prisma.package.update({
        where: { id: packageId },
        data: { imageUrl: null },
      });

      // Verify no other package is sharing this file before deleting from disk
      const stillInUse = await prisma.package.findFirst({
        where: { imageUrl: oldUrl },
      });
      if (!stillInUse) {
        await deletePackageImageFile(oldUrl);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Package image removed successfully.",
    });
  } catch (error: any) {
    console.error("Package image delete error:", error?.message || "Internal error");
    return NextResponse.json(
      { error: error.message || "Failed to remove package image." },
      { status: error.statusCode || 500 }
    );
  }
}
