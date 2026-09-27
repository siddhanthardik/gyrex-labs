import { prisma } from "@/lib/db/prisma";
import { PaymentStatus, AuditAction, Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";

/**
 * FLOW A: PATIENT DIAGNOSTIC PAYMENTS (PATIENT -> LAB)
 * The laboratory is the merchant/recipient. Gyrex is NOT the recipient.
 */
export async function getPatientDiagnosticPayments(filters: {
  search?: string;
  labId?: string;
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.PatientPaymentWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.labId) {
    where.labId = filters.labId;
  }

  if (filters.search) {
    where.OR = [
      { paymentNumber: { contains: filters.search, mode: "insensitive" } },
      { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
      { lab: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [total, payments] = await Promise.all([
    prisma.patientPayment.count({ where }),
    prisma.patientPayment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lab: { select: { id: true, name: true, slug: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    flowType: "PATIENT_TO_LAB",
    payments: payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      orderId: p.order.id,
      orderNumber: p.order.orderNumber,
      labId: p.lab.id,
      labName: p.lab.name,
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status,
      gateway: p.gateway,
      gatewayPaymentId: p.gatewayPaymentId,
      refundId: p.refundId,
      refundedAmount: p.refundedAmount ? Number(p.refundedAmount) : null,
      paidAt: p.paidAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

/**
 * FLOW B: GYREX SUBSCRIPTION PAYMENTS (LAB -> GYREX)
 * The laboratory pays Gyrex for platform SaaS services.
 */
export async function getGyrexSubscriptionPayments(filters: {
  search?: string;
  labId?: string;
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SubscriptionPaymentWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.labId) {
    where.labId = filters.labId;
  }

  if (filters.search) {
    where.OR = [
      { paymentNumber: { contains: filters.search, mode: "insensitive" } },
      { lab: { name: { contains: filters.search, mode: "insensitive" } } },
      { subscriptionInvoice: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [total, payments] = await Promise.all([
    prisma.subscriptionPayment.count({ where }),
    prisma.subscriptionPayment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lab: { select: { id: true, name: true, slug: true } },
        subscriptionInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amountDue: true,
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
    flowType: "LAB_TO_GYREX",
    payments: payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      invoiceId: p.subscriptionInvoice.id,
      invoiceNumber: p.subscriptionInvoice.invoiceNumber,
      labId: p.lab.id,
      labName: p.lab.name,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      gateway: p.gateway,
      gatewayPaymentId: p.gatewayPaymentId,
      paidAt: p.paidAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

/**
 * Platform Refund Oversight
 */
export async function getPlatformRefunds(filters: {
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.PatientPaymentWhereInput = {
    OR: [
      { status: PaymentStatus.REFUNDED },
      { refundedAmount: { gt: 0 } },
    ],
  };

  const [total, refunds] = await Promise.all([
    prisma.patientPayment.count({ where }),
    prisma.patientPayment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      include: {
        lab: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    refunds: refunds.map((r) => ({
      id: r.id,
      paymentNumber: r.paymentNumber,
      orderNumber: r.order.orderNumber,
      labName: r.lab.name,
      originalAmount: Number(r.amount),
      refundedAmount: Number(r.refundedAmount || r.amount),
      refundId: r.refundId || `REF-${r.id.slice(-6)}`,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export async function recordManualRefund(
  paymentId: string,
  refundAmount: number,
  reason: string,
  actor: SessionUser
) {
  const payment = await prisma.patientPayment.findUnique({
    where: { id: paymentId },
    include: { lab: true, order: true },
  });

  if (!payment) {
    throw new Error(`Patient payment '${paymentId}' not found`);
  }

  const updated = await prisma.patientPayment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.REFUNDED,
      refundedAmount: refundAmount,
      refundId: `REF-${Date.now().toString().slice(-8)}`,
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.PAYMENT_REFUNDED,
    entityType: "PatientPayment",
    entityId: paymentId,
    labId: payment.labId,
    orderId: payment.orderId,
    metadata: {
      originalAmount: Number(payment.amount),
      refundedAmount: refundAmount,
      reason,
      refundNumber: updated.refundId,
    },
  });

  return updated;
}
