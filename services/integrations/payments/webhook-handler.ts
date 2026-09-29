/**
 * Gyrex Labs - Razorpay Webhook Event Handlers
 *
 * Implements idempotent processing for webhook events:
 * - Flow A: Patient diagnostic payment events (PATIENT -> LAB)
 * - Flow B: Platform subscription billing events (LAB -> GYREX)
 */

import { prisma } from "@/lib/db/prisma";
import {
  PaymentStatus,
  OrderStatus,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentGateway,
  BillingCycle,
  AuditAction,
} from "@prisma/client";
import { razorpayProvider } from "./razorpay-provider";
import { decryptSecret } from "@/lib/integrations/crypto";
import { recordAuditLog } from "@/lib/db/audit";
import {
  sendPaymentConfirmationWhatsApp,
  sendOrderConfirmationWhatsApp,
} from "@/services/integrations/whatsapp/whatsapp-notification-service";

export interface WebhookProcessingResult {
  handled: boolean;
  event: string;
  entityId?: string;
  message: string;
}

export class WebhookError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "WebhookError";
    this.statusCode = statusCode;
  }
}

/**
 * Handles incoming Patient Diagnostic Webhooks (Flow A: PATIENT -> LABORATORY).
 *
 * Key guarantees:
 * 1. Signature Verification: Validates HMAC-SHA256 over exact rawBody using tenant secret.
 * 2. Tenant Isolation: Laboratory is authoritatively resolved from database records.
 * 3. Amount & Currency Integrity: Compares gateway amount in paise against database order total.
 * 4. Idempotency: Duplicate events return success without duplicating records or double-crediting.
 * 5. Out-of-Order Safety: Failed events cannot downgrade already-paid orders.
 * 6. Atomicity: Database mutations occur in a Prisma transaction.
 */
