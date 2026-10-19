import { NextRequest, NextResponse } from "next/server";
import { createPatientOrder, CreatePatientOrderParams } from "@/services/orders/patient-order-service";
import {
  createPatientSessionToken,
  PATIENT_SESSION_COOKIE,
  PATIENT_TOKEN_MAX_AGE,
} from "@/lib/auth/patient-auth";

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

    // Check optional Idempotency-Key header if not present in body
    if (!body.idempotencyKey) {
      const headerKey = request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key");
      if (headerKey) {
        body.idempotencyKey = headerKey.trim();
      }
    }

    const order = await createPatientOrder(body);

    const patientToken = await createPatientSessionToken({
      patientId: order.patientId,
      phone: order.patient.phone,
      fullName: order.patient.fullName,
    });

    const response = NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      subtotal: Number(order.subtotal),
      collectionFee: Number(order.collectionFee),
      totalAmount: Number(order.totalAmount),
      labName: order.lab.name,
      patientToken,
      redirectUrl: `/${order.lab.slug}/booking/${order.orderNumber}`,
    });

    response.cookies.set({
      name: PATIENT_SESSION_COOKIE,
      value: patientToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PATIENT_TOKEN_MAX_AGE,
    });

    return response;
  } catch (error: unknown) {
    console.error("Order creation route error:", error);
    const message = error instanceof Error ? error.message : "Failed to create order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
