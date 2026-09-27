import { NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getPlatformNotifications } from "@/services/superadmin/system-service";

export async function GET() {
  try {
    await requireSuperadminApi("system.manage");
    const notifications = await getPlatformNotifications();
    return NextResponse.json({ notifications });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch platform notifications." },
      { status: err.statusCode || 500 }
    );
  }
}
