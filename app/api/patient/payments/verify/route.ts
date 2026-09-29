import { NextRequest, NextResponse } from "next/server";
import { verifyAndConfirmPatientPayment } from "@/services/integrations/payments/patient-payment-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const orderId = body.orderId;
    const gatewayOrderId = body.gatewayOrderId || body.razorpayOrderId;
    const gatewayPaymentId = body.gatewayPaymentId || body.razorpayPaymentId;
    const gatewaySignature = body.gatewaySignature || body.razorpaySignature;

    if (!orderId || !gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters." },
        { status: 400 }
      );
    }

    const result = await verifyAndConfirmPatientPayment({
      orderId,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      verificationPhone: body.verificationPhone,
      currency: body.currency,
      amountInPaise: body.amountInPaise || body.amount,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment verification failed.";
    // Safe error message returned to caller (no secrets, no database stack traces)
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
