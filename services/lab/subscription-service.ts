import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { BillingCycle, AuditAction, SubscriptionStatus } from "@prisma/client";

/**
 * Retrieves all active platform subscription plans.
 */
export async function getActiveSubscriptionPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    priceMonthly: Number(p.priceMonthly),
    priceYearly: Number(p.priceYearly),
    maxOrdersPerMonth: p.maxOrdersPerMonth,
    maxStaffAccounts: p.maxStaffAccounts,
    customBrandingEnabled: p.customBrandingEnabled,
    geminiPrescriptionAiEnabled: p.geminiPrescriptionAiEnabled,
    isActive: p.isActive,
    displayOrder: p.displayOrder,
  }));
}

/**
 * Retrieves the current laboratory subscription, if any.
 * Does NOT mutate database or auto-create subscriptions.
 */
export async function getLabSubscription(labId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { labId },
    include: {
      plan: true,
      invoices: {
        orderBy: { dueDate: "desc" },
        take: 12,
      },
    },
  });

  if (!sub) {
    return null;
  }

  const price =
    sub.billingCycle === BillingCycle.MONTHLY
      ? Number(sub.plan.priceMonthly)
      : Number(sub.plan.priceYearly);

  return {
    id: sub.id,
    labId: sub.labId,
    status: sub.status,
    billingCycle: sub.billingCycle,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialEndsAt: sub.trialEndsAt,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    cancelledAt: sub.cancelledAt,
    gracePeriodEndsAt: sub.gracePeriodEndsAt,
    effectivePrice: price,
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      code: sub.plan.code,
      description: sub.plan.description,
      priceMonthly: Number(sub.plan.priceMonthly),
      priceYearly: Number(sub.plan.priceYearly),
      maxOrdersPerMonth: sub.plan.maxOrdersPerMonth,
      maxStaffAccounts: sub.plan.maxStaffAccounts,
      customBrandingEnabled: sub.plan.customBrandingEnabled,
      geminiPrescriptionAiEnabled: sub.plan.geminiPrescriptionAiEnabled,
    },
    invoices: sub.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amountDue: Number(inv.amountDue),
      amountPaid: Number(inv.amountPaid),
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
    })),
  };
}

/**
 * Selects a subscription plan for the laboratory during onboarding.
 * Server-authoritative: loads price, interval, and metadata from DB.
 * Never charges a card, creates an order, or creates a payment.
 */
export async function selectSubscriptionPlan({
  labId,
  planId,
  billingCycle = BillingCycle.MONTHLY,
  actorUserId,
}: {
  labId: string;
  planId: string;
  billingCycle?: BillingCycle;
  actorUserId?: string;
}) {
  if (!planId || typeof planId !== "string") {
    throw new Error("A valid planId is required.");
  }

  // 1. Authoritative Plan Discovery & Active Check
  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      OR: [{ id: planId }, { code: planId }],
      isActive: true,
    },
  });

  if (!plan) {
    throw new Error("Selected subscription plan is invalid or inactive.");
  }

  // 2. Existing Subscription & Rule Protection
  const existingSub = await prisma.subscription.findUnique({
    where: { labId },
    include: { plan: true },
  });

  if (existingSub && existingSub.status === SubscriptionStatus.ACTIVE) {
    throw new Error("Your laboratory already has an active subscription.");
  }

  const now = new Date();
  const trialDays = 14;
  const periodEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // 3. Upsert Subscription State
  const updated = await prisma.subscription.upsert({
    where: { labId },
    update: {
      planId: plan.id,
      billingCycle,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: periodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
    create: {
      labId,
      planId: plan.id,
      billingCycle,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: periodEnd,
    },
    include: { plan: true },
  });

  // 4. Audit Log
  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.SUBSCRIPTION_CHANGED,
    entityType: "Subscription",
    entityId: updated.id,
    labId,
    metadata: {
      action: "PLAN_SELECTED",
      planCode: plan.code,
      planName: plan.name,
      billingCycle,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: Number(plan.priceYearly),
    },
  });

  const price =
    updated.billingCycle === BillingCycle.MONTHLY
      ? Number(updated.plan.priceMonthly)
      : Number(updated.plan.priceYearly);

  return {
    id: updated.id,
    labId: updated.labId,
    status: updated.status,
    billingCycle: updated.billingCycle,
    currentPeriodStart: updated.currentPeriodStart,
    currentPeriodEnd: updated.currentPeriodEnd,
    trialEndsAt: updated.trialEndsAt,
    effectivePrice: price,
    plan: {
      id: updated.plan.id,
      name: updated.plan.name,
      code: updated.plan.code,
      description: updated.plan.description,
      priceMonthly: Number(updated.plan.priceMonthly),
      priceYearly: Number(updated.plan.priceYearly),
      maxOrdersPerMonth: updated.plan.maxOrdersPerMonth,
      maxStaffAccounts: updated.plan.maxStaffAccounts,
    },
  };
}

