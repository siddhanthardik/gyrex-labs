import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getLabReports, uploadLabReport, amendLabReport } from "@/services/lab/reports-service";
import { ReportStatus } from "@prisma/client";

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
    const body = await request.json();

    const { action = "UPLOAD" } = body;

    if (action === "UPLOAD") {
      const { orderId, originalFileName, mimeType, fileSizeBytes, storagePath, releasedNow } = body;

      if (!orderId || !originalFileName) {
        return NextResponse.json(
          { error: "orderId and originalFileName are required." },
          { status: 400 }
        );
      }

      const report = await uploadLabReport(
        labMembership.labId,
        {
          orderId,
          originalFileName,
          mimeType: mimeType || "application/pdf",
          fileSizeBytes: fileSizeBytes || 1024 * 150,
          storagePath: storagePath || `reports/${labMembership.labId}/${Date.now()}_${originalFileName}`,
          releasedNow: releasedNow ?? true,
        },
        user.userId
      );

      return NextResponse.json({ success: true, report });
    }

    if (action === "AMEND") {
      const { reportId, originalFileName, mimeType, fileSizeBytes, storagePath, reason } = body;

      if (!reportId || !reason) {
        return NextResponse.json(
          { error: "reportId and reason are required to amend a report." },
          { status: 400 }
        );
      }

      const report = await amendLabReport(
        labMembership.labId,
        reportId,
        {
          orderId: "", // resolved from existing
          originalFileName: originalFileName || "Amended_Report.pdf",
          mimeType: mimeType || "application/pdf",
          fileSizeBytes: fileSizeBytes || 1024 * 150,
          storagePath: storagePath || `reports/${labMembership.labId}/amended_${Date.now()}`,
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
