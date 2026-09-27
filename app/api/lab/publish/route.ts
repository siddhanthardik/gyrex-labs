import { NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPublishReadiness, publishLabStore } from "@/services/lab/store-settings-service";

export async function GET() {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.CATALOGUE_READ);
    const readiness = await getPublishReadiness(labMembership.labId);
    return NextResponse.json({ success: true, ...readiness });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check publishing readiness." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST() {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.LABS_UPDATE);
    const result = await publishLabStore(labMembership.labId, user.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to publish laboratory store." },
      { status: error.statusCode || 500 }
    );
  }
}
