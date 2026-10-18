import { NextRequest, NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { whatsAppService } from "@/services/integrations/whatsapp/whatsapp-service";
import {
  assertLabCanConfigureCustomWaba,
  resolveLabWhatsAppEntitlement,
} from "@/services/integrations/whatsapp/whatsapp-entitlement-service";
import { getLabQuotaUsage } from "@/services/integrations/whatsapp/whatsapp-quota-service";

/**
 * GET /api/lab/whatsapp
 * Retrieves laboratory WhatsApp Business connection status, safe configuration, and subscription entitlement.
 */
export async function GET() {
  try {
    const { labMembership } = await requireLabTenant();
    const [settings, entitlement] = await Promise.all([
      whatsAppService.getLabWhatsAppSettings(labMembership.labId),
      resolveLabWhatsAppEntitlement(labMembership.labId),
    ]);

    let quota = null;
    if (entitlement.canUseSharedWhatsApp) {
      quota = await getLabQuotaUsage(labMembership.labId);
    }

    return NextResponse.json({ success: true, settings, entitlement, quota }, { status: 200 });
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
 * Server-authoritative: Strictly enforces that laboratory plan permits custom Meta WABA integration.
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

    // Check if client is attempting to configure custom Meta credentials or enable custom WABA
    const isConfiguringMetaCredentials = Boolean(
      (wabaId && wabaId.trim()) ||
      (phoneNumberId && phoneNumberId.trim()) ||
      (accessToken && accessToken.trim()) ||
      (appSecret && appSecret.trim())
    );

    const isEnablingCustomWaba = isEnabled === true;

    if (isConfiguringMetaCredentials || isEnablingCustomWaba) {
      await assertLabCanConfigureCustomWaba(labMembership.labId);
    }

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