/**
 * Retrieves the laboratory's Gyrex Labs SaaS subscription & billing details.
 * Lab -> Gyrex (Flow B)
 */
export async function getLabSubscriptionDetails(labId: string, autoCreateDefault: boolean = false) {
  let sub = await prisma.subscription.findUnique({
    where: { labId },
    include: {
      plan: true,
      invoices: {
        orderBy: { dueDate: "desc" },
        take: 12,
      },
    },
  });

  // Only create default trial if explicitly requested (e.g. legacy fallback)
  if (!sub && autoCreateDefault) {
    let growthPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: "PLAN_GROWTH" },
    });

    if (!growthPlan) {
      growthPlan = await prisma.subscriptionPlan.create({
        data: {
          name: "Growth",
          code: "PLAN_GROWTH",
          description: "Ideal for growing independent diagnostic laboratories",
          priceMonthly: 4999,
          priceYearly: 49990,
          maxOrdersPerMonth: 500,
          maxStaffAccounts: 3,
        },
      });
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    sub = await prisma.subscription.create({
      data: {
        labId,
        planId: growthPlan.id,
        status: SubscriptionStatus.TRIALING,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: periodEnd,
      },
      include: {
        plan: true,
        invoices: true,
      },
    });
  }

  const allPlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const availablePlans = allPlans.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    priceMonthly: Number(p.priceMonthly),
    priceYearly: Number(p.priceYearly),
    maxOrdersPerMonth: p.maxOrdersPerMonth,
    maxStaffAccounts: p.maxStaffAccounts,
    customBrandingEnabled: p.customBrandingEnabled,
    geminiPrescriptionAiEnabled: p.geminiPrescriptionAiEnabled,
  }));

  if (!sub) {
    return {
      hasSubscription: false,
      subscription: null,
      availablePlans,
      platformNotice: {
        title: "Gyrex Labs Subscription",
        description:
          "This is what your laboratory pays to Gyrex for platform technology, hosting, and patient commerce services. Diagnostic patient earnings go directly to your laboratory.",
      },
    };
  }

  const price =
    sub.billingCycle === BillingCycle.MONTHLY
      ? Number(sub.plan.priceMonthly)
      : Number(sub.plan.priceYearly);

  return {
    hasSubscription: true,
    subscription: {
      id: sub.id,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      cancelledAt: sub.cancelledAt,
      gracePeriodEndsAt: sub.gracePeriodEndsAt,
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        code: sub.plan.code,
        description: sub.plan.description,
        priceMonthly: Number(sub.plan.priceMonthly),
        priceYearly: Number(sub.plan.priceYearly),
        maxOrdersPerMonth: sub.plan.maxOrdersPerMonth,
        maxStaffAccounts: sub.plan.maxStaffAccounts,
        customBrandingEnabled: sub.plan.customBrandingEnabled,
        geminiPrescriptionAiEnabled: sub.plan.geminiPrescriptionAiEnabled,
      },
      effectivePrice: price,
      invoices: sub.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountDue: Number(inv.amountDue),
        amountPaid: Number(inv.amountPaid),
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
      })),
    },
    availablePlans,
    platformNotice: {
      title: "Gyrex Labs Subscription",
      description:
        "This is what your laboratory pays to Gyrex for platform technology, hosting, and patient commerce services. Diagnostic patient earnings go directly to your laboratory.",
    },
  };
}

/**
 * Changes the laboratory's platform subscription plan.
 */
export async function changeLabSubscriptionPlan(
  labId: string,
  newPlanCode: string,
  billingCycle: BillingCycle = BillingCycle.MONTHLY,
  actorUserId?: string
) {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      OR: [{ code: newPlanCode }, { id: newPlanCode }],
      isActive: true,
    },
  });

  if (!plan) {
    throw new Error("Selected subscription plan was not found.");
  }

  const existingSub = await prisma.subscription.findUnique({
    where: { labId },
    include: { plan: true },
  });

  const updated = await prisma.subscription.upsert({
    where: { labId },
    update: {
      planId: plan.id,
      billingCycle,
      cancelAtPeriodEnd: false,
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      labId,
      planId: plan.id,
      billingCycle,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.SUBSCRIPTION_CHANGED,
    entityType: "Subscription",
    entityId: updated.id,
    labId,
    metadata: {
      previousPlan: existingSub?.plan.code,
      newPlan: plan.code,
      billingCycle,
    },
  });

  return updated;
}

/**
 * Requests cancellation of the platform subscription at the end of the billing period.
 */
export async function cancelLabSubscription(labId: string, actorUserId?: string) {
  const sub = await prisma.subscription.findUnique({ where: { labId } });
  if (!sub) {
    throw new Error("No active subscription found.");
  }

  const updated = await prisma.subscription.update({
    where: { labId },
    data: {
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
    },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.SUBSCRIPTION_CHANGED,
    entityType: "Subscription",
    entityId: sub.id,
    labId,
    metadata: {
      action: "CANCEL_AT_PERIOD_END",
      cancelDate: updated.cancelledAt,
    },
  });

  return updated;
}
