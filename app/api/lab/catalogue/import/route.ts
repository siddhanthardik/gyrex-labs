import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { analyzeBulkImport, confirmBulkImport } from "@/services/lab/catalogue-service";

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);
    const body = await request.json();
    const { action = "ANALYZE" } = body;

    if (action === "ANALYZE") {
      const { rows } = body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json(
          { error: "A non-empty array of test rows is required." },
          { status: 400 }
        );
      }

      const analysis = await analyzeBulkImport(labMembership.labId, rows);
      return NextResponse.json({ success: true, analysis });
    }

    if (action === "CONFIRM") {
      const { items } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "A list of confirmed items is required." },
          { status: 400 }
        );
      }

      const result = await confirmBulkImport(labMembership.labId, items, user.userId);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'ANALYZE', 'CONFIRM'." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Bulk import operation failed." },
      { status: error.statusCode || 500 }
    );
  }
}
