import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  saveTeamPhoto,
  deleteTeamPhotoFile,
  MAX_TEAM_PHOTO_SIZE_BYTES,
} from "@/services/lab/team-storage-service";

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

    if (file.size > MAX_TEAM_PHOTO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Team photo exceeds the 5MB size limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await saveTeamPhoto(labId, buffer);
    if (!result.success || !result.photoUrl) {
      return NextResponse.json(
        { error: result.error || "Failed to process team photo." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      photoUrl: result.photoUrl,
      message: "Team photo uploaded successfully.",
    });
  } catch (error: any) {
    console.error("Team photo upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload team photo." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const { searchParams } = new URL(request.url);
    const photoUrl = searchParams.get("photoUrl");

    if (photoUrl) {
      await deleteTeamPhotoFile(photoUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Team photo removed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete team photo." },
      { status: error.statusCode || 500 }
    );
  }
}
