import { prisma } from "@/lib/db/prisma";
import { OrderStatus, PaymentStatus, CollectionType, Prisma } from "@prisma/client";

export interface PlatformOrderFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  labId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  collectionType?: CollectionType;
  startDate?: string;
  endDate?: string;
}

export async function getAllPlatformOrders(filters: PlatformOrderFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.OrderWhereInput = {};

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { patient: { fullName: { contains: filters.search, mode: "insensitive" } } },
      { patient: { phone: { contains: filters.search } } },
    ];
  }

  if (filters.labId) {
    where.labId = filters.labId;
  }

  if (filters.status) {
    where.orderStatus = filters.status;
  }

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters.collectionType) {
    where.collectionType = filters.collectionType;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lab: { select: { id: true, name: true, slug: true, city: true } },
        patient: { select: { id: true, fullName: true, phone: true } },
        items: {
          select: {
            id: true,
            itemName: true,
            itemType: true,
            unitPrice: true,
          },
        },
        reports: {
          select: {
            id: true,
            reportNumber: true,
            status: true,
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
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      labId: o.lab.id,
      labName: o.lab.name,
      labSlug: o.lab.slug,
      labCity: o.lab.city,
      patientName: o.patient.fullName,
      patientPhone: o.patient.phone,
      totalAmount: Number(o.totalAmount),
      status: o.orderStatus,
      paymentStatus: o.paymentStatus,
      collectionType: o.collectionType,
      itemsCount: o.items.length,
      reportsCount: o.reports.length,
      hasReadyReport: o.reports.some((r) => r.status === "FINAL"),
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export async function getPlatformOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      lab: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          phone: true,
          email: true,
        },
      },
      patient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          gender: true,
          ageYears: true,
        },
      },
      items: {
        include: {
          labTest: {
            include: { masterTest: true },
          },
          package: true,
        },
      },
      collection: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      reports: {
        include: {
          fileAsset: {
            select: {
              id: true,
              originalFileName: true,
              mimeType: true,
              fileSizeBytes: true,
            },
          },
        },
      },
      auditLogs: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: {
            select: { fullName: true, role: true },
          },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const primaryPayment = order.payments[0] || null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
    collectionType: order.collectionType,
    subtotalAmount: Number(order.subtotal),
    collectionFee: Number(order.collectionFee),
    discountAmount: Number(order.discountAmount),
    totalAmount: Number(order.totalAmount),
    specialInstructions: order.collection?.specialInstructions || null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    lab: order.lab,
    patient: order.patient,
    collection: order.collection ? {
      scheduledDate: order.collection.scheduledDate.toISOString(),
      timeSlot: order.collection.scheduledSlot,
      addressLine1: order.collection.collectionAddressLine1,
      city: order.collection.city,
      postalCode: order.collection.postalCode,
      phlebotomistName: order.collection.phlebotomistName,
      phlebotomistPhone: order.collection.phlebotomistPhone,
      sampleCollectedAt: order.collection.sampleCollectedAt?.toISOString() || null,
    } : null,
    payment: primaryPayment ? {
      paymentNumber: primaryPayment.paymentNumber,
      amount: Number(primaryPayment.amount),
      method: primaryPayment.method,
      status: primaryPayment.status,
      gatewayPaymentId: primaryPayment.gatewayPaymentId,
      paidAt: primaryPayment.paidAt?.toISOString() || null,
    } : null,
    items: order.items.map((i) => ({
      id: i.id,
      itemName: i.itemName,
      itemType: i.itemType,
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      totalPrice: Number(i.totalPrice),
      testCode: i.itemCode || i.labTest?.masterTest.code || i.package?.code || "N/A",
    })),
    reports: order.reports.map((r) => ({
      id: r.id,
      reportNumber: r.reportNumber,
      status: r.status,
      fileName: r.fileAsset.originalFileName,
      uploadedAt: r.uploadedAt.toISOString(),
      releasedAt: r.releasedAt?.toISOString() || null,
    })),
    auditLogs: order.auditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      actorName: a.actorUser?.fullName || "System",
      createdAt: a.createdAt.toISOString(),
      metadata: a.metadata,
    })),
  };
}
