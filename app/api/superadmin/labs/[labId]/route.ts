import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getLabDetail } from "@/services/superadmin/labs-service";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ labId: string }> }
) {
  try {
    await requireSuperadminApi("labs.read");
    const { labId } = await context.params;

    const data = await getLabDetail(labId);
    if (!data) {
      return NextResponse.json({ error: "Laboratory not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch laboratory details." },
      { status: err.statusCode || 500 }
    );
  }
}
