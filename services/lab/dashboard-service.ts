import { prisma } from "@/lib/db/prisma";
import { OrderStatus, LabStatus } from "@prisma/client";

export interface LabDashboardMetrics {
  lab: {
    id: string;
    name: string;
    slug: string;
    status: LabStatus;
    isVerified: boolean;
    addressLine1: string;
    postalCode: string;
  };
  metrics: {
    todayOrdersCount: number;
    pendingOrdersCount: number;
    collectionScheduledCount: number;
    reportsPendingCount: number;
    reportsReadyCount: number;
    activeTestsCount: number;
    activePackagesCount: number;
  };
  storeStatus: {
    status: LabStatus;
    isVerified: boolean;
    homeCollectionAvailable: boolean;
    isConfigured: boolean;
  };
  subscriptionStatus: {
    planName: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: Date | null;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    patientName: string;
    patientPhone: string;
    collectionType: string;
    orderStatus: OrderStatus;
    paymentStatus: string;
    totalAmount: number;
    createdAt: Date;
    itemCount: number;
  }>;
}

/**
 * Returns concise operational metrics for the Lab Admin Dashboard.
 * Primary purpose: Operational visibility.
 */
export async function getLabDashboardData(labId: string): Promise<LabDashboardMetrics> {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: {
      storeSettings: true,
      subscription: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!lab) {
    throw new Error("Laboratory not found.");
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Parallel operational queries strictly scoped to this lab tenant
  const [
    todayOrdersCount,
    pendingOrdersCount,
    collectionScheduledCount,
    reportsPendingCount,
    reportsReadyCount,
    activeTestsCount,
    activePackagesCount,
    recentOrdersRaw,
  ] = await Promise.all([
    // Today's orders
    prisma.order.count({
      where: {
        labId,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    // Pending orders (awaiting payment or confirmation)
    prisma.order.count({
      where: {
        labId,
        orderStatus: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED] },
      },
    }),
    // Collection scheduled
    prisma.order.count({
      where: {
        labId,
        orderStatus: OrderStatus.COLLECTION_SCHEDULED,
      },
    }),
    // Reports pending (samples collected or currently processing in LIS)
    prisma.order.count({
      where: {
        labId,
        orderStatus: { in: [OrderStatus.SAMPLE_COLLECTED, OrderStatus.PROCESSING] },
      },
    }),
    // Reports ready
    prisma.order.count({
      where: {
        labId,
        orderStatus: { in: [OrderStatus.REPORT_READY, OrderStatus.COMPLETED] },
      },
    }),
    // Active tests
    prisma.labTest.count({
      where: {
        labId,
        isActive: true,
      },
    }),
    // Active packages
    prisma.package.count({
      where: {
        labId,
        isActive: true,
      },
    }),
    // Recent orders
    prisma.order.findMany({
      where: { labId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        patient: { select: { fullName: true, phone: true } },
        items: { select: { id: true } },
      },
    }),
  ]);

  return {
    lab: {
      id: lab.id,
      name: lab.name,
      slug: lab.slug,
      status: lab.status,
      isVerified: lab.isVerified,
      addressLine1: lab.addressLine1,
      postalCode: lab.postalCode,
    },
    metrics: {
      todayOrdersCount,
      pendingOrdersCount,
      collectionScheduledCount,
      reportsPendingCount,
      reportsReadyCount,
      activeTestsCount,
      activePackagesCount,
    },
    storeStatus: {
      status: lab.status,
      isVerified: lab.isVerified,
      homeCollectionAvailable: lab.storeSettings?.homeCollectionAvailable ?? true,
      isConfigured: !!lab.storeSettings,
    },
    subscriptionStatus: {
      planName: lab.subscription?.plan.name ?? "Growth",
      status: lab.subscription?.status ?? "ACTIVE",
      billingCycle: lab.subscription?.billingCycle ?? "MONTHLY",
      currentPeriodEnd: lab.subscription?.currentPeriodEnd ?? null,
    },
    recentOrders: recentOrdersRaw.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      patientName: o.patient.fullName,
      patientPhone: o.patient.phone,
      collectionType: o.collectionType,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      itemCount: o.items.length,
    })),
  };
}
