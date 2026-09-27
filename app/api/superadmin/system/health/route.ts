import { NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getSystemHealth, getIntegrationsStatus } from "@/services/superadmin/system-service";

export async function GET() {
  try {
    await requireSuperadminApi("system.manage");
    const [health, integrations] = await Promise.all([
      getSystemHealth(),
      getIntegrationsStatus(),
    ]);
    return NextResponse.json({ health, integrations });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch system health status." },
      { status: err.statusCode || 500 }
    );
  }
}
