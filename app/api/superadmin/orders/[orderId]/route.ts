import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getPlatformOrderDetail } from "@/services/superadmin/orders-service";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireSuperadminApi("orders.read");
    const { orderId } = await context.params;

    const data = await getPlatformOrderDetail(orderId);
    if (!data) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch order detail." },
      { status: err.statusCode || 500 }
    );
  }
}
