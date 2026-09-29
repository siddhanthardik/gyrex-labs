import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getLabSubscriptionDetails,
  changeLabSubscriptionPlan,
  cancelLabSubscription,
} from "@/services/lab/subscription-service";
import { BillingCycle } from "@prisma/client";

export async function GET() {
  try {
    const { labMembership } = await requireLabTenant(PERMISSIONS.SUBSCRIPTIONS_READ);
    const details = await getLabSubscriptionDetails(labMembership.labId);
    return NextResponse.json({ success: true, ...details });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve subscription details." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
    const body = await request.json();

    const { planCode, planId, billingCycle } = body;
    const target = planId || planCode;
    if (!target) {
      return NextResponse.json({ error: "planId or planCode is required." }, { status: 400 });
    }

    const updated = await changeLabSubscriptionPlan(
      labMembership.labId,
      target,
      billingCycle === "YEARLY" ? BillingCycle.YEARLY : BillingCycle.MONTHLY,
      user.userId
    );

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to change subscription plan." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { user, labMembership } = await requireLabTenant(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
    const updated = await cancelLabSubscription(labMembership.labId, user.userId);
    return NextResponse.json({ success: true, subscription: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription." },
      { status: error.statusCode || 500 }
    );
  }
}
