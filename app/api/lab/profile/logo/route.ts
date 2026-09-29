import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  saveLabLogo,
  deleteLabLogoFile,
  MAX_LOGO_SIZE_BYTES,
} from "@/services/lab/logo-storage-service";

export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Please provide a valid image file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Logo file exceeds the maximum 5MB size limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save logo using secure storage helper
    const result = await saveLabLogo(labId, buffer);
    if (!result.success || !result.logoUrl) {
      return NextResponse.json(
        { error: result.error || "Failed to process logo file." },
        { status: 400 }
      );
    }

    // Retrieve previous logo to clean up replaced file
    const currentSettings = await prisma.labStoreSettings.findUnique({
      where: { labId },
      select: { logoUrl: true },
    });

    if (currentSettings?.logoUrl && currentSettings.logoUrl !== result.logoUrl) {
      await deleteLabLogoFile(currentSettings.logoUrl);
    }

    // Persist new logo URL in store settings
    await prisma.labStoreSettings.upsert({
      where: { labId },
      create: {
        labId,
        logoUrl: result.logoUrl,
      },
      update: {
        logoUrl: result.logoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      logoUrl: result.logoUrl,
      message: "Logo uploaded successfully.",
    });
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload logo." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const currentSettings = await prisma.labStoreSettings.findUnique({
      where: { labId },
      select: { logoUrl: true },
    });

    if (currentSettings?.logoUrl) {
      await deleteLabLogoFile(currentSettings.logoUrl);
      await prisma.labStoreSettings.update({
        where: { labId },
        data: { logoUrl: null },
      });
    }

    return NextResponse.json({
      success: true,
      logoUrl: null,
      message: "Logo removed successfully.",
    });
  } catch (error: any) {
    console.error("Logo deletion error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete logo." },
      { status: error.statusCode || 500 }
    );
  }
}
