import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  generateErrorReportCsv,
  AnalyzedImportItem,
} from "@/services/lab/catalogue-import-service";

export async function POST(request: NextRequest) {
  try {
    await requireLabTenant(PERMISSIONS.CATALOGUE_READ);

    const body = await request.json();
    const items = body.items as AnalyzedImportItem[];

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "An array of analyzed items is required." },
        { status: 400 }
      );
    }

    const csvContent = generateErrorReportCsv(items);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="Gyrex-Import-Validation-Report.csv"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate error report." },
      { status: error.statusCode || 500 }
    );
  }
}
