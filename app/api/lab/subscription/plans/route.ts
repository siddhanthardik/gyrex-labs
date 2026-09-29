import { NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getActiveSubscriptionPlans } from "@/services/lab/subscription-service";

/**
 * GET /api/lab/subscription/plans
 * Returns all active Gyrex platform subscription plans for selection.
 */
export async function GET() {
  try {
    await requireLabTenant(PERMISSIONS.SUBSCRIPTIONS_READ);
    const plans = await getActiveSubscriptionPlans();
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve subscription plans." },
      { status: error.statusCode || 500 }
    );
  }
}
