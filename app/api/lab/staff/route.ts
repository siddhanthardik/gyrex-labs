import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getLabStaffMembers,
  addOrInviteStaff,
  toggleStaffStatus,
} from "@/services/lab/staff-service";

export async function GET() {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.USERS_READ);
    const staff = await getLabStaffMembers(labMembership.labId);
    return NextResponse.json({ success: true, staff });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve staff." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.USERS_MANAGE);
    const body = await request.json();

    const { email, fullName, phone, role, permissions, initialPassword } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: "email, fullName, and role are required." },
        { status: 400 }
      );
    }

    const created = await addOrInviteStaff(
      labMembership.labId,
      {
        email,
        fullName,
        phone,
        role,
        permissions,
        initialPassword,
      },
      user.userId
    );

    return NextResponse.json({ success: true, staff: created });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to invite staff." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.USERS_MANAGE);
    const body = await request.json();

    const { labUserId, isActive } = body;
    if (!labUserId || isActive === undefined) {
      return NextResponse.json(
        { error: "labUserId and isActive are required." },
        { status: 400 }
      );
    }

    const updated = await toggleStaffStatus(
      labMembership.labId,
      labUserId,
      isActive,
      user.userId
    );

    return NextResponse.json({ success: true, staff: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update staff status." },
      { status: error.statusCode || 500 }
    );
  }
}
