import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireLabAccess } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const user = await requireAuth();

    // 2. Get optional labId from query parameters
    const requestedLabId = request.nextUrl.searchParams.get("labId");

    // 3. Verify that user is authorized to access the requested lab context
    // If user is from LAB_001 and requests LAB_002, requireLabAccess throws 403
    const { labMembership } = await requireLabAccess(requestedLabId || undefined);

    // 4. Retrieve orders strictly scoped to the authorized laboratory
    const orders = await prisma.order.findMany({
      where: { labId: labMembership.labId },
      select: {
        id: true,
        orderNumber: true,
        labId: true,
        orderStatus: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      labId: labMembership.labId,
      userRole: user.role,
      orders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Access Denied";
    const statusCode = error && typeof error === "object" && "statusCode" in error ? (error.statusCode as number) : 403;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
