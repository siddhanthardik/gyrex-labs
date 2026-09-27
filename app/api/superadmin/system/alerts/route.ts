import { NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getSecurityAlerts } from "@/services/superadmin/system-service";

export async function GET() {
  try {
    await requireSuperadminApi("audit.read");
    const alerts = await getSecurityAlerts();
    return NextResponse.json({ alerts });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch security alerts." },
      { status: err.statusCode || 500 }
    );
  }
}
