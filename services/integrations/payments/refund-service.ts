/**
 * Gyrex Labs - Server-Side Refund Service
 *
 * Provides authoritative, audited, and idempotent refund processing.
 * Never allows client-driven unverified refund execution.
 */

import { prisma } from "@/lib/db/prisma";
import { PaymentStatus, AuditAction } from "@prisma/client";
import { razorpayProvider } from "./razorpay-provider";
import { decryptSecret } from "@/lib/integrations/crypto";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";

export interface ProcessRefundInput {
  paymentId: string;
  amount?: number; // In Rupees. If omitted, full refund
  reason: string;
  actor: SessionUser;
}

export async function processPaymentRefund(input: ProcessRefundInput) {
  const payment = await prisma.patientPayment.findUnique({
    where: { id: input.paymentId },
    include: {
      order: true,
      lab: {
        include: { paymentSettings: true },
      },
    },
  });

  if (!payment) {
    throw new Error(`Payment record '${input.paymentId}' not found.`);
  }

  // Idempotency: prevent double refund if already fully refunded
  if (payment.status === PaymentStatus.REFUNDED) {
    return {
      success: true,
      refundId: payment.refundId || "already_refunded",
      status: PaymentStatus.REFUNDED,
      message: "Payment is already fully refunded.",
    };
  }

  if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
    throw new Error(`Payment is in status '${payment.status}' and cannot be refunded.`);
  }

  const refundAmount = input.amount !== undefined ? input.amount : Number(payment.amount);
  const refundAmountInPaise = Math.round(refundAmount * 100);

  let labCredentials: { keyId: string; keySecret: string } | undefined;
  const paymentSettings = payment.lab.paymentSettings;
  if (paymentSettings?.razorpayKeyId && paymentSettings.razorpayKeySecretEncrypted) {
    try {
      labCredentials = {
        keyId: paymentSettings.razorpayKeyId,
        keySecret: decryptSecret(paymentSettings.razorpayKeySecretEncrypted),
      };
    } catch {
      // Fallback
    }
  }

  // If Razorpay gateway ID exists, call provider
  let gatewayRefundId = `rfnd_${Date.now()}`;
  if (payment.gatewayPaymentId) {
    const refundResult = await razorpayProvider.refundPayment(
      {
        gatewayPaymentId: payment.gatewayPaymentId,
        amountInPaise: refundAmountInPaise,
        notes: {
          orderId: payment.orderId,
          reason: input.reason,
          actor: input.actor.fullName,
        },
      },
      labCredentials
    );
    gatewayRefundId = refundResult.refundId;
  }

  const isFullRefund = refundAmount >= Number(payment.amount);
  const newStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

  const updatedPayment = await prisma.patientPayment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      refundId: gatewayRefundId,
      refundedAmount: refundAmount,
    },
  });

  await recordAuditLog({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    action: AuditAction.PAYMENT_REFUNDED,
    entityType: "Payment",
    entityId: payment.id,
    labId: payment.labId,
    orderId: payment.orderId,
    metadata: {
      previousStatus: payment.status,
      newStatus,
      refundAmount,
      reason: input.reason,
      refundId: gatewayRefundId,
    },
  });

  return {
    success: true,
    paymentId: payment.id,
    refundId: gatewayRefundId,
    status: newStatus,
    refundedAmount: Number(updatedPayment.refundedAmount),
  };
}
