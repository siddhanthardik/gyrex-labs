import { NextRequest, NextResponse } from "next/server";
import { handleSubscriptionWebhook, WebhookError } from "@/services/integrations/payments/webhook-handler";

/**
 * Flow B: Razorpay Webhook for Gyrex SaaS Platform Subscriptions (LAB -> GYREX)
 *
 * Verifies raw request body using platform secret GYREX_RAZORPAY_WEBHOOK_SECRET.
 * Reconciles subscription renewals, charges, and halts asynchronously and idempotently.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json({ error: "Missing webhook request body" }, { status: 400 });
    }

    const result = await handleSubscriptionWebhook(rawBody, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof WebhookError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    const message = err instanceof Error ? err.message : "Subscription webhook failed";
    const status = message.toLowerCase().includes("signature") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
