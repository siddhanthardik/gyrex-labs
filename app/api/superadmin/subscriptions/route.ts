import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import {
  getSubscriptionOverview,
  getActiveSubscriptions,
  getFailedPayments,
} from "@/services/superadmin/subscriptions-service";
import { SubscriptionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("subscriptions.read");

    const searchParams = req.nextUrl.searchParams;
    const view = searchParams.get("view"); // "overview" | "active" | "failed"
    const search = searchParams.get("search") || undefined;
    const planId = searchParams.get("planId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    if (view === "failed") {
      const failed = await getFailedPayments();
      return NextResponse.json({ failedInvoices: failed });
    }

    if (view === "active") {
      let status: SubscriptionStatus | undefined;
      if (statusParam && Object.values(SubscriptionStatus).includes(statusParam as SubscriptionStatus)) {
        status = statusParam as SubscriptionStatus;
      }
      const active = await getActiveSubscriptions({ status, planId, search, page, pageSize });
      return NextResponse.json(active);
    }

    // Default: Return overview + active snapshot
    const [overview, activeSnapshot] = await Promise.all([
      getSubscriptionOverview(),
      getActiveSubscriptions({ page: 1, pageSize: 10 }),
    ]);

    return NextResponse.json({
      ...overview,
      recentSubscriptions: activeSnapshot.subscriptions,
      totalActive: activeSnapshot.total,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch subscription data." },
      { status: err.statusCode || 500 }
    );
  }
}
