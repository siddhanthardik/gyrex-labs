import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getAuditLogs } from "@/services/superadmin/system-service";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("audit.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const actionParam = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const labId = searchParams.get("labId") || undefined;
    const actorUserId = searchParams.get("actorUserId") || undefined;
    const isSecurityAlert = searchParams.get("isSecurityAlert") === "true";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 25;

    let action: AuditAction | undefined;
    if (actionParam && Object.values(AuditAction).includes(actionParam as AuditAction)) {
      action = actionParam as AuditAction;
    }

    const data = await getAuditLogs({
      search,
      action,
      entityType,
      labId,
      actorUserId,
      isSecurityAlert,
      page,
      pageSize,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch platform audit logs." },
      { status: err.statusCode || 500 }
    );
  }
}
