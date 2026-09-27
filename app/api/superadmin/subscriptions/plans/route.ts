import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import {
  getSubscriptionPlans,
  updateSubscriptionPlan,
} from "@/services/superadmin/subscriptions-service";

export async function GET() {
  try {
    await requireSuperadminApi("subscriptions.read");
    const plans = await getSubscriptionPlans();
    return NextResponse.json({ plans });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch subscription plans." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("subscriptions.manage");
    const body = await req.json();
    const { planId, ...data } = body;

    if (!planId) {
      return NextResponse.json({ error: "planId is required." }, { status: 400 });
    }

    const updated = await updateSubscriptionPlan(planId, data, actor);
    return NextResponse.json({ success: true, plan: updated });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to update subscription plan." },
      { status: err.statusCode || 500 }
    );
  }
}
