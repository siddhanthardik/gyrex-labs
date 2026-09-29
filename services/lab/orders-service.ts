import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { OrderStatus, PaymentStatus, CollectionType, AuditAction } from "@prisma/client";
import {
  sendOrderConfirmationWhatsApp,
  sendSampleCollectedWhatsApp,
} from "@/services/integrations/whatsapp/whatsapp-notification-service";

export interface OrderFilter {
  search?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  collectionType?: CollectionType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Valid state transitions for the diagnostic order workflow.
 * STRICT ENFORCEMENT: Never allow jumping to an invalid state.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.COLLECTION_SCHEDULED, OrderStatus.SAMPLE_COLLECTED, OrderStatus.CANCELLED],
  COLLECTION_SCHEDULED: [OrderStatus.SAMPLE_COLLECTED, OrderStatus.CANCELLED],
  SAMPLE_COLLECTED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.REPORT_READY, OrderStatus.CANCELLED],
  REPORT_READY: [OrderStatus.COMPLETED],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Lists orders belonging strictly to the specified laboratory.
 */
export async function getLabOrders(labId: string, filter?: OrderFilter) {
  const where: any = {
    labId, // Strict tenant filter
  };

  if (filter?.orderStatus) {
    where.orderStatus = filter.orderStatus;
  }

  if (filter?.paymentStatus) {
    where.paymentStatus = filter.paymentStatus;
  }

  if (filter?.collectionType) {
    where.collectionType = filter.collectionType;
  }

  if (filter?.startDate || filter?.endDate) {
    where.createdAt = {};
    if (filter?.startDate) where.createdAt.gte = filter.startDate;
    if (filter?.endDate) where.createdAt.lte = filter.endDate;
  }

  if (filter?.search) {
    const term = filter.search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { patient: { fullName: { contains: term, mode: "insensitive" } } },
      { patient: { phone: { contains: term } } },
    ];
  }

  const page = Math.max(1, filter?.page ?? 1);
  const limit = Math.min(50, Math.max(1, filter?.limit ?? 20));
  const skip = (page - 1) * limit;

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        patient: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            gender: true,
            ageYears: true,
          },
        },
        items: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            itemType: true,
          },
        },
        collection: {
          select: {
            scheduledDate: true,
            scheduledSlot: true,
            phlebotomistName: true,
            sampleCollectedAt: true,
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      collectionType: o.collectionType,
      subtotal: Number(o.subtotal),
      collectionFee: Number(o.collectionFee),
      discountAmount: Number(o.discountAmount),
      totalAmount: Number(o.totalAmount),
      patientName: o.patient.fullName,
      patientPhone: o.patient.phone,
      itemCount: o.items.length,
      tests: o.items.map((i) => i.itemName),
      collection: o.collection
        ? {
            scheduledDate: o.collection.scheduledDate,
            scheduledSlot: o.collection.scheduledSlot,
            phlebotomistName: o.collection.phlebotomistName,
            sampleCollectedAt: o.collection.sampleCollectedAt,
          }
        : null,
      reportsCount: o.reports.length,
      hasReadyReport: o.reports.some((r) => r.status === "FINAL" || r.status === "AMENDED"),
    })),
  };
}

/**
 * Retrieves full order details with tenant verification.
 */
