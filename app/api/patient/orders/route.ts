import { NextRequest, NextResponse } from "next/server";
import { createPatientOrder, CreatePatientOrderParams } from "@/services/orders/patient-order-service";

export async function POST(request: NextRequest) {
  try {
    const body: CreatePatientOrderParams = await request.json();

    if (!body.labId || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order parameters: labId and items are required." },
        { status: 400 }
      );
    }

    if (!body.patient || !body.patient.fullName || !body.patient.phone) {
      return NextResponse.json(
        { error: "Patient name and phone number are required." },
        { status: 400 }
      );
    }

    const order = await createPatientOrder(body);

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      subtotal: Number(order.subtotal),
      collectionFee: Number(order.collectionFee),
      totalAmount: Number(order.totalAmount),
      labName: order.lab.name,
      redirectUrl: `/${order.lab.slug}/booking/${order.orderNumber}`,
    });
  } catch (error: unknown) {
    console.error("Order creation route error:", error);
    const message = error instanceof Error ? error.message : "Failed to create order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