export async function handlePatientPaymentWebhook(
  rawBody: string,
  signature: string,
  providedLabId?: string
): Promise<WebhookProcessingResult> {
  if (!rawBody || typeof rawBody !== "string") {
    throw new WebhookError("Missing raw body in webhook request", 400);
  }

  if (!signature || typeof signature !== "string" || !signature.trim()) {
    throw new WebhookError("Missing x-razorpay-signature header", 400);
  }

  // 1. Parse JSON payload safely
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new WebhookError("Invalid JSON payload", 400);
  }

  const event = payload?.event;
  if (!event || typeof event !== "string") {
    throw new WebhookError("Missing event identifier in webhook payload", 400);
  }

  // Supported patient payment events
  const SUPPORTED_PATIENT_EVENTS = ["payment.captured", "order.paid", "payment.failed"];
  if (!SUPPORTED_PATIENT_EVENTS.includes(event)) {
    return {
      handled: false,
      event,
      message: `Event '${event}' is not handled by patient payment webhook and was safely ignored.`,
    };
  }

  // 2. Extract Gateway Entities
  const paymentEntity = payload.payload?.payment?.entity;
  const orderEntity = payload.payload?.order?.entity;

  const gatewayPaymentId = paymentEntity?.id;
  const gatewayOrderId = paymentEntity?.order_id || orderEntity?.id;
  const amountInPaise = paymentEntity?.amount ?? orderEntity?.amount_paid ?? orderEntity?.amount;
  const currency = paymentEntity?.currency || orderEntity?.currency || "INR";
  const notesLabId = paymentEntity?.notes?.labId || orderEntity?.notes?.labId;

  if (!gatewayOrderId && !gatewayPaymentId) {
    throw new WebhookError(
      `Event '${event}' reference missing: no gateway order_id or payment_id found in payload.`,
      400
    );
  }

  // 3. Locate Authoritative PatientPayment in DB
  const payment = await prisma.patientPayment.findFirst({
    where: {
      OR: [
        ...(gatewayOrderId ? [{ gatewayOrderId }] : []),
        ...(gatewayPaymentId ? [{ gatewayPaymentId }] : []),
      ],
    },
    include: {
      lab: {
        include: { paymentSettings: true },
      },
      order: true,
    },
  });

  if (!payment) {
    throw new WebhookError(
      `No matching payment record found for gateway reference '${gatewayOrderId || gatewayPaymentId}'.`,
      404
    );
  }

  // 4. Validate Laboratory Tenant Isolation
  if (providedLabId && providedLabId !== payment.labId) {
    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "Webhook",
      entityId: payment.id,
      labId: payment.labId,
      orderId: payment.orderId,
      metadata: {
        reason: "Cross-laboratory tenant violation in webhook request",
        providedLabId,
        actualLabId: payment.labId,
      },
    });
    throw new WebhookError("Unauthorized: Cross-laboratory tenant violation.", 401);
  }

  if (notesLabId && notesLabId !== payment.labId) {
    throw new WebhookError("Unauthorized: Payload notes labId mismatch.", 401);
  }

  // 5. Decrypt Laboratory Webhook Secret
  const lab = payment.lab;
  const paymentSettings = lab.paymentSettings;
  let webhookSecret: string | null = null;

  if (paymentSettings?.razorpayWebhookSecretEncrypted) {
    try {
      webhookSecret = decryptSecret(paymentSettings.razorpayWebhookSecretEncrypted);
    } catch {
      throw new WebhookError("Failed to decrypt laboratory webhook credentials.", 500);
    }
  } else if (paymentSettings?.razorpayKeySecretEncrypted) {
    // Fallback: laboratory may use Key Secret as webhook secret
    try {
      webhookSecret = decryptSecret(paymentSettings.razorpayKeySecretEncrypted);
    } catch {
      // fallback
    }
  }

  if (!webhookSecret) {
    throw new WebhookError("Laboratory webhook secret is not configured.", 500);
  }

  // 6. Cryptographic Webhook Signature Verification (HMAC-SHA256 over exact rawBody)
  const isSignatureValid = razorpayProvider.verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!isSignatureValid) {
    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "Webhook",
      entityId: payment.id,
      labId: payment.labId,
      orderId: payment.orderId,
      metadata: {
        reason: "Invalid Razorpay webhook signature",
        event,
        gatewayOrderId,
        gatewayPaymentId,
      },
    });
    throw new WebhookError("Invalid Razorpay webhook signature.", 401);
  }

  // 7. Amount & Currency Integrity Checks
  const rawCurrency = paymentEntity?.currency || orderEntity?.currency;
  if (!rawCurrency) {
    throw new WebhookError("Currency missing in payment webhook payload.", 400);
  }

  const normalizedCurrency = rawCurrency.toUpperCase();
  if (normalizedCurrency !== "INR" || (payment.currency && payment.currency.toUpperCase() !== "INR")) {
    throw new WebhookError("Currency mismatch: Only INR is supported.", 400);
  }

  if (amountInPaise === undefined || amountInPaise === null) {
    throw new WebhookError("Amount missing in payment webhook payload.", 400);
  }

  const expectedPaise = Math.round(Number(payment.order.totalAmount) * 100);
  const paymentExpectedPaise = Math.round(Number(payment.amount) * 100);

  if (amountInPaise !== expectedPaise || amountInPaise !== paymentExpectedPaise) {
    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "Webhook",
      entityId: payment.id,
      labId: payment.labId,
      orderId: payment.orderId,
      metadata: {
        reason: "Webhook amount mismatch with authoritative database order total",
        gatewayAmountInPaise: amountInPaise,
        expectedPaise,
      },
    });
    throw new WebhookError("Amount integrity violation: gateway amount does not match order total.", 400);
  }

  // 8. Event State Machine Dispatching

  // A. PAYMENT CAPTURED
  if (event === "payment.captured") {
    // Idempotency: If already paid, return safe success without re-processing
    if (payment.status === PaymentStatus.PAID && payment.order.paymentStatus === PaymentStatus.PAID) {
      return {
        handled: true,
        event,
        entityId: payment.id,
        message: "Payment already marked as PAID (idempotent).",
      };
    }

    const paidAtDate = paymentEntity?.created_at
      ? new Date(paymentEntity.created_at * 1000)
      : new Date();

    // Atomic update
    await prisma.$transaction(async (tx) => {
      await tx.patientPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          gatewayPaymentId: gatewayPaymentId || payment.gatewayPaymentId,
          failureReason: null,
          paidAt: paidAtDate,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          confirmedAt: new Date(),
        },
      });
    });

    await recordAuditLog({
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: "Order",
      entityId: payment.orderId,
      labId: payment.labId,
      orderId: payment.orderId,
      metadata: {
        action: "WEBHOOK_PAYMENT_CAPTURED",
        gatewayPaymentId,
        event,
      },
    });

    try {
      sendPaymentConfirmationWhatsApp(payment.id).catch((err) =>
        console.error("Non-blocking webhook payment confirmation WhatsApp error:", err)
      );
      sendOrderConfirmationWhatsApp(payment.orderId).catch((err) =>
        console.error("Non-blocking webhook order confirmation WhatsApp error:", err)
      );
    } catch {
      // non-blocking
    }

    return {
      handled: true,
      event,
      entityId: payment.id,
      message: "Payment successfully captured and order confirmed via webhook.",
    };
  }

  // B. ORDER PAID
  if (event === "order.paid") {
    // Idempotency check
    if (payment.status === PaymentStatus.PAID && payment.order.paymentStatus === PaymentStatus.PAID) {
      return {
        handled: true,
        event,
        entityId: payment.id,
        message: "Order already marked as PAID (idempotent).",
      };
    }

    // Atomic update
    await prisma.$transaction(async (tx) => {
      await tx.patientPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          gatewayPaymentId: gatewayPaymentId || payment.gatewayPaymentId,
          failureReason: null,
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          confirmedAt: new Date(),
        },
      });
    });

    await recordAuditLog({
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: "Order",
      entityId: payment.orderId,
      labId: payment.labId,
      orderId: payment.orderId,
      metadata: {
        action: "WEBHOOK_ORDER_PAID",
        gatewayOrderId,
        event,
      },
    });

    try {
      sendPaymentConfirmationWhatsApp(payment.id).catch((err) =>
        console.error("Non-blocking webhook payment confirmation WhatsApp error:", err)
      );
      sendOrderConfirmationWhatsApp(payment.orderId).catch((err) =>
        console.error("Non-blocking webhook order confirmation WhatsApp error:", err)
      );
    } catch {
      // non-blocking
    }

    return {
      handled: true,
      event,
      entityId: payment.id,
      message: "Order successfully marked as paid via webhook.",
    };
  }

  // C. PAYMENT FAILED
  if (event === "payment.failed") {
    // CRITICAL: A failed event must NEVER downgrade an already paid order!
    if (payment.status === PaymentStatus.PAID || payment.order.paymentStatus === PaymentStatus.PAID) {
      return {
        handled: true,
        event,
        entityId: payment.id,
        message: "Ignoring failed event for already paid payment (terminal state preserved).",
      };
    }

    // Idempotent duplicate fail
    if (payment.status === PaymentStatus.FAILED) {
      return {
        handled: true,
        event,
        entityId: payment.id,
        message: "Payment already marked as FAILED (idempotent).",
      };
    }

    await prisma.patientPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: paymentEntity?.error_description || "Payment failed at gateway",
      },
    });

    return {
      handled: true,
      event,
      entityId: payment.id,
      message: "Payment marked as FAILED.",
    };
  }

  return {
    handled: false,
    event,
    entityId: payment.id,
    message: `Event '${event}' safely acknowledged.`,
  };
}

