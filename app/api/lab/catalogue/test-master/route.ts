import { NextRequest, NextResponse } from "next/server";
import { requireLabAccess } from "@/lib/auth/context";
import { getTestMasterCatalogue } from "@/services/lab/catalogue-service";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabAccess();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const excludeAlreadyAdded = searchParams.get("excludeAdded") !== "false";

    const catalogue = await getTestMasterCatalogue(labMembership.labId, {
      search,
      categoryId,
      excludeAlreadyAdded,
    });

    return NextResponse.json({ success: true, ...catalogue });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search test master." },
      { status: error.statusCode || 500 }
    );
  }
}
