import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import {
  getPlatformUsers,
  createPlatformUser,
  togglePlatformUserStatus,
  getRolePermissionsMatrix,
} from "@/services/superadmin/users-service";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("users.read");

    const searchParams = req.nextUrl.searchParams;
    const view = searchParams.get("view"); // "matrix" | "users"

    if (view === "matrix") {
      const matrix = getRolePermissionsMatrix();
      return NextResponse.json({ matrix });
    }

    const search = searchParams.get("search") || undefined;
    const roleParam = searchParams.get("role") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    let role: UserRole | undefined;
    if (roleParam && Object.values(UserRole).includes(roleParam as UserRole)) {
      role = roleParam as UserRole;
    }

    let isActive: boolean | undefined;
    if (isActiveParam === "true") isActive = true;
    if (isActiveParam === "false") isActive = false;

    const data = await getPlatformUsers({ search, role, isActive, page, pageSize });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch platform users." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("users.manage");
    const body = await req.json();

    if (!body.email || !body.fullName || !body.role) {
      return NextResponse.json(
        { error: "email, fullName, and role are required." },
        { status: 400 }
      );
    }

    const user = await createPlatformUser(body, actor);
    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to provision platform user." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("users.manage");
    const body = await req.json();
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "userId and isActive (boolean) are required." },
        { status: 400 }
      );
    }

    const updated = await togglePlatformUserStatus(userId, isActive, actor);
    return NextResponse.json({ success: true, user: updated });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to update platform user status." },
      { status: err.statusCode || 500 }
    );
  }
}