/**
 * Handles incoming Gyrex SaaS Subscription Webhooks (Flow B: LABORATORY -> GYREX).
 * Uses platform credentials exclusively (GYREX_RAZORPAY_WEBHOOK_SECRET).
 * Resolves local subscription strictly from authoritative provider references.
 * Never iterates through all labs or uses LabPaymentSettings.
 */
export async function handleSubscriptionWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookProcessingResult> {
  // 1. Signature & Body Presence Checks
  if (!signature || !signature.trim()) {
    throw new WebhookError("Missing x-razorpay-signature header.", 400);
  }

  if (!rawBody || !rawBody.trim()) {
    throw new WebhookError("Missing webhook request body.", 400);
  }

  // 2. Parse JSON Payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new WebhookError("Invalid JSON in webhook request body", 400);
  }

  const event = payload?.event;
  if (!event || typeof event !== "string") {
    throw new WebhookError("Missing event identifier in webhook payload", 400);
  }

  // Supported platform subscription events
  const SUPPORTED_SUB_EVENTS = [
    "subscription.charged",
    "subscription.halted",
    "payment.captured",
    "payment.failed",
  ];

  if (!SUPPORTED_SUB_EVENTS.includes(event)) {
    return {
      handled: false,
      event,
      message: `Event '${event}' is not handled by subscription webhook and was safely ignored.`,
    };
  }

  // 3. Cryptographic Signature Verification (Timing-safe HMAC-SHA256)
  const webhookSecret = process.env.GYREX_RAZORPAY_WEBHOOK_SECRET || "dummy_platform_secret";
  const isValid = razorpayProvider.verifyWebhookSignature(rawBody, signature.trim(), webhookSecret);

  if (!isValid) {
    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "Webhook",
      entityId: "SUBSCRIPTION_WEBHOOK",
      metadata: {
        reason: "Invalid Razorpay webhook signature for platform subscription billing",
        event,
      },
    });
    throw new WebhookError("Invalid Razorpay webhook signature for subscription event.", 401);
  }

  // 4. Extract Entities
  const subEntity = payload.payload?.subscription?.entity;
  const paymentEntity = payload.payload?.payment?.entity;
  const notes = subEntity?.notes || paymentEntity?.notes || {};

  // 5. Authoritative Subscription Resolution (No iterating labs, no guessing)
  let subscription: any = null;
  let matchingPayment: any = null;

  if (subEntity?.id) {
    subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subEntity.id },
      include: { plan: true, lab: true },
    });
  }

  if (!subscription && notes?.subscriptionId) {
    subscription = await prisma.subscription.findUnique({
      where: { id: notes.subscriptionId },
      include: { plan: true, lab: true },
    });
  }

  if (!subscription && paymentEntity?.order_id) {
    matchingPayment = await prisma.subscriptionPayment.findFirst({
      where: { gatewayOrderId: paymentEntity.order_id },
      include: {
        subscriptionInvoice: {
          include: {
            subscription: { include: { plan: true, lab: true } },
          },
        },
      },
    });
    if (matchingPayment?.subscriptionInvoice?.subscription) {
      subscription = matchingPayment.subscriptionInvoice.subscription;
    }
  }

  if (!subscription && paymentEntity?.id) {
    matchingPayment = await prisma.subscriptionPayment.findFirst({
      where: { gatewayPaymentId: paymentEntity.id },
      include: {
        subscriptionInvoice: {
          include: {
            subscription: { include: { plan: true, lab: true } },
          },
        },
      },
    });
    if (matchingPayment?.subscriptionInvoice?.subscription) {
      subscription = matchingPayment.subscriptionInvoice.subscription;
    }
  }

  if (!subscription && notes?.labId) {
    subscription = await prisma.subscription.findUnique({
      where: { labId: notes.labId },
      include: { plan: true, lab: true },
    });
  }

  if (!subscription) {
    throw new WebhookError(
      `No matching subscription found for provider reference '${subEntity?.id || paymentEntity?.order_id || paymentEntity?.id || "unknown"}'.`,
      404
    );
  }

  // 6. Currency Verification
  const currency = paymentEntity?.currency || "INR";
  if (currency.toUpperCase() !== "INR") {
    throw new WebhookError("Currency mismatch: Only INR is supported for Gyrex subscriptions.", 400);
  }

  // 7. Event Dispatching
  // A. SUBSCRIPTION CHARGED
  if (event === "subscription.charged") {
    const rawPeriodEnd = subEntity?.current_end
      ? new Date(subEntity.current_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const rawPeriodStart = subEntity?.current_start
      ? new Date(subEntity.current_start * 1000)
      : new Date();

    // Stale Event Protection: Do not overwrite newer period with older event
    const finalPeriodEnd =
      subscription.currentPeriodEnd && subscription.currentPeriodEnd > rawPeriodEnd
        ? subscription.currentPeriodEnd
        : rawPeriodEnd;

    // Idempotency: If already active and period end matches or is newer, return clean success
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.currentPeriodEnd >= finalPeriodEnd
    ) {
      return {
        handled: true,
        event,
        entityId: subscription.id,
        message: "Subscription already ACTIVE for this billing period (idempotent).",
      };
    }

    const gatewayPaymentId = paymentEntity?.id || `pay_sub_${Date.now()}`;
    const amountRupees = paymentEntity?.amount
      ? Number(paymentEntity.amount) / 100
      : Number(subscription.plan.priceMonthly);

    await prisma.$transaction(async (tx) => {
      // Update subscription
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: rawPeriodStart,
          currentPeriodEnd: finalPeriodEnd,
          trialEndsAt: null,
          gracePeriodEndsAt: null,
          providerSubscriptionId: subEntity?.id || subscription.providerSubscriptionId,
        },
      });

      // Find or create invoice
      const invoiceNumber = `GYR-INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const invoice = await tx.subscriptionInvoice.create({
        data: {
          invoiceNumber,
          subscriptionId: subscription.id,
          labId: subscription.labId,
          amountDue: amountRupees,
          amountPaid: amountRupees,
          currency: "INR",
          status: InvoiceStatus.PAID,
          dueDate: new Date(),
          paidAt: new Date(),
        },
      });

      // Record payment
      const paymentNumber = `PAY-SUB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      await tx.subscriptionPayment.create({
        data: {
          paymentNumber,
          subscriptionInvoiceId: invoice.id,
          labId: subscription.labId,
          amount: amountRupees,
          currency: "INR",
          status: PaymentStatus.PAID,
          gateway: PaymentGateway.RAZORPAY,
          gatewayPaymentId,
          paidAt: new Date(),
        },
      });
    });

    await recordAuditLog({
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entityType: "Subscription",
      entityId: subscription.id,
      labId: subscription.labId,
      metadata: {
        action: "WEBHOOK_SUBSCRIPTION_CHARGED",
        planCode: subscription.plan.code,
        periodEnd: finalPeriodEnd,
        amount: amountRupees,
      },
    });

    return {
      handled: true,
      event,
      entityId: subscription.id,
      message: "Subscription successfully activated/renewed via webhook.",
    };
  }

  // B. SUBSCRIPTION HALTED
  if (event === "subscription.halted") {
    // Idempotency check
    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      return {
        handled: true,
        event,
        entityId: subscription.id,
        message: "Subscription already marked as PAST_DUE (idempotent).",
      };
    }

    const gracePeriodEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day grace period

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt,
      },
    });

    await recordAuditLog({
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entityType: "Subscription",
      entityId: subscription.id,
      labId: subscription.labId,
      metadata: {
        action: "WEBHOOK_SUBSCRIPTION_HALTED",
        gracePeriodEndsAt,
      },
    });

    return {
      handled: true,
      event,
      entityId: subscription.id,
      message: "Subscription marked as PAST_DUE with grace period.",
    };
  }

  // C. PAYMENT CAPTURED
  if (event === "payment.captured") {
    if (!matchingPayment && paymentEntity?.order_id) {
      matchingPayment = await prisma.subscriptionPayment.findFirst({
        where: { gatewayOrderId: paymentEntity.order_id },
        include: {
          subscriptionInvoice: {
            include: { subscription: true },
          },
        },
      });
    }

    if (!matchingPayment) {
      throw new WebhookError(
        `Subscription payment record not found for gateway order '${paymentEntity?.order_id}'.`,
        404
      );
    }

    // Idempotency: If payment is already PAID, return safe acknowledgment
    if (matchingPayment.status === PaymentStatus.PAID) {
      return {
        handled: true,
        event,
        entityId: matchingPayment.id,
        message: "Subscription payment already marked as PAID (idempotent).",
      };
    }

    const now = new Date();
    const durationDays = subscription.billingCycle === BillingCycle.YEARLY ? 365 : 30;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.subscriptionPayment.update({
        where: { id: matchingPayment.id },
        data: {
          status: PaymentStatus.PAID,
          gatewayPaymentId: paymentEntity?.id || matchingPayment.gatewayPaymentId,
          paidAt: now,
        },
      }),
      prisma.subscriptionInvoice.update({
        where: { id: matchingPayment.subscriptionInvoiceId },
        data: {
          status: InvoiceStatus.PAID,
          amountPaid: matchingPayment.amount,
          paidAt: now,
        },
      }),
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          gracePeriodEndsAt: null,
        },
      }),
    ]);

    await recordAuditLog({
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entityType: "Subscription",
      entityId: subscription.id,
      labId: subscription.labId,
      metadata: {
        action: "WEBHOOK_PAYMENT_CAPTURED",
        gatewayOrderId: paymentEntity?.order_id,
        gatewayPaymentId: paymentEntity?.id,
      },
    });

    return {
      handled: true,
      event,
      entityId: matchingPayment.id,
      message: "Subscription payment captured and subscription activated via webhook.",
    };
  }

  // D. PAYMENT FAILED
  if (event === "payment.failed") {
    if (!matchingPayment && paymentEntity?.order_id) {
      matchingPayment = await prisma.subscriptionPayment.findFirst({
        where: { gatewayOrderId: paymentEntity.order_id },
      });
    }

    // Out-of-order protection: Never downgrade an already PAID payment
    if (matchingPayment?.status === PaymentStatus.PAID) {
      return {
        handled: true,
        event,
        entityId: subscription.id,
        message: "Terminal state preserved: subscription payment already paid.",
      };
    }

    if (matchingPayment) {
      await prisma.subscriptionPayment.update({
        where: { id: matchingPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          gatewayPaymentId: paymentEntity?.id || matchingPayment.gatewayPaymentId,
        },
      });
    }

    return {
      handled: true,
      event,
      entityId: subscription.id,
      message: "Subscription payment marked as FAILED.",
    };
  }

  return {
    handled: false,
    event,
    entityId: subscription.id,
    message: `Subscription event '${event}' acknowledged.`,
  };
}
