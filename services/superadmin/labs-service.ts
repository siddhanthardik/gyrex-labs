import { prisma } from "@/lib/db/prisma";
import { LabStatus, AuditAction, Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";

export interface LabFilters {
  search?: string;
  city?: string;
  state?: string;
  status?: LabStatus;
  isVerified?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getAllLabs(filters: LabFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.LabWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { city: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.city) {
    where.city = { equals: filters.city, mode: "insensitive" };
  }

  if (filters.state) {
    where.state = { equals: filters.state, mode: "insensitive" };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.isVerified !== undefined) {
    where.isVerified = filters.isVerified;
  }

  const [total, labs] = await Promise.all([
    prisma.lab.count({ where }),
    prisma.lab.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            labTests: true,
            packages: true,
            orders: true,
            patients: true,
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    labs: labs.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      code: l.code,
      city: l.city,
      state: l.state,
      phone: l.phone,
      email: l.email,
      status: l.status,
      isVerified: l.isVerified,
      testsCount: l._count.labTests,
      packagesCount: l._count.packages,
      ordersCount: l._count.orders,
      patientsCount: l._count.patients,
      subscriptionPlan: l.subscription?.plan?.name || "None",
      subscriptionStatus: l.subscription?.status || "NO_SUBSCRIPTION",
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function getLabDetail(labId: string) {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: {
      storeSettings: true,
      paymentSettings: true,
      subscription: {
        include: { plan: true },
      },
      users: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
        },
      },
      _count: {
        select: {
          labTests: true,
          packages: true,
          orders: true,
          patients: true,
          reports: true,
        },
      },
    },
  });

  if (!lab) {
    return null;
  }

  // Fetch recent audit logs for this laboratory
  const auditLogs = await prisma.auditLog.findMany({
    where: { labId },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      actorUser: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  // Recent 5 orders for summary
  const recentOrders = await prisma.order.findMany({
    where: { labId },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      patient: { select: { fullName: true } },
    },
  });

  return {
    lab: {
      id: lab.id,
      name: lab.name,
      slug: lab.slug,
      legalName: lab.legalName,
      code: lab.code,
      email: lab.email,
      phone: lab.phone,
      emergencyPhone: lab.emergencyPhone,
      addressLine1: lab.addressLine1,
      addressLine2: lab.addressLine2,
      city: lab.city,
      state: lab.state,
      postalCode: lab.postalCode,
      country: lab.country,
      gstin: lab.gstin,
      pan: lab.pan,
      licenseNumber: lab.licenseNumber,
      nablAccreditationNumber: lab.nablAccreditationNumber,
      status: lab.status,
      isVerified: lab.isVerified,
      verifiedAt: lab.verifiedAt?.toISOString() || null,
      createdAt: lab.createdAt.toISOString(),
      updatedAt: lab.updatedAt.toISOString(),
    },
    storeSettings: lab.storeSettings ? {
      heroHeadline: lab.storeSettings.heroHeadline,
      homeCollectionAvailable: lab.storeSettings.homeCollectionAvailable,
      homeCollectionFee: Number(lab.storeSettings.homeCollectionFee),
      deliveryPromiseNotice: lab.storeSettings.deliveryPromiseNotice,
    } : null,
    paymentSettings: lab.paymentSettings ? {
      isConfigured: lab.paymentSettings.isConfigured,
      cashOnCollectionEnabled: lab.paymentSettings.cashOnCollectionEnabled,
      hasRazorpayKey: !!lab.paymentSettings.razorpayKeyId,
      upiDirectQrUrl: lab.paymentSettings.upiDirectQrUrl,
      lastVerifiedAt: lab.paymentSettings.lastVerifiedAt?.toISOString() || null,
    } : null,
    subscription: lab.subscription ? {
      id: lab.subscription.id,
      planName: lab.subscription.plan.name,
      priceMonthly: Number(lab.subscription.plan.priceMonthly),
      status: lab.subscription.status,
      billingCycle: lab.subscription.billingCycle,
      currentPeriodEnd: lab.subscription.currentPeriodEnd.toISOString(),
    } : null,
    staff: lab.users.map((u) => ({
      id: u.id,
      userId: u.user.id,
      fullName: u.user.fullName,
      email: u.user.email,
      phone: u.user.phone,
      role: u.role,
      isActive: u.isActive,
    })),
    counts: {
      tests: lab._count.labTests,
      packages: lab._count.packages,
      orders: lab._count.orders,
      patients: lab._count.patients,
      reports: lab._count.reports,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      patientName: o.patient.fullName,
      totalAmount: Number(o.totalAmount),
      status: o.orderStatus,
      createdAt: o.createdAt.toISOString(),
    })),
    auditLogs: auditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      actorName: a.actorUser?.fullName || "System",
      createdAt: a.createdAt.toISOString(),
      metadata: a.metadata,
    })),
  };
}

export async function verifyLaboratory(
  labId: string,
  approve: boolean,
  reason: string,
  actor: SessionUser
) {
  const lab = await prisma.lab.findUnique({ where: { id: labId } });
  if (!lab) {
    throw new Error(`Laboratory '${labId}' not found`);
  }

  const updatedLab = await prisma.lab.update({
    where: { id: labId },
    data: {
      isVerified: approve,
      verifiedAt: approve ? new Date() : null,
      status: approve ? LabStatus.ACTIVE : LabStatus.INACTIVE,
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.LAB_APPROVED,
    entityType: "Lab",
    entityId: labId,
    labId: labId,
    metadata: {
      previousStatus: lab.status,
      newStatus: updatedLab.status,
      isVerified: updatedLab.isVerified,
      reason,
      approved: approve,
    },
  });

  return updatedLab;
}

export async function suspendLaboratory(
  labId: string,
  suspend: boolean,
  reason: string,
  actor: SessionUser
) {
  const lab = await prisma.lab.findUnique({ where: { id: labId } });
  if (!lab) {
    throw new Error(`Laboratory '${labId}' not found`);
  }

  const newStatus = suspend ? LabStatus.SUSPENDED : LabStatus.ACTIVE;

  const updatedLab = await prisma.lab.update({
    where: { id: labId },
    data: {
      status: newStatus,
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.LAB_SUSPENDED,
    entityType: "Lab",
    entityId: labId,
    labId: labId,
    metadata: {
      previousStatus: lab.status,
      newStatus: updatedLab.status,
      suspended: suspend,
      reason,
    },
  });

  return updatedLab;
}
