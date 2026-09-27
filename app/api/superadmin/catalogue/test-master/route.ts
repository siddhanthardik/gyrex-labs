import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getTestMasterList, createTestMaster } from "@/services/superadmin/testmaster-service";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("catalogue.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 25;

    let isActive: boolean | undefined;
    if (isActiveParam === "true") isActive = true;
    if (isActiveParam === "false") isActive = false;

    const data = await getTestMasterList({
      search,
      categoryId,
      isActive,
      page,
      pageSize,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch Test Master catalogue." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("testmaster.manage");
    const body = await req.json();

    if (!body.code || !body.name || !body.categoryId || !body.sampleType) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, categoryId, sampleType." },
        { status: 400 }
      );
    }

    const created = await createTestMaster(body, actor);
    return NextResponse.json({ success: true, test: created });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to create Test Master record." },
      { status: err.statusCode || 500 }
    );
  }
}
