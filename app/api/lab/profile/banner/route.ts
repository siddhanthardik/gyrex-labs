import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  saveLabBanner,
  stageLabBanner,
  deleteStagedLabBanner,
  deleteLabBannerFile,
  MAX_BANNER_SIZE_BYTES,
} from "@/services/lab/banner-storage-service";

export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const isStage = request.nextUrl.searchParams.get("stage") === "true";

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Please provide a valid image file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BANNER_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Banner file exceeds the maximum 5MB size limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Staging mode: Do not mutate database or public storefront
    if (isStage) {
      const result = await stageLabBanner(labId, buffer);
      if (!result.success || !result.stagedBannerUrl) {
        return NextResponse.json(
          { error: result.error || "Failed to stage banner file." },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        stagedBannerUrl: result.stagedBannerUrl,
        filename: result.filename,
        message: "Banner staged for preview.",
      });
    }

    // Direct permanent save mode (fallback for direct uploads)
    const result = await saveLabBanner(labId, buffer);
    if (!result.success || !result.bannerUrl) {
      return NextResponse.json(
        { error: result.error || "Failed to process banner file." },
        { status: 400 }
      );
    }

    // Retrieve previous banner to clean up replaced file
    const currentSettings = await prisma.labStoreSettings.findUnique({
      where: { labId },
      select: { bannerUrl: true },
    });

    if (currentSettings?.bannerUrl && currentSettings.bannerUrl !== result.bannerUrl) {
      await deleteLabBannerFile(currentSettings.bannerUrl);
    }

    // Persist new banner URL in store settings
    await prisma.labStoreSettings.upsert({
      where: { labId },
      create: {
        labId,
        bannerUrl: result.bannerUrl,
      },
      update: {
        bannerUrl: result.bannerUrl,
      },
    });

    return NextResponse.json({
      success: true,
      bannerUrl: result.bannerUrl,
      message: "Laboratory banner uploaded successfully.",
    });
  } catch (error: any) {
    console.error("Banner upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload banner." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const isStage = request.nextUrl.searchParams.get("stage") === "true";

    // Staging mode: Discard temporary staged banner without touching DB
    if (isStage) {
      await deleteStagedLabBanner(labId);
      return NextResponse.json({
        success: true,
        message: "Staged banner discarded successfully.",
      });
    }

    // Permanent delete mode
    const currentSettings = await prisma.labStoreSettings.findUnique({
      where: { labId },
      select: { bannerUrl: true },
    });

    if (currentSettings?.bannerUrl) {
      await deleteLabBannerFile(currentSettings.bannerUrl);
      await prisma.labStoreSettings.update({
        where: { labId },
        data: { bannerUrl: null },
      });
    }

    return NextResponse.json({
      success: true,
      bannerUrl: null,
      message: "Laboratory banner removed successfully.",
    });
  } catch (error: any) {
    console.error("Banner deletion error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete banner." },
      { status: error.statusCode || 500 }
    );
  }
}
