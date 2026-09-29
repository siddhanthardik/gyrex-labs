import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { whatsAppService } from "@/services/integrations/whatsapp/whatsapp-service";

/**
 * GET /api/lab/whatsapp
 * Retrieves laboratory WhatsApp Business connection status and safe configuration.
 */
export async function GET() {
  try {
    const { labMembership } = await requireLabTenant();
    const settings = await whatsAppService.getLabWhatsAppSettings(labMembership.labId);
    return NextResponse.json({ success: true, settings }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve WhatsApp settings." },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * POST /api/lab/whatsapp
 * Updates laboratory WhatsApp Business configuration.
 * Encrypts sensitive credentials (access token and app secret) with AES-256-GCM.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, labMembership } = await requireLabTenant();
    const body = await request.json();

    const {
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      accessToken,
      appSecret,
      webhookVerifyToken,
      isEnabled,
      welcomeMessageCustom,
      notifyOrderConfirmation,
      notifyPaymentConfirmation,
      notifySampleCollected,
      notifyReportReady,
    } = body;

    const settings = await whatsAppService.updateLabWhatsAppSettings(
      labMembership.labId,
      {
        wabaId,
        phoneNumberId,
        displayPhoneNumber,
        accessToken,
        appSecret,
        webhookVerifyToken,
        isEnabled,
        welcomeMessageCustom,
        notifyOrderConfirmation,
        notifyPaymentConfirmation,
        notifySampleCollected,
        notifyReportReady,
      },
      user.userId
    );

    return NextResponse.json({ success: true, settings }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update WhatsApp settings." },
      { status: error.statusCode || 400 }
    );
  }
}
