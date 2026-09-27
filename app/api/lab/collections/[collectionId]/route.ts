import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateLabCollection } from "@/services/lab/collection-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.ORDERS_UPDATE);
    const { collectionId } = await params;
    const body = await request.json();

    const updated = await updateLabCollection(labMembership.labId, collectionId, {
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      scheduledSlot: body.scheduledSlot,
      phlebotomistName: body.phlebotomistName,
      phlebotomistPhone: body.phlebotomistPhone,
      sampleCollectedAt: body.sampleCollectedAt ? new Date(body.sampleCollectedAt) : undefined,
      specialInstructions: body.specialInstructions,
    });

    return NextResponse.json({ success: true, collection: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update collection." },
      { status: error.statusCode || 500 }
    );
  }
}
