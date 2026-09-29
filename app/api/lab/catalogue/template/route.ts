import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  generateExcelTemplate,
  generateCsvTemplate,
} from "@/services/lab/catalogue-template-service";

export async function GET(request: NextRequest) {
  try {
    await requireLabTenant(PERMISSIONS.CATALOGUE_READ);

    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get("format") || "xlsx").toLowerCase();

    if (format === "csv") {
      const csvContent = await generateCsvTemplate();
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="Gyrex-Labs-Test-Price-Template.csv"',
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // Default: XLSX
    const excelBuffer = await generateExcelTemplate();
    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Gyrex-Labs-Test-Price-Template.xlsx"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate catalogue template." },
      { status: error.statusCode || 500 }
    );
  }
}
