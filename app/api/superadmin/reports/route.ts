import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getReportCentreData, auditReportInspection } from "@/services/superadmin/reports-service";
import { ReportStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("reports.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const labId = searchParams.get("labId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    let status: ReportStatus | undefined;
    if (statusParam && Object.values(ReportStatus).includes(statusParam as ReportStatus)) {
      status = statusParam as ReportStatus;
    }

    const data = await getReportCentreData({
      search,
      labId,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch report centre metrics." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("reports.read");
    const body = await req.json();

    const { reportId, reason } = body;
    if (!reportId || !reason) {
      return NextResponse.json(
        { error: "reportId and reason are required to audit report inspection." },
        { status: 400 }
      );
    }

    const result = await auditReportInspection(reportId, actor, reason);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to audit report inspection." },
      { status: err.statusCode || 500 }
    );
  }
}
