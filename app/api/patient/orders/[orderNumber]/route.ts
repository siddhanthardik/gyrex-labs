import { NextRequest, NextResponse } from "next/server";
import { getOrderTracking } from "@/services/orders/patient-order-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const phone = request.nextUrl.searchParams.get("phone") || undefined;

    const tracking = await getOrderTracking(orderNumber, phone);

    if (!tracking) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, tracking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unauthorized access.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
