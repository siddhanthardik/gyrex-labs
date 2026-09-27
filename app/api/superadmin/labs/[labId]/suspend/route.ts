import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { suspendLaboratory } from "@/services/superadmin/labs-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ labId: string }> }
) {
  try {
    const actor = await requireSuperadminApi("labs.suspend");
    const { labId } = await context.params;
    const body = await req.json();

    const { suspend, reason } = body;
    if (typeof suspend !== "boolean" || !reason) {
      return NextResponse.json(
        { error: "Invalid request. 'suspend' (boolean) and 'reason' (string) are required." },
        { status: 400 }
      );
    }

    const updated = await suspendLaboratory(labId, suspend, reason, actor);
    return NextResponse.json({
      success: true,
      labId: updated.id,
      status: updated.status,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to update laboratory suspension status." },
      { status: err.statusCode || 500 }
    );
  }
}
