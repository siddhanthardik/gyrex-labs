import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getLabStoreSettings, updateLabStoreSettings } from "@/services/lab/store-settings-service";

export async function GET() {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_READ);
    const data = await getLabStoreSettings(labMembership.labId);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve store settings." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const body = await request.json();

    const result = await updateLabStoreSettings(labMembership.labId, body, user.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update store settings." },
      { status: error.statusCode || 500 }
    );
  }
}
