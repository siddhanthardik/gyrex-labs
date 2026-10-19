import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { AuthorizationError } from "@/lib/auth/context";

export interface LabEntitlementsSummary {
  labId: string;
  isEnterprise: boolean;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  maxBranchesAllowed: number;
}

/**
 * Checks whether a laboratory has an active or trialing Enterprise Plan subscription.
 * Fails closed if no subscription or status is ineligible.
 */
export async function isLabEnterpriseEntitled(labId: string): Promise<boolean> {
  if (!labId || !labId.trim()) return false;

  const subscription = await prisma.subscription.findUnique({
    where: { labId: labId.trim() },
    include: { plan: true },
  });

  if (!subscription || !subscription.plan) {
    return false;
  }

  const isStatusEligible =
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.TRIALING;

  if (!isStatusEligible) {
    return false;
  }

  return subscription.plan.code === "PLAN_ENTERPRISE";
}

/**
 * Asserts that the laboratory is entitled to manage multiple branch locations.
 * Throws 403 AuthorizationError if not on an active Enterprise Plan.
 * Single-location labs are NEVER blocked for single-facility operations.
 */
export async function assertLabCanManageBranches(labId: string): Promise<void> {
  const isEntitled = await isLabEnterpriseEntitled(labId);

  if (!isEntitled) {
    const subscription = await prisma.subscription.findUnique({
      where: { labId: labId.trim() },
      include: { plan: true },
    });
    const planDisplay = subscription?.plan?.name ? `'${subscription.plan.name}'` : "no active subscription";
    throw new AuthorizationError(
      `Access denied: Multi-location branch management is an Enterprise-tier capability. Your laboratory currently has ${planDisplay}. Please upgrade to Enterprise Multi-Branch Plan to manage multiple physical centers.`,
      403
    );
  }
}

/**
 * Returns the maximum number of physical locations/branches permitted by the lab's plan.
 * Returns 1 for Starter, Growth, Professional, and unassigned accounts.
 * Returns 25 for Enterprise Multi-Branch.
 */
export async function getLabMaxLocations(labId: string): Promise<number> {
  const isEntitled = await isLabEnterpriseEntitled(labId);
  return isEntitled ? 25 : 1;
}

/**
 * Summarizes the laboratory's active subscription entitlements.
 */
export async function getLabEntitlementsSummary(labId: string): Promise<LabEntitlementsSummary> {
  const cleanId = (labId || "").trim();
  const subscription = await prisma.subscription.findUnique({
    where: { labId: cleanId },
    include: { plan: true },
  });

  const isEntitled =
    Boolean(subscription && subscription.plan) &&
    (subscription!.status === SubscriptionStatus.ACTIVE || subscription!.status === SubscriptionStatus.TRIALING) &&
    subscription!.plan.code === "PLAN_ENTERPRISE";

  return {
    labId: cleanId,
    isEnterprise: isEntitled,
    planCode: subscription?.plan?.code || null,
    planName: subscription?.plan?.name || null,
    subscriptionStatus: subscription?.status || null,
    maxBranchesAllowed: isEntitled ? 25 : 1,
  };
}