export async function getLabOrderDetail(labId: string, orderNumberOrId: string) {
  const order = await prisma.order.findFirst({
    where: {
      labId, // Strict tenant verification
      OR: [{ id: orderNumberOrId }, { orderNumber: orderNumberOrId }],
    },
    include: {
      patient: true,
      items: true,
      collection: true,
      payments: true,
      reports: {
        include: {
          fileAsset: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
      prescription: {
        include: {
          fileAsset: true,
          extractedItems: true,
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found or access denied.");
  }

  // Construct operational timeline
  const timeline = [
    {
      title: "Order Placed",
      timestamp: order.createdAt,
      completed: true,
      description: `Order ${order.orderNumber} initiated by patient`,
    },
  ];

  if (order.confirmedAt) {
    timeline.push({
      title: "Order Confirmed",
      timestamp: order.confirmedAt,
      completed: true,
      description: "Booking confirmed by laboratory",
    });
  }

  if (order.collection?.sampleCollectedAt) {
    timeline.push({
      title: "Sample Collected",
      timestamp: order.collection.sampleCollectedAt,
      completed: true,
      description: `Collected by ${order.collection.phlebotomistName || "Phlebotomist"}`,
    });
  }

  if (order.reports.length > 0) {
    timeline.push({
      title: "Report Uploaded",
      timestamp: order.reports[0].uploadedAt,
      completed: true,
      description: `Report ${order.reports[0].reportNumber} generated`,
    });
  }

  if (order.completedAt) {
    timeline.push({
      title: "Order Completed",
      timestamp: order.completedAt,
      completed: true,
      description: "Diagnostic cycle completed",
    });
  }

  if (order.cancelledAt) {
    timeline.push({
      title: "Order Cancelled",
      timestamp: order.cancelledAt,
      completed: true,
      description: order.cancellationReason || "Order cancelled",
    });
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    collectionType: order.collectionType,
    subtotal: Number(order.subtotal),
    collectionFee: Number(order.collectionFee),
    discountAmount: Number(order.discountAmount),
    totalAmount: Number(order.totalAmount),
    cancellationReason: order.cancellationReason,
    allowedNextStatuses: ALLOWED_STATUS_TRANSITIONS[order.orderStatus] || [],
    patient: {
      id: order.patient.id,
      fullName: order.patient.fullName,
      phone: order.patient.phone,
      email: order.patient.email,
      gender: order.patient.gender,
      ageYears: order.patient.ageYears,
    },
    items: order.items.map((i) => ({
      id: i.id,
      itemName: i.itemName,
      itemCode: i.itemCode,
      itemType: i.itemType,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    collection: order.collection
      ? {
          id: order.collection.id,
          scheduledDate: order.collection.scheduledDate,
          scheduledSlot: order.collection.scheduledSlot,
          addressLine1: order.collection.collectionAddressLine1,
          addressLine2: order.collection.collectionAddressLine2,
          landmark: order.collection.landmark,
          city: order.collection.city,
          state: order.collection.state,
          postalCode: order.collection.postalCode,
          phlebotomistName: order.collection.phlebotomistName,
          phlebotomistPhone: order.collection.phlebotomistPhone,
          sampleCollectedAt: order.collection.sampleCollectedAt,
          specialInstructions: order.collection.specialInstructions,
        }
      : null,
    payments: order.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      paidAt: p.paidAt,
      gatewayPaymentId: p.gatewayPaymentId,
    })),
    reports: order.reports.map((r) => ({
      id: r.id,
      reportNumber: r.reportNumber,
      status: r.status,
      uploadedAt: r.uploadedAt,
      releasedAt: r.releasedAt,
      originalFileName: r.fileAsset.originalFileName,
    })),
    timeline,
  };
}

/**
 * Updates order status adhering strictly to the state transition graph.
 * Records audit logs on transition.
 */
export async function updateLabOrderStatus(
  labId: string,
  orderId: string,
  targetStatus: OrderStatus,
  options?: {
    cancellationReason?: string;
    sampleCollectedAt?: Date;
    actorUserId?: string;
  }
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, labId },
    include: { collection: true },
  });

  if (!order) {
    throw new Error("Order not found or access denied.");
  }

  const allowedNext = ALLOWED_STATUS_TRANSITIONS[order.orderStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new Error(
      `Invalid status transition from '${order.orderStatus}' to '${targetStatus}'. Permitted transitions: ${allowedNext.join(", ") || "None (Terminal State)"}.`
    );
  }

  const updateData: any = {
    orderStatus: targetStatus,
  };

  if (targetStatus === OrderStatus.CONFIRMED && !order.confirmedAt) {
    updateData.confirmedAt = new Date();
  }

  if (targetStatus === OrderStatus.COMPLETED) {
    updateData.completedAt = new Date();
  }

  if (targetStatus === OrderStatus.CANCELLED) {
    updateData.cancelledAt = new Date();
    updateData.cancellationReason = options?.cancellationReason || "Cancelled by laboratory admin";
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const res = await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

    if (
      targetStatus === OrderStatus.SAMPLE_COLLECTED &&
      order.collection &&
      !order.collection.sampleCollectedAt
    ) {
      await tx.collection.update({
        where: { id: order.collection.id },
        data: {
          sampleCollectedAt: options?.sampleCollectedAt || new Date(),
        },
      });
    }

    return res;
  });

  await recordAuditLog({
    actorUserId: options?.actorUserId ?? null,
    action: AuditAction.ORDER_STATUS_CHANGED,
    entityType: "Order",
    entityId: order.id,
    labId,
    orderId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      fromStatus: order.orderStatus,
      toStatus: targetStatus,
      reason: options?.cancellationReason,
    },
  });

  if (targetStatus === OrderStatus.SAMPLE_COLLECTED) {
    try {
      sendSampleCollectedWhatsApp(order.id).catch((err) =>
        console.error("Non-blocking sample collected WhatsApp notification error:", err)
      );
    } catch {
      // non-blocking
    }
  }

  if (targetStatus === OrderStatus.CONFIRMED) {
    try {
      sendOrderConfirmationWhatsApp(order.id).catch((err) =>
        console.error("Non-blocking order confirmation WhatsApp notification error:", err)
      );
    } catch {
      // non-blocking
    }
  }

  return updatedOrder;
}
