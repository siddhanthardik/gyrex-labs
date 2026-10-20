import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  saveGalleryImage,
  deleteGalleryImageFile,
  MAX_GALLERY_IMAGE_SIZE_BYTES,
} from "@/services/lab/gallery-storage-service";

export async function GET() {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_READ);
    const labId = labMembership.labId;

    const images = await prisma.labGalleryImage.findMany({
      where: { labId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ success: true, images });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load facility gallery." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const formData = await request.formData();
    const file = formData.get("file");
    const rawCaption = formData.get("caption");
    const caption =
      typeof rawCaption === "string" && rawCaption.trim().length > 0
        ? rawCaption.trim().slice(0, 200)
        : null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Please provide a valid image file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_GALLERY_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Facility photo exceeds the 5MB size limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await saveGalleryImage(labId, buffer);
    if (!saved.success || !saved.imageUrl) {
      return NextResponse.json(
        { error: saved.error || "Failed to process facility photo." },
        { status: 400 }
      );
    }

    const imageUrl = saved.imageUrl;

    let newImage;
    try {
      newImage = await prisma.$transaction(async (tx) => {
        // Concurrency-safe: lock lab row to serialize displayOrder calculations for this tenant
        // Sets search_path to resolve "Lab" in public (production) while remaining schema-safe
        await tx.$executeRaw`SET LOCAL search_path TO "public", "gyrex_labs"`;
        await tx.$executeRaw`SELECT 1 FROM "Lab" WHERE id = ${labId} FOR UPDATE`;

        const maxOrderRecord = await tx.labGalleryImage.aggregate({
          where: { labId },
          _max: { displayOrder: true },
        });
        const nextOrder = (maxOrderRecord._max.displayOrder ?? -1) + 1;

        return tx.labGalleryImage.create({
          data: {
            labId,
            imageUrl,
            caption,
            displayOrder: nextOrder,
          },
        });
      }, { maxWait: 10000, timeout: 15000 });
    } catch (dbErr: any) {
      // Clean up orphaned file on disk if DB transaction failed
      await deleteGalleryImageFile(imageUrl);
      console.error("Database error during gallery photo creation:", dbErr?.message);
      return NextResponse.json(
        { error: "Database error occurred while saving facility photo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, image: newImage }, { status: 201 });
  } catch (error: any) {
    console.error("Facility photo upload error:", error?.message || "Internal error");
    return NextResponse.json(
      { error: error.message || "Failed to upload facility photo." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const body = await request.json();
    const imageIds = body.imageIds;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "An array of imageIds is required for reordering." },
        { status: 400 }
      );
    }

    // Tenant check: verify all imageIds belong to this lab
    const existingImages = await prisma.labGalleryImage.findMany({
      where: { labId, id: { in: imageIds } },
      select: { id: true },
    });

    if (existingImages.length !== imageIds.length) {
      return NextResponse.json(
        { error: "One or more images do not belong to your laboratory facility." },
        { status: 403 }
      );
    }

    // Transactionally update displayOrder
    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.labGalleryImage.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reorder gallery photos." },
      { status: error.statusCode || 500 }
    );
  }
}
