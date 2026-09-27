import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { updateTestMaster } from "@/services/superadmin/testmaster-service";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ testId: string }> }
) {
  try {
    const actor = await requireSuperadminApi("testmaster.manage");
    const { testId } = await context.params;
    const body = await req.json();

    const updated = await updateTestMaster(testId, body, actor);
    return NextResponse.json({ success: true, test: updated });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to update Test Master record." },
      { status: err.statusCode || 500 }
    );
  }
}
