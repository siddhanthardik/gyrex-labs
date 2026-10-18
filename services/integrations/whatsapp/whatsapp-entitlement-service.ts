import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { AuthorizationError } from "@/lib/auth/context";

export interface LabWhatsAppEntitlement {
  labId: string;
  isEntitled: boolean;
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  canUseSharedWhatsApp: boolean;
  monthlySharedWhatsAppQuota: number;
  canConfigureCustomWaba: boolean;
  rejectionReason?: "NO_ACTIVE_SUBSCRIPTION" | "SUBSCRIPTION_STATUS_INELIGIBLE" | "CAPABILITY_NOT_PERMITTED";
}

/**
 * Server-authoritative resolver for a laboratory's WhatsApp capabilities.
 * Evaluates the active subscription plan and enforces strict fail-closed rules.
 * Existing credentials in PlatformSettings never grant entitlement by themselves.
 */
export async function resolveLabWhatsAppEntitlement(labId: string): Promise<LabWhatsAppEntitlement> {
  if (!labId || !labId.trim()) {
    return {
      labId: "",
      isEntitled: false,
      planId: null,
      planCode: null,
      planName: null,
      subscriptionStatus: null,
      canUseSharedWhatsApp: false,
      monthlySharedWhatsAppQuota: 0,
      canConfigureCustomWaba: false,
      rejectionReason: "NO_ACTIVE_SUBSCRIPTION",
    };
  }

  const cleanLabId = labId.trim();

  const subscription = await prisma.subscription.findUnique({
    where: { labId: cleanLabId },
    include: { plan: true },
  });

  // Fail-closed: Lab has no subscription record
  if (!subscription || !subscription.plan) {
    return {
      labId: cleanLabId,
      isEntitled: false,
      planId: null,
      planCode: null,
      planName: null,
      subscriptionStatus: null,
      canUseSharedWhatsApp: false,
      monthlySharedWhatsAppQuota: 0,
      canConfigureCustomWaba: false,
      rejectionReason: "NO_ACTIVE_SUBSCRIPTION",
    };
  }

  const status = subscription.status;
  const isStatusEligible =
    status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;

  // Fail-closed: Subscription is PAST_DUE, CANCELLED, EXPIRED, or PAUSED
  if (!isStatusEligible) {
    return {
      labId: cleanLabId,
      isEntitled: false,
      planId: subscription.plan.id,
      planCode: subscription.plan.code,
      planName: subscription.plan.name,
      subscriptionStatus: status,
      canUseSharedWhatsApp: false,
      monthlySharedWhatsAppQuota: 0,
      canConfigureCustomWaba: false,
      rejectionReason: "SUBSCRIPTION_STATUS_INELIGIBLE",
    };
  }

  // Active / Trialing subscription in good standing
  const plan = subscription.plan;
  const canUseShared = Boolean(plan.canUseSharedWhatsApp && plan.monthlySharedWhatsAppQuota > 0);
  const quota = plan.monthlySharedWhatsAppQuota ?? 0;
  const canCustomWaba = Boolean(plan.canConfigureCustomWaba);

  return {
    labId: cleanLabId,
    isEntitled: canUseShared || canCustomWaba,
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    subscriptionStatus: status,
    canUseSharedWhatsApp: canUseShared,
    monthlySharedWhatsAppQuota: quota,
    canConfigureCustomWaba: canCustomWaba,
  };
}

/**
 * Authorizes a laboratory to configure or test lab-owned Meta WhatsApp Business credentials.
 * Throws 403 AuthorizationError if the plan does not explicitly have canConfigureCustomWaba.
 */
export async function assertLabCanConfigureCustomWaba(labId: string): Promise<LabWhatsAppEntitlement> {
  const entitlement = await resolveLabWhatsAppEntitlement(labId);

  if (!entitlement.canConfigureCustomWaba) {
    const planDisplay = entitlement.planName ? `'${entitlement.planName}'` : "no active subscription";
    throw new AuthorizationError(
      `Access denied: Your current plan (${planDisplay}) does not permit custom Meta WhatsApp Business integration. Please upgrade to a plan entitled to lab-owned Meta messaging.`,
      403
    );
  }

  return entitlement;
}

/**
 * Authorizes a laboratory to utilize Gyrex's centrally managed shared WhatsApp sender.
 * Throws 403 AuthorizationError if the plan is not entitled to shared messaging or quota is 0.
 */
export async function assertLabCanUseSharedWhatsApp(labId: string): Promise<LabWhatsAppEntitlement> {
  const entitlement = await resolveLabWhatsAppEntitlement(labId);

  if (!entitlement.canUseSharedWhatsApp || entitlement.monthlySharedWhatsAppQuota <= 0) {
    const planDisplay = entitlement.planName ? `'${entitlement.planName}'` : "no active subscription";
    throw new AuthorizationError(
      `Access denied: Your current plan (${planDisplay}) is not entitled to Gyrex Shared WhatsApp messaging or has 0 included messages.`,
      403
    );
  }

  return entitlement;
}
