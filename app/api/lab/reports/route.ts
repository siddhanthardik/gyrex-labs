import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getLabReports,
  uploadLabReport,
  amendLabReport,
} from "@/services/lab/reports-service";
import {
  fileStorageService,
  validateFileUpload,
} from "@/services/integrations/storage/storage-service";
import { ReportStatus } from "@prisma/client";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.REPORTS_READ);
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as ReportStatus) || undefined;

    const reports = await getLabReports(labMembership.labId, { search, status });
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve reports." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.REPORTS_UPLOAD);
    const contentType = request.headers.get("content-type") || "";

    // ------------------------------------------------------------
    // 1. Multipart Form-Data File Upload
    // ------------------------------------------------------------
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const action = ((formData.get("action") as string) || "UPLOAD").toUpperCase();
      const file = formData.get("file") as File | null;
      const orderId = (formData.get("orderId") as string) || "";
      const reportId = (formData.get("reportId") as string) || "";
      const reason = (formData.get("reason") as string) || "";
      const releasedNow = formData.get("releasedNow") !== "false";

      if (!file) {
        return NextResponse.json(
          { error: "No diagnostic report file provided." },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const originalFileName = file.name || "report.pdf";
      const mimeType = file.type || "application/pdf";

      // Strict validation of file size, MIME type, and executable prevention
      const validation = validateFileUpload(fileBuffer, originalFileName, mimeType, "REPORT");
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "File validation failed." },
          { status: 400 }
        );
      }

      if (action === "UPLOAD") {
        if (!orderId) {
          return NextResponse.json(
            { error: "orderId is required to upload a diagnostic report." },
            { status: 400 }
          );
        }

        // Generate server-side storage path strictly underneath tenant partition
        const sanitizedFileName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
        const serverStoragePath = `reports/${labMembership.labId}/${orderId}/${Date.now()}_${sanitizedFileName}`;

        // Upload through local secure storage provider
        const uploadResult = await fileStorageService.upload({
          fileBuffer,
          destinationPath: serverStoragePath,
          mimeType,
          accessClassification: "RESTRICTED_PATIENT_LAB",
        });

        const report = await uploadLabReport(
          labMembership.labId,
          {
            orderId,
            originalFileName,
            mimeType: uploadResult.mimeType,
            fileSizeBytes: uploadResult.fileSizeBytes,
            storagePath: uploadResult.storagePath,
            checksumSha256: uploadResult.checksumSha256,
            releasedNow,
          },
          user.userId
        );

        return NextResponse.json({ success: true, report });
      }

      if (action === "AMEND") {
        if (!reportId || !reason.trim()) {
          return NextResponse.json(
            { error: "reportId and reason are required to amend a report." },
            { status: 400 }
          );
        }

        const sanitizedFileName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
        const serverStoragePath = `reports/${labMembership.labId}/amended_${reportId}/${Date.now()}_${sanitizedFileName}`;

        const uploadResult = await fileStorageService.upload({
          fileBuffer,
          destinationPath: serverStoragePath,
          mimeType,
          accessClassification: "RESTRICTED_PATIENT_LAB",
        });

        const report = await amendLabReport(
          labMembership.labId,
          reportId,
          {
            orderId: "", // Resolved from existing report
            originalFileName,
            mimeType: uploadResult.mimeType,
            fileSizeBytes: uploadResult.fileSizeBytes,
            storagePath: uploadResult.storagePath,
            checksumSha256: uploadResult.checksumSha256,
            releasedNow: true,
          },
          reason.trim(),
          user.userId
        );

        return NextResponse.json({ success: true, report });
      }

      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    // ------------------------------------------------------------
    // 2. JSON Body Handling (Compatibility & Server Direct)
    // ------------------------------------------------------------
    const body = await request.json();
    const { action = "UPLOAD" } = body;

    if (action === "UPLOAD") {
      const { orderId, originalFileName, mimeType, fileSizeBytes, releasedNow } = body;

      if (!orderId || !originalFileName) {
        return NextResponse.json(
          { error: "orderId and originalFileName are required." },
          { status: 400 }
        );
      }

      // Server-authoritative storage path (Never trust client-provided storagePath)
      const sanitizedFileName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      const serverStoragePath = `reports/${labMembership.labId}/${orderId}/${Date.now()}_${sanitizedFileName}`;

      const report = await uploadLabReport(
        labMembership.labId,
        {
          orderId,
          originalFileName,
          mimeType: mimeType || "application/pdf",
          fileSizeBytes: fileSizeBytes || 1024 * 150,
          storagePath: serverStoragePath,
          releasedNow: releasedNow ?? true,
        },
        user.userId
      );

      return NextResponse.json({ success: true, report });
    }

    if (action === "AMEND") {
      const { reportId, originalFileName, mimeType, fileSizeBytes, reason } = body;

      if (!reportId || !reason) {
        return NextResponse.json(
          { error: "reportId and reason are required to amend a report." },
          { status: 400 }
        );
      }

      const sanitizedFileName = path.basename(originalFileName || "Amended_Report.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
      const serverStoragePath = `reports/${labMembership.labId}/amended_${reportId}/${Date.now()}_${sanitizedFileName}`;

      const report = await amendLabReport(
        labMembership.labId,
        reportId,
        {
          orderId: "", // resolved from existing
          originalFileName: originalFileName || "Amended_Report.pdf",
          mimeType: mimeType || "application/pdf",
          fileSizeBytes: fileSizeBytes || 1024 * 150,
          storagePath: serverStoragePath,
          releasedNow: true,
        },
        reason,
        user.userId
      );

      return NextResponse.json({ success: true, report });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process report." },
      { status: error.statusCode || 500 }
    );
  }
}
