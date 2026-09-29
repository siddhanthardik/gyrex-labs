import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  executeCatalogueImport,
  ConfirmedImportItem,
} from "@/services/lab/catalogue-import-service";

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_WRITE);

    const body = await request.json();
    const items = body.items as ConfirmedImportItem[];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "A non-empty list of confirmed items is required." },
        { status: 400 }
      );
    }

    const result = await executeCatalogueImport(
      labMembership.labId,
      items,
      user.userId
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to commit catalogue import." },
      { status: error.statusCode || 500 }
    );
  }
}
