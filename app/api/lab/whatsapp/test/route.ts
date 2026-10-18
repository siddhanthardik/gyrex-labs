import { NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { whatsAppService } from "@/services/integrations/whatsapp/whatsapp-service";
import { assertLabCanConfigureCustomWaba } from "@/services/integrations/whatsapp/whatsapp-entitlement-service";

/**
 * POST /api/lab/whatsapp/test
 * Verifies connectivity with Meta Graph API for the laboratory's WhatsApp account.
 * Server-authoritative: Strictly enforces that laboratory plan permits custom Meta WABA integration.
 */
export async function POST() {
  try {
    const { labMembership } = await requireLabTenant();
    await assertLabCanConfigureCustomWaba(labMembership.labId);
    const result = await whatsAppService.testLabWhatsAppConnection(labMembership.labId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to test WhatsApp connection." },
      { status: error.statusCode || 403 }
    );
  }
}
