import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getAllPlatformOrders } from "@/services/superadmin/orders-service";
import { OrderStatus, PaymentStatus, CollectionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("orders.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const labId = searchParams.get("labId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const paymentStatusParam = searchParams.get("paymentStatus") || undefined;
    const collectionTypeParam = searchParams.get("collectionType") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    let status: OrderStatus | undefined;
    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      status = statusParam as OrderStatus;
    }

    let paymentStatus: PaymentStatus | undefined;
    if (paymentStatusParam && Object.values(PaymentStatus).includes(paymentStatusParam as PaymentStatus)) {
      paymentStatus = paymentStatusParam as PaymentStatus;
    }

    let collectionType: CollectionType | undefined;
    if (collectionTypeParam && Object.values(CollectionType).includes(collectionTypeParam as CollectionType)) {
      collectionType = collectionTypeParam as CollectionType;
    }

    const data = await getAllPlatformOrders({
      search,
      labId,
      status,
      paymentStatus,
      collectionType,
      startDate,
      endDate,
      page,
      pageSize,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch platform orders." },
      { status: err.statusCode || 500 }
    );
  }
}
