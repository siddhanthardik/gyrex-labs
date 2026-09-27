import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { verifyLaboratory } from "@/services/superadmin/labs-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ labId: string }> }
) {
  try {
    const actor = await requireSuperadminApi("labs.verify");
    const { labId } = await context.params;
    const body = await req.json();

    const { approve, reason } = body;
    if (typeof approve !== "boolean" || !reason) {
      return NextResponse.json(
        { error: "Invalid request. 'approve' (boolean) and 'reason' (string) are required." },
        { status: 400 }
      );
    }

    const updated = await verifyLaboratory(labId, approve, reason, actor);
    return NextResponse.json({
      success: true,
      labId: updated.id,
      isVerified: updated.isVerified,
      status: updated.status,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to update laboratory verification status." },
      { status: err.statusCode || 500 }
    );
  }
}
