import { NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getCatalogueMatchingOverview } from "@/services/superadmin/testmaster-service";

export async function GET() {
  try {
    await requireSuperadminApi("catalogue.read");
    const data = await getCatalogueMatchingOverview();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch catalogue matching overview." },
      { status: err.statusCode || 500 }
    );
  }
}
