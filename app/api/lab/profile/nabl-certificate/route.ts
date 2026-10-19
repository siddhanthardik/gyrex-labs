import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  saveNablCertificate,
  deleteNablCertificateFile,
  MAX_NABL_CERT_SIZE_BYTES,
} from "@/services/lab/nabl-storage-service";

export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const labId = labMembership.labId;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Please provide a valid certificate file (PDF, PNG, JPG)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_NABL_CERT_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Certificate file exceeds 10MB size limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await saveNablCertificate(labId, buffer);
    if (!result.success || !result.certificateUrl) {
      return NextResponse.json(
        { error: result.error || "Failed to process certificate file." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      certificateUrl: result.certificateUrl,
      filename: result.filename,
      message: "NABL accreditation certificate uploaded successfully.",
    });
  } catch (error: any) {
    console.error("NABL certificate upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload certificate." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const { searchParams } = new URL(request.url);
    const certificateUrl = searchParams.get("certificateUrl");

    if (certificateUrl) {
      await deleteNablCertificateFile(certificateUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Certificate removed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to remove certificate." },
      { status: error.statusCode || 500 }
    );
  }
}
