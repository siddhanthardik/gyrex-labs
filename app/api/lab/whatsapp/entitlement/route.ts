import { NextResponse } from "next/server";
import { requireLabTenant } from "@/lib/auth/lab-auth";
import { resolveLabWhatsAppEntitlement } from "@/services/integrations/whatsapp/whatsapp-entitlement-service";
import { getLabQuotaUsage } from "@/services/integrations/whatsapp/whatsapp-quota-service";

/**
 * GET /api/lab/whatsapp/entitlement
 * Returns the authenticated laboratory's effective WhatsApp entitlement and shared quota usage.
 * Strict Tenant Isolation: Laboratory ID is derived exclusively from the session.
 * Zero Secrets Leaked: Never exposes tokens, secrets, or internal DB credentials.
 */
export async function GET() {
  try {
    const { labMembership } = await requireLabTenant();
    const labId = labMembership.labId;

    const entitlement = await resolveLabWhatsAppEntitlement(labId);

    let quota = null;
    if (entitlement.canUseSharedWhatsApp) {
      quota = await getLabQuotaUsage(labId);
    }

    return NextResponse.json(
      {
        success: true,
        entitlement: {
          labId: entitlement.labId,
          isEntitled: entitlement.isEntitled,
          planCode: entitlement.planCode,
          planName: entitlement.planName,
          subscriptionStatus: entitlement.subscriptionStatus,
          canUseSharedWhatsApp: entitlement.canUseSharedWhatsApp,
          monthlySharedWhatsAppQuota: entitlement.monthlySharedWhatsAppQuota,
          canConfigureCustomWaba: entitlement.canConfigureCustomWaba,
          rejectionReason: entitlement.rejectionReason || null,
        },
        quota: quota
          ? {
              periodStart: quota.periodStart.toISOString(),
              periodEnd: quota.periodEnd.toISOString(),
              quotaLimit: quota.quotaLimit,
              messagesReserved: quota.messagesReserved,
              messagesConfirmed: quota.messagesConfirmed,
              messagesAvailable: quota.messagesAvailable,
              isExhausted: quota.isExhausted,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve WhatsApp entitlement." },
      { status: error.statusCode || 500 }
    );
  }
}
