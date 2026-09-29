import { NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createSubscriptionCheckout } from "@/services/integrations/payments/subscription-billing-service";

/**
 * POST /api/lab/subscription/create-checkout
 *
 * Initiates Razorpay checkout for the laboratory's Gyrex platform subscription.
 * Uses Gyrex platform credentials exclusively.
 * Price is loaded authoritatively from SubscriptionPlan in database.
 */
export async function POST() {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.SUBSCRIPTIONS_MANAGE);

    const checkoutData = await createSubscriptionCheckout({
      labId: labMembership.labId,
      actorUserId: user.userId,
    });

    return NextResponse.json(checkoutData, { status: 200 });
  } catch (error: any) {
    const message = error.message || "Failed to create subscription checkout.";
    const status =
      message.includes("No subscription plan") ||
      message.includes("inactive or invalid") ||
      message.includes("already active")
        ? 400
        : error.statusCode || 500;

    return NextResponse.json({ error: message }, { status });
  }
}
