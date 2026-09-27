import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { BillingCycle, AuditAction, SubscriptionStatus } from "@prisma/client";

/**
 * Retrieves the laboratory's Gyrex Labs SaaS subscription & billing details.
 * Lab -> Gyrex (Flow B)
 */
export async function getLabSubscriptionDetails(labId: string) {
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

  // If no subscription exists yet, create default trial
  if (!sub) {
    let growthPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: "PLAN_GROWTH" },
    });

    if (!growthPlan) {
      growthPlan = await prisma.subscriptionPlan.create({
        data: {
          name: "Growth",
          code: "PLAN_GROWTH",
          description: "Ideal for growing independent diagnostic laboratories",
          priceMonthly: 1999,
          priceYearly: 19990,
          maxOrdersPerMonth: 500,
          maxStaffAccounts: 5,
        },
      });
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    sub = await prisma.subscription.create({
      data: {
        labId,
        planId: growthPlan.id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
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

  const price =
    sub.billingCycle === BillingCycle.MONTHLY
      ? Number(sub.plan.priceMonthly)
      : Number(sub.plan.priceYearly);

  return {
    subscription: {
      id: sub.id,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
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
    availablePlans: allPlans.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      priceMonthly: Number(p.priceMonthly),
      priceYearly: Number(p.priceYearly),
      maxOrdersPerMonth: p.maxOrdersPerMonth,
      maxStaffAccounts: p.maxStaffAccounts,
    })),
    platformNotice: {
      title: "Your Gyrex Labs Subscription",
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
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: newPlanCode },
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
