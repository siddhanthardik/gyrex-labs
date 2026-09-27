import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateLabOrderStatus } from "@/services/lab/orders-service";
import { OrderStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.ORDERS_UPDATE);
    const { orderId } = await params;
    const body = await request.json();

    const { status, reason, sampleCollectedAt } = body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: "A valid target OrderStatus is required." },
        { status: 400 }
      );
    }

    const updated = await updateLabOrderStatus(
      labMembership.labId,
      orderId,
      status,
      {
        cancellationReason: reason,
        sampleCollectedAt: sampleCollectedAt ? new Date(sampleCollectedAt) : undefined,
        actorUserId: user.userId,
      }
    );

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update order status." },
      { status: error.statusCode || 500 }
    );
  }
}
