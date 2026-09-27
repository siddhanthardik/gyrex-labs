import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getAllLabs } from "@/services/superadmin/labs-service";
import { LabStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("labs.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const city = searchParams.get("city") || undefined;
    const state = searchParams.get("state") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const isVerifiedParam = searchParams.get("isVerified");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    let status: LabStatus | undefined;
    if (statusParam && Object.values(LabStatus).includes(statusParam as LabStatus)) {
      status = statusParam as LabStatus;
    }

    let isVerified: boolean | undefined;
    if (isVerifiedParam === "true") isVerified = true;
    if (isVerifiedParam === "false") isVerified = false;

    const result = await getAllLabs({
      search,
      city,
      state,
      status,
      isVerified,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch laboratories." },
      { status: err.statusCode || 500 }
    );
  }
}
