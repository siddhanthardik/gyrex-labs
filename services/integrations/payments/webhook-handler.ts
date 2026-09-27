/**
 * Gyrex Labs - Razorpay Webhook Event Handlers
 *
 * Implements idempotent processing for webhook events:
 * - Flow A: Patient diagnostic payment events
 * - Flow B: Platform subscription billing events
 */

import { prisma } from "@/lib/db/prisma";
import {
  PaymentStatus,
  OrderStatus,
  SubscriptionStatus,
  AuditAction,
} from "@prisma/client";
import { razorpayProvider } from "./razorpay-provider";
import { decryptSecret } from "@/lib/integrations/crypto";
import { recordAuditLog } from "@/lib/db/audit";

export interface WebhookProcessingResult {
  handled: boolean;
  event: string;
  entityId?: string;
  message: string;
}

/**
 * Handles incoming Patient Diagnostic Webhooks (Flow A).
 */
export async function handlePatientPaymentWebhook(
  rawBody: string,
  signature: string,
  labId?: string
): Promise<WebhookProcessingResult> {
  // Determine webhook secret
  let webhookSecret = process.env.GYREX_RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret";

  if (labId) {
    const paymentSettings = await prisma.labPaymentSettings.findUnique({
      where: { labId },
    });
    if (paymentSettings?.razorpayWebhookSecretEncrypted) {
      try {
        webhookSecret = decryptSecret(paymentSettings.razorpayWebhookSecretEncrypted);
      } catch {
        // Fallback
      }
    }
  }

  const isValid = razorpayProvider.verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "Webhook",
      entityId: "PATIENT_WEBHOOK",
      labId,
      metadata: {
        reason: "Invalid Razorpay webhook signature for patient diagnostic payment",
      },
    });
    throw new Error("Invalid Razorpay webhook signature.");
  }

  const payload = JSON.parse(rawBody);
  const event = payload.event;
  const paymentEntity = payload.payload?.payment?.entity;

  if (!paymentEntity) {
    return { handled: false, event, message: "No payment entity in webhook payload." };
  }

  const gatewayPaymentId = paymentEntity.id;
  const gatewayOrderId = paymentEntity.order_id;

  // Find matching payment record
  const payment = await prisma.patientPayment.findFirst({
    where: {
      OR: [
        { gatewayPaymentId },
        { gatewayOrderId },
      ],
    },
    include: { order: true },
  });

  if (!payment) {
    return { handled: false, event, message: `No matching payment record found for order '${gatewayOrderId}'.` };
  }

  // Idempotent dispatching
  if (event === "payment.captured") {
    if (payment.status === PaymentStatus.PAID) {
      return { handled: true, event, entityId: payment.id, message: "Payment already marked as PAID (idempotent)." };
    }

    await prisma.$transaction([
      prisma.patientPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          gatewayPaymentId,
          paidAt: new Date(),
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: {
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          confirmedAt: new Date(),
        },
      }),
    ]);

    await recordAuditLog({
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: "Order",
      entityId: payment.orderId,
      labId: payment.labId,
      orderId: payment.orderId,
      metadata: {
        action: "WEBHOOK_PAYMENT_CAPTURED",
        gatewayPaymentId,
      },
    });

    return { handled: true, event, entityId: payment.id, message: "Payment successfully captured and order confirmed." };
  }

  if (event === "payment.failed") {
    if (payment.status === PaymentStatus.FAILED) {
      return { handled: true, event, entityId: payment.id, message: "Payment already marked as FAILED (idempotent)." };
    }

    await prisma.patientPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: paymentEntity.error_description || "Payment failed at gateway",
      },
    });

    return { handled: true, event, entityId: payment.id, message: "Payment marked as FAILED." };
  }

  return { handled: false, event, entityId: payment.id, message: `Event '${event}' not explicitly processed.` };
}

/**
 * Handles incoming Gyrex SaaS Subscription Webhooks (Flow B).
 */
export async function handleSubscriptionWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookProcessingResult> {
  const webhookSecret = process.env.GYREX_RAZORPAY_WEBHOOK_SECRET || "dummy_platform_secret";

  const isValid = razorpayProvider.verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "Webhook",
      entityId: "SUBSCRIPTION_WEBHOOK",
      metadata: {
        reason: "Invalid Razorpay webhook signature for platform subscription billing",
      },
    });
    throw new Error("Invalid Razorpay webhook signature for subscription event.");
  }

  const payload = JSON.parse(rawBody);
  const event = payload.event;
  const subEntity = payload.payload?.subscription?.entity;

  if (event === "subscription.charged" && subEntity) {
    const providerSubId = subEntity.id;
    const subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: providerSubId },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(subEntity.current_start * 1000),
          currentPeriodEnd: new Date(subEntity.current_end * 1000),
          gracePeriodEndsAt: null,
        },
      });

      await recordAuditLog({
        action: AuditAction.SUBSCRIPTION_CHANGED,
        entityType: "Subscription",
        entityId: subscription.id,
        labId: subscription.labId,
        metadata: {
          action: "WEBHOOK_SUBSCRIPTION_CHARGED",
          providerSubscriptionId: providerSubId,
        },
      });

      return { handled: true, event, entityId: subscription.id, message: "Subscription renewed and marked active." };
    }
  }

  if (event === "subscription.halted" && subEntity) {
    const subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subEntity.id },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.PAST_DUE,
          // 7-day grace period
          gracePeriodEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return { handled: true, event, entityId: subscription.id, message: "Subscription marked as past due." };
    }
  }

  return { handled: true, event, message: `Subscription event '${event}' acknowledged.` };
}
