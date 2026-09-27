import { NextRequest, NextResponse } from "next/server";
import { whatsAppService } from "@/services/integrations/whatsapp/whatsapp-service";

/**
 * Meta WhatsApp Cloud API Webhook Endpoint
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    const verified = whatsAppService.verifyWebhook(token, challenge);
    if (verified) {
      return new Response(verified, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await whatsAppService.processWebhookPayload(payload);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err.message);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
