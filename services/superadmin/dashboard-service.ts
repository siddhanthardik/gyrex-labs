import { prisma } from "@/lib/db/prisma";
import { LabStatus, OrderStatus, ReportStatus, SubscriptionStatus, TicketStatus } from "@prisma/client";

export interface SuperadminDashboardMetrics {
  overview: {
    totalLabs: number;
    activeLabs: number;
    pendingVerificationLabs: number;
    suspendedLabs: number;
    ordersToday: number;
    ordersThisMonth: number;
    activeSubscriptions: number;
    trialLabs: number;
    pastDueSubscriptions: number;
    reportsPending: number;
    openTickets: number;
    subscriptionRevenueMonthly: number;
  };
  alerts: {
    pendingLabsCount: number;
    failedPaymentsCount: number;
    suspendedLabsCount: number;
    urgentTicketsCount: number;
  };
  recentLabs: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    status: LabStatus;
    isVerified: boolean;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    labName: string;
    patientName: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
  }>;
}

export async function getSuperadminDashboardData(): Promise<SuperadminDashboardMetrics> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Labs counts by status
  const [
    totalLabs,
    activeLabs,
    pendingVerificationLabs,
    suspendedLabs,
  ] = await Promise.all([
    prisma.lab.count(),
    prisma.lab.count({ where: { status: LabStatus.ACTIVE } }),
    prisma.lab.count({ where: { status: LabStatus.PENDING_VERIFICATION } }),
    prisma.lab.count({ where: { status: LabStatus.SUSPENDED } }),
  ]);

  // Order counts
  const [ordersToday, ordersThisMonth] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  // Subscription counts
  const [
    activeSubscriptions,
    trialLabs,
    pastDueSubscriptions,
    activeSubRows,
  ] = await Promise.all([
    prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    prisma.subscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
    prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
    prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    }),
  ]);

  // Real MRR calculated from active plans
  const subscriptionRevenueMonthly = activeSubRows.reduce((acc, sub) => {
    return acc + Number(sub.plan.priceMonthly || 0);
  }, 0);

  // Reports pending
  const reportsPending = await prisma.report.count({
    where: { status: ReportStatus.DRAFT },
  });

  // Open support tickets
  const openTickets = await prisma.supportTicket.count({
    where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
  });

  const urgentTicketsCount = await prisma.supportTicket.count({
    where: {
      status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
      priority: "URGENT",
    },
  });

  // Invoices failed
  const failedPaymentsCount = await prisma.subscriptionInvoice.count({
    where: { status: "UNCOLLECTIBLE" },
  });

  // Recent labs
  const recentLabsRaw = await prisma.lab.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      status: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Recent orders across platform
  const recentOrdersRaw = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      lab: { select: { name: true } },
      patient: { select: { fullName: true } },
    },
  });

  return {
    overview: {
      totalLabs,
      activeLabs,
      pendingVerificationLabs,
      suspendedLabs,
      ordersToday,
      ordersThisMonth,
      activeSubscriptions,
      trialLabs,
      pastDueSubscriptions,
      reportsPending,
      openTickets,
      subscriptionRevenueMonthly,
    },
    alerts: {
      pendingLabsCount: pendingVerificationLabs,
      failedPaymentsCount,
      suspendedLabsCount: suspendedLabs,
      urgentTicketsCount,
    },
    recentLabs: recentLabsRaw.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      city: l.city,
      status: l.status,
      isVerified: l.isVerified,
      createdAt: l.createdAt.toISOString(),
    })),
    recentOrders: recentOrdersRaw.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      labName: o.lab.name,
      patientName: o.patient.fullName,
      totalAmount: Number(o.totalAmount),
      status: o.orderStatus,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}
