import { NextRequest, NextResponse } from "next/server";
import { handleSubscriptionWebhook } from "@/services/integrations/payments/webhook-handler";

/**
 * Flow B: Razorpay Webhook for Gyrex SaaS Platform Subscriptions (LAB -> GYREX)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    const result = await handleSubscriptionWebhook(rawBody, signature);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Subscription webhook error:", err.message);
    return NextResponse.json({ error: err.message || "Subscription webhook failed" }, { status: 400 });
  }
}
