import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import {
  analyzeTestMasterSpreadsheet,
  confirmTestMasterImport,
  AnalyzedTestMasterRow,
} from "@/services/superadmin/testmaster-import-service";

export const maxDuration = 60; // Allow 60s for large spreadsheet analysis / transaction

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("testmaster.manage");
    const contentType = req.headers.get("content-type") || "";

    // 1. Spreadsheet Upload & Analysis (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded. Please select a valid .xlsx or .csv file." },
          { status: 400 }
        );
      }

      const fileName = file.name || "uploaded.xlsx";
      const fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

      if (![".xlsx", ".xls", ".csv"].includes(fileExt)) {
        return NextResponse.json(
          { error: "Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file." },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File size exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).` },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const analysis = await analyzeTestMasterSpreadsheet(buffer, fileName);

      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    // 2. Import Confirmation & Database Transaction (application/json)
    if (contentType.includes("application/json")) {
      const body = await req.json();

      if (body.action !== "CONFIRM") {
        return NextResponse.json(
          { error: "Invalid action. Supported action is 'CONFIRM'." },
          { status: 400 }
        );
      }

      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { error: "No items provided for import confirmation." },
          { status: 400 }
        );
      }

      const batchId = body.batchId || `tmb-${Date.now().toString(36)}`;
      const filename = body.filename || "import.xlsx";
      const items = body.items as AnalyzedTestMasterRow[];

      const result = await confirmTestMasterImport(items, batchId, filename, actor);

      return NextResponse.json({
        success: true,
        result,
      });
    }

    return NextResponse.json(
      { error: "Unsupported Content-Type. Expected multipart/form-data or application/json." },
      { status: 415 }
    );
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to process Test Master import." },
      { status: err.statusCode || 500 }
    );
  }
}
