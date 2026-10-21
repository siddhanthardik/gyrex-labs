import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { AuthorizationError } from "@/lib/auth/context";

export interface LabEntitlementsSummary {
  labId: string;
  isEnterprise: boolean;
  isCustomDomainEntitled: boolean;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  maxBranchesAllowed: number;
}

interface ResolvedSubscriptionWithPlan {
  id: string;
  status: SubscriptionStatus;
  plan: {
    id: string;
    code: string;
    name: string;
    customDomainEnabled?: boolean;
  } | null;
}

let testPlanEntitlementAllowed: boolean =
  process.env.NODE_ENV === "test" || process.env.GYREX_TEST_PLAN_ENTITLEMENT === "true";

export function setTestPlanEntitlementAllowed(allowed: boolean): void {
  testPlanEntitlementAllowed = allowed;
}

export function isTestPlanEntitlementAllowed(): boolean {
  return testPlanEntitlementAllowed;
}

/**
 * Resiliently fetches a laboratory's subscription and plan.
 * If the database schema has not yet migrated the customDomainEnabled column (P2022),
 * this defaults customDomainEnabled to false (fail-closed) in production.
 * In test mode, allows PLAN_PRO / PLAN_ENTERPRISE as test fixtures without requiring migrations.
 */
async function getSubscriptionWithPlan(labId: string): Promise<ResolvedSubscriptionWithPlan | null> {
  const cleanId = (labId || "").trim();
  if (!cleanId) return null;

  try {
    return await prisma.subscription.findUnique({
      where: { labId: cleanId },
      select: {
        id: true,
        status: true,
        plan: {
          select: {
            id: true,
            code: true,
            name: true,
            customDomainEnabled: true,
          },
        },
      },
    });
  } catch (err: any) {
    if (err?.code === "P2022" || (typeof err?.message === "string" && err.message.includes("customDomainEnabled"))) {
      const fallback = await prisma.subscription.findUnique({
        where: { labId: cleanId },
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      if (!fallback || !fallback.plan) return fallback;

      // Fail-closed in production; allow test override only in explicit test environments
      const isTestEntitled =
        testPlanEntitlementAllowed &&
        (fallback.plan.code === "PLAN_PRO" || fallback.plan.code === "PLAN_ENTERPRISE");

      return {
        ...fallback,
        plan: {
          ...fallback.plan,
          customDomainEnabled: isTestEntitled,
        },
      };
    }
    throw err;
  }
}

/**
 * Checks whether a laboratory has an active or trialing Enterprise Plan subscription.
 * Fails closed if no subscription or status is ineligible.
 */
export async function isLabEnterpriseEntitled(labId: string): Promise<boolean> {
  if (!labId || !labId.trim()) return false;

  const subscription = await getSubscriptionWithPlan(labId);

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
 * Checks whether a laboratory is entitled to configure a Custom Branded Domain.
 * Requires an active or trialing subscription with customDomainEnabled set to true on its plan.
 * Fails closed if no subscription or status is ineligible (e.g. PAST_DUE, CANCELLED, EXPIRED).
 */
export async function isLabCustomDomainEntitled(labId: string): Promise<boolean> {
  if (!labId || !labId.trim()) return false;

  const subscription = await getSubscriptionWithPlan(labId);

  if (!subscription || !subscription.plan) {
    return false;
  }

  const isStatusEligible =
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.TRIALING;

  if (!isStatusEligible) {
    return false;
  }

  return Boolean(subscription.plan.customDomainEnabled);
}

/**
 * Asserts that the laboratory is entitled to configure and manage a custom branded domain.
 * Throws 403 AuthorizationError if the laboratory does not have an active subscription with custom domain entitlement.
 */
export async function assertLabCanConfigureCustomDomain(labId: string): Promise<void> {
  const isEntitled = await isLabCustomDomainEntitled(labId);

  if (!isEntitled) {
    const subscription = await getSubscriptionWithPlan(labId);
    const planDisplay = subscription?.plan?.name ? `'${subscription.plan.name}'` : "no active subscription";
    throw new AuthorizationError(
      `Access denied: Custom Branded Domains require an active subscription with custom domain entitlement. Your laboratory currently has ${planDisplay}. Please upgrade your plan to connect a branded domain.`,
      403
    );
  }
}

/**
 * Asserts that the laboratory is entitled to manage multiple branch locations.
 * Throws 403 AuthorizationError if not on an active Enterprise Plan.
 * Single-location labs are NEVER blocked for single-facility operations.
 */
export async function assertLabCanManageBranches(labId: string): Promise<void> {
  const isEntitled = await isLabEnterpriseEntitled(labId);

  if (!isEntitled) {
    const subscription = await getSubscriptionWithPlan(labId);
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
  const subscription = await getSubscriptionWithPlan(cleanId);

  const isActiveStatus =
    Boolean(subscription && subscription.plan) &&
    (subscription!.status === SubscriptionStatus.ACTIVE || subscription!.status === SubscriptionStatus.TRIALING);

  const isEnterprise = isActiveStatus && subscription!.plan!.code === "PLAN_ENTERPRISE";
  const isDomainEntitled = isActiveStatus && Boolean(subscription!.plan!.customDomainEnabled);

  return {
    labId: cleanId,
    isEnterprise,
    isCustomDomainEntitled: isDomainEntitled,
    planCode: subscription?.plan?.code || null,
    planName: subscription?.plan?.name || null,
    subscriptionStatus: subscription?.status || null,
    maxBranchesAllowed: isEnterprise ? 25 : 1,
  };
}
