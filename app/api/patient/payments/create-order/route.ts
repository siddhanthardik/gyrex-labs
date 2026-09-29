import { NextRequest, NextResponse } from "next/server";
import { initiatePatientPayment } from "@/services/integrations/payments/patient-payment-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    if (!body.orderId || typeof body.orderId !== "string") {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const result = await initiatePatientPayment({
      orderId: body.orderId,
      paymentMethod: body.paymentMethod,
      verificationPhone: body.verificationPhone,
      clientSuppliedAmount: body.amount,
      clientSuppliedLabId: body.labId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment order could not be created.";
    // Safe error message returned to caller (no secrets, no database stack traces)
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
