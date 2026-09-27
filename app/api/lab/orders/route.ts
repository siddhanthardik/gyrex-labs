import { NextRequest, NextResponse } from "next/server";
import { requireLabAccess } from "@/lib/auth/context";
import { getLabOrders, getLabOrderDetail } from "@/services/lab/orders-service";
import { OrderStatus, PaymentStatus, CollectionType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { labMembership } = await requireLabAccess();
    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get("orderId");
    if (orderId) {
      const order = await getLabOrderDetail(labMembership.labId, orderId);
      return NextResponse.json({ success: true, order });
    }

    const search = searchParams.get("search") || undefined;
    const orderStatus = (searchParams.get("orderStatus") as OrderStatus) || undefined;
    const paymentStatus = (searchParams.get("paymentStatus") as PaymentStatus) || undefined;
    const collectionType = (searchParams.get("collectionType") as CollectionType) || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;

    const data = await getLabOrders(labMembership.labId, {
      search,
      orderStatus,
      paymentStatus,
      collectionType,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve orders." },
      { status: error.statusCode || 500 }
    );
  }
}
