import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedReportDownload } from "@/services/reports/patient-report-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const phone = request.nextUrl.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number verification required to access this report." },
        { status: 401 }
      );
    }

    const reportData = await getAuthorizedReportDownload(reportId, phone);

    return NextResponse.json({
      success: true,
      report: reportData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unauthorized report access.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
