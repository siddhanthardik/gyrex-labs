import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  parseSpreadsheetBuffer,
  analyzeSpreadsheetImport,
} from "@/services/lab/catalogue-import-service";

export async function POST(request: NextRequest) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please upload an XLSX or CSV file." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const isSupported =
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".csv") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "text/csv" ||
      file.type === "application/vnd.ms-excel";

    if (!isSupported) {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload a valid .xlsx or .csv file." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit. Please split the file or reduce the size." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse rows from spreadsheet
    const rawRows = parseSpreadsheetBuffer(buffer, file.name);

    // Analyze rows against TestMaster and existing LabTests
    const analysis = await analyzeSpreadsheetImport(labMembership.labId, rawRows);

    return NextResponse.json({
      success: true,
      analysis,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process the uploaded spreadsheet." },
      { status: error.statusCode || 400 }
    );
  }
}
