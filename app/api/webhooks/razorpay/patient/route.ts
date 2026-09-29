import { NextRequest, NextResponse } from "next/server";
import { handlePatientPaymentWebhook, WebhookError } from "@/services/integrations/payments/webhook-handler";

/**
 * Flow A: Razorpay Webhook for Patient Diagnostic Payments (PATIENT -> LAB)
 *
 * Receives server-to-server callbacks from Razorpay.
 * Reconciles payments asynchronously when client callbacks are interrupted or delayed.
 * Does NOT require patient authentication.
 * Enforces raw body preservation for HMAC-SHA256 signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const labId =
      request.headers.get("x-lab-id") ||
      request.nextUrl.searchParams.get("labId") ||
      undefined;

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header." },
        { status: 400 }
      );
    }

    if (!rawBody) {
      return NextResponse.json(
        { error: "Missing webhook request body." },
        { status: 400 }
      );
    }

    const result = await handlePatientPaymentWebhook(rawBody, signature, labId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof WebhookError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    const message = err instanceof Error ? err.message : "Webhook processing failed.";
    const status = message.toLowerCase().includes("signature") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
