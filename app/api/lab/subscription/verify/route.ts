import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { verifyAndConfirmSubscriptionPayment } from "@/services/integrations/payments/subscription-billing-service";

/**
 * POST /api/lab/subscription/verify
 *
 * Verifies Razorpay checkout signature for laboratory's Gyrex platform subscription.
 * Uses timing-safe constant-time comparison and platform credentials.
 * Enforces strict multi-tenant isolation.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
    const body = await request.json();

    const { invoiceId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = body;

    if (!invoiceId || !gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      return NextResponse.json(
        { error: "Missing required payment verification fields." },
        { status: 400 }
      );
    }

    const result = await verifyAndConfirmSubscriptionPayment({
      invoiceId: invoiceId.trim(),
      gatewayOrderId: gatewayOrderId.trim(),
      gatewayPaymentId: gatewayPaymentId.trim(),
      gatewaySignature: gatewaySignature.trim(),
      labId: labMembership.labId,
      actorUserId: user.userId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error.message || "Failed to verify subscription payment.";
    const status =
      message.includes("signature") || message.includes("Unauthorized")
        ? 401
        : message.includes("not found")
        ? 404
        : error.statusCode || 400;

    return NextResponse.json({ error: message }, { status });
  }
}
