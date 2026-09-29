import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { selectSubscriptionPlan } from "@/services/lab/subscription-service";
import { BillingCycle } from "@prisma/client";

/**
 * POST /api/lab/subscription/select-plan
 *
 * Laboratory onboarding plan selection.
 * Server-authoritative: loads price, interval, and metadata from DB.
 * Never creates Razorpay orders, charges cards, or modifies patient payments.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
    const body = await request.json();

    const { planId, billingCycle } = body;
    if (!planId || typeof planId !== "string" || !planId.trim()) {
      return NextResponse.json(
        { error: "A valid planId is required." },
        { status: 400 }
      );
    }

    const normalizedCycle =
      billingCycle === "YEARLY" ? BillingCycle.YEARLY : BillingCycle.MONTHLY;

    const subscription = await selectSubscriptionPlan({
      labId: labMembership.labId,
      planId: planId.trim(),
      billingCycle: normalizedCycle,
      actorUserId: user.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription plan selected successfully.",
      subscription,
    });
  } catch (error: any) {
    const message = error.message || "Failed to select subscription plan.";
    const status =
      message.includes("invalid") ||
      message.includes("inactive") ||
      message.includes("already has an active") ||
      message.includes("required")
        ? 400
        : error.statusCode || 500;

    return NextResponse.json({ error: message }, { status });
  }
}
