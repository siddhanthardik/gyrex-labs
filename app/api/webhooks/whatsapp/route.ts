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

  // Meta Webhook Verification Handshake requires hub.mode=subscribe, hub.verify_token, and hub.challenge
  if (!mode || !token || !challenge) {
    return NextResponse.json(
      { error: "Bad Request: Missing required hub verification parameters (hub.mode, hub.verify_token, hub.challenge)." },
      { status: 400 }
    );
  }

  if (mode !== "subscribe") {
    return NextResponse.json(
      { error: "Forbidden: Unsupported hub.mode. Expected 'subscribe'." },
      { status: 403 }
    );
  }

  const verifiedChallenge = await whatsAppService.verifyWebhookHandshake(token, challenge, labId);
  if (verifiedChallenge !== null) {
    // Meta strictly requires returning the raw challenge as plain text with HTTP 200
    return new Response(verifiedChallenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  return NextResponse.json(
    { error: "Forbidden: Verification failed. Invalid verify token." },
    { status: 403 }
  );
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
