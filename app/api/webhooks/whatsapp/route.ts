import { NextRequest, NextResponse } from "next/server";
import { whatsAppService } from "@/services/integrations/whatsapp/whatsapp-service";

/**
 * Meta WhatsApp Cloud API Webhook Endpoint (Multi-Tenant)
 *
 * GET: Handles Meta webhook verification handshake.
 * POST: Handles inbound messages, verifies X-Hub-Signature-256, and sends automated welcome routing.
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const labId = request.nextUrl.searchParams.get("labId") || undefined;

  if (mode === "subscribe" && token && challenge) {
    const verifiedChallenge = await whatsAppService.verifyWebhookHandshake(token, challenge, labId);
    if (verifiedChallenge) {
      return new Response(verifiedChallenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  return NextResponse.json({ error: "Verification failed. Invalid verify token." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const labId = request.nextUrl.searchParams.get("labId") || undefined;

    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json({ error: "Missing webhook request body." }, { status: 400 });
    }

    const result = await whatsAppService.handleInboundWebhook(rawBody, signature, labId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "WhatsApp webhook processing error";
    const status = message.toLowerCase().includes("signature") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
