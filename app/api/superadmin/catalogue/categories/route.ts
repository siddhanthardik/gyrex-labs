import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getTestCategories, createTestCategory } from "@/services/superadmin/testmaster-service";

export async function GET() {
  try {
    await requireSuperadminApi("catalogue.read");
    const categories = await getTestCategories();
    return NextResponse.json({ categories });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch test categories." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("testmaster.manage");
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: "Category 'name' is required." }, { status: 400 });
    }

    const category = await createTestCategory(body, actor);
    return NextResponse.json({ success: true, category });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to create category." },
      { status: err.statusCode || 500 }
    );
  }
}
