import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { deleteGalleryImageFile } from "@/services/lab/gallery-storage-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;
    const { imageId } = await params;

    const existingImage = await prisma.labGalleryImage.findFirst({
      where: { id: imageId, labId },
    });

    if (!existingImage) {
      return NextResponse.json(
        { error: "Gallery image not found or does not belong to your laboratory facility." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const caption =
      typeof body.caption === "string" && body.caption.trim().length > 0
        ? body.caption.trim().slice(0, 200)
        : null;

    const updated = await prisma.labGalleryImage.update({
      where: { id: imageId },
      data: { caption },
    });

    return NextResponse.json({ success: true, image: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update gallery image caption." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;
    const { imageId } = await params;

    const existingImage = await prisma.labGalleryImage.findFirst({
      where: { id: imageId, labId },
    });

    if (!existingImage) {
      return NextResponse.json(
        { error: "Gallery image not found or does not belong to your laboratory facility." },
        { status: 404 }
      );
    }

    // Delete record from database first
    await prisma.labGalleryImage.delete({
      where: { id: imageId },
    });

    // Check if any other record in gallery is still using this file before unlinking from disk
    const stillInUse = await prisma.labGalleryImage.findFirst({
      where: { imageUrl: existingImage.imageUrl },
    });
    if (!stillInUse) {
      await deleteGalleryImageFile(existingImage.imageUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Gallery image delete error:", error?.message || "Internal error");
    return NextResponse.json(
      { error: error.message || "Failed to delete gallery image." },
      { status: error.statusCode || 500 }
    );
  }
}
