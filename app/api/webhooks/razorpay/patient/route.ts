import { NextRequest, NextResponse } from "next/server";
import { handlePatientPaymentWebhook } from "@/services/integrations/payments/webhook-handler";

/**
 * Flow A: Razorpay Webhook for Patient Diagnostic Payments (PATIENT -> LAB)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const labId = request.headers.get("x-lab-id") || request.nextUrl.searchParams.get("labId") || undefined;

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    const result = await handlePatientPaymentWebhook(rawBody, signature, labId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Patient payment webhook error:", err.message);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 400 });
  }
}
