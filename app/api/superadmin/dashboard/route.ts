import { NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getSuperadminDashboardData } from "@/services/superadmin/dashboard-service";

export async function GET() {
  try {
    await requireSuperadminApi("labs.read");
    const data = await getSuperadminDashboardData();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch Superadmin dashboard metrics." },
      { status: err.statusCode || 500 }
    );
  }
}
