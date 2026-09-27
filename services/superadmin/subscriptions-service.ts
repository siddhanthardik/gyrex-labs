import { prisma } from "@/lib/db/prisma";
import { SubscriptionStatus, InvoiceStatus, AuditAction, Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";

export async function getSubscriptionOverview() {
  const [
    activeSubsCount,
    trialingCount,
    pastDueCount,
    cancelledCount,
    activeSubs,
  ] = await Promise.all([
    prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    prisma.subscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
    prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
    prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
    prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    }),
  ]);

  const monthlyRecurringRevenue = activeSubs.reduce((acc, sub) => {
    return acc + Number(sub.plan.priceMonthly);
  }, 0);

  const annualRunRate = monthlyRecurringRevenue * 12;

  return {
    metrics: {
      monthlyRecurringRevenue,
      annualRunRate,
      activeSubsCount,
      trialingCount,
      pastDueCount,
      cancelledCount,
      totalTracked: activeSubsCount + trialingCount + pastDueCount + cancelledCount,
    },
  };
}

export async function getSubscriptionPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
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
    subscriberCount: p._count.subscriptions,
  }));
}

export async function updateSubscriptionPlan(
  planId: string,
  data: {
    name?: string;
    description?: string;
    priceMonthly?: number;
    priceYearly?: number;
    maxOrdersPerMonth?: number | null;
    maxStaffAccounts?: number;
    customBrandingEnabled?: boolean;
    geminiPrescriptionAiEnabled?: boolean;
    isActive?: boolean;
  },
  actor: SessionUser
) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!existing) {
    throw new Error(`SubscriptionPlan '${planId}' not found`);
  }

  const updated = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priceMonthly !== undefined && { priceMonthly: data.priceMonthly }),
      ...(data.priceYearly !== undefined && { priceYearly: data.priceYearly }),
      ...(data.maxOrdersPerMonth !== undefined && { maxOrdersPerMonth: data.maxOrdersPerMonth }),
      ...(data.maxStaffAccounts !== undefined && { maxStaffAccounts: data.maxStaffAccounts }),
      ...(data.customBrandingEnabled !== undefined && { customBrandingEnabled: data.customBrandingEnabled }),
      ...(data.geminiPrescriptionAiEnabled !== undefined && { geminiPrescriptionAiEnabled: data.geminiPrescriptionAiEnabled }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.SUBSCRIPTION_CHANGED,
    entityType: "SubscriptionPlan",
    entityId: planId,
    metadata: {
      action: "UPDATE_PLAN",
      changes: data,
    },
  });

  return updated;
}

export async function getActiveSubscriptions(filters: {
  status?: SubscriptionStatus;
  planId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SubscriptionWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.planId) {
    where.planId = filters.planId;
  }

  if (filters.search) {
    where.lab = {
      name: { contains: filters.search, mode: "insensitive" },
    };
  }

  const [total, subs] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lab: { select: { id: true, name: true, slug: true, city: true, phone: true } },
        plan: true,
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    subscriptions: subs.map((s) => ({
      id: s.id,
      labId: s.lab.id,
      labName: s.lab.name,
      labSlug: s.lab.slug,
      labCity: s.lab.city,
      planName: s.plan.name,
      planCode: s.plan.code,
      status: s.status,
      billingCycle: s.billingCycle,
      priceMonthly: Number(s.plan.priceMonthly),
      currentPeriodStart: s.currentPeriodStart.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      trialEndsAt: s.trialEndsAt?.toISOString() || null,
      gracePeriodEndsAt: s.gracePeriodEndsAt?.toISOString() || null,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    })),
  };
}

export async function getFailedPayments() {
  const invoices = await prisma.subscriptionInvoice.findMany({
    where: {
      status: { in: [InvoiceStatus.UNCOLLECTIBLE, InvoiceStatus.VOID] },
    },
    include: {
      lab: { select: { id: true, name: true, slug: true, email: true, phone: true } },
      subscription: { include: { plan: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    labId: inv.lab.id,
    labName: inv.lab.name,
    labEmail: inv.lab.email,
    labPhone: inv.lab.phone,
    planName: inv.subscription.plan.name,
    amountDue: Number(inv.amountDue),
    currency: inv.currency,
    status: inv.status,
    dueDate: inv.dueDate.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));
}

export async function getSubscriptionInvoices(filters: {
  search?: string;
  status?: InvoiceStatus;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SubscriptionInvoiceWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
      { lab: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [total, invoices] = await Promise.all([
    prisma.subscriptionInvoice.count({ where }),
    prisma.subscriptionInvoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lab: { select: { id: true, name: true, slug: true } },
        subscription: { include: { plan: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      labId: inv.lab.id,
      labName: inv.lab.name,
      planName: inv.subscription.plan.name,
      amountDue: Number(inv.amountDue),
      amountPaid: Number(inv.amountPaid),
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() || null,
      createdAt: inv.createdAt.toISOString(),
    })),
  };
}
