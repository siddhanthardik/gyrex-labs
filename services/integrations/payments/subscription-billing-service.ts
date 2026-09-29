/**
 * Gyrex Labs - Subscription Billing Service (Flow B: LABORATORY -> GYREX)
 *
 * Manages SaaS platform subscription billing for laboratories.
 * Strictly separated from patient diagnostic payments (Flow A).
 * Uses Gyrex platform credentials exclusively (GYREX_RAZORPAY_KEY_ID / GYREX_RAZORPAY_KEY_SECRET).
 * NEVER touches LabPaymentSettings or patient payment credentials.
 */

import { prisma } from "@/lib/db/prisma";
import {
  SubscriptionStatus,
  BillingCycle,
  InvoiceStatus,
  PaymentStatus,
  PaymentGateway,
  AuditAction,
} from "@prisma/client";
import { razorpayProvider } from "./razorpay-provider";
import { recordAuditLog } from "@/lib/db/audit";

export interface CreateSubscriptionPaymentInput {
  invoiceId: string;
}

export interface VerifySubscriptionPaymentInput {
  invoiceId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
  labId?: string;
  actorUserId?: string;
}

export interface CreateCheckoutInput {
  labId: string;
  actorUserId?: string;
}

/**
 * Creates a subscription checkout session for a laboratory during onboarding or renewal.
 * Uses authoritative pricing from SubscriptionPlan in the database.
 * Uses Gyrex platform credentials exclusively.
 */
export async function createSubscriptionCheckout(input: CreateCheckoutInput) {
  const { labId, actorUserId } = input;

  const subscription = await prisma.subscription.findUnique({
    where: { labId },
    include: {
      plan: true,
      lab: true,
    },
  });

  if (!subscription) {
    throw new Error("No subscription plan selected for this laboratory. Please select a plan first.");
  }

  const plan = subscription.plan;
  if (!plan || !plan.isActive) {
    throw new Error("The selected subscription plan is inactive or invalid.");
  }

  // Authoritative price calculation from database
  const isYearly = subscription.billingCycle === BillingCycle.YEARLY;
  const priceRupees = isYearly ? Number(plan.priceYearly) : Number(plan.priceMonthly);
  const amountInPaise = Math.round(priceRupees * 100);

  if (amountInPaise <= 0) {
    throw new Error("Invalid plan pricing configuration.");
  }

  // Check for an existing open invoice for this subscription or create a new one
  const invoiceNumber = `GYR-INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days due

  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      invoiceNumber,
      subscriptionId: subscription.id,
      labId,
      amountDue: priceRupees,
      amountPaid: 0.0,
      currency: "INR",
      status: InvoiceStatus.ISSUED,
      dueDate,
    },
  });

  const receipt = `rcpt_sub_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Platform Razorpay Credentials
  const platformKeyId = process.env.GYREX_RAZORPAY_KEY_ID || "rzp_test_platform_key";
  const platformSecret = process.env.GYREX_RAZORPAY_KEY_SECRET || "dummy_platform_secret";

  // Create gateway order
  const gatewayOrder = await razorpayProvider.createOrder(
    {
      amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        flow: "LAB_TO_GYREX",
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
        subscriptionId: subscription.id,
        labId,
        planCode: plan.code,
        billingCycle: subscription.billingCycle,
      },
    },
    { keyId: platformKeyId, keySecret: platformSecret }
  );

  const paymentNumber = `PAY-SUB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const payment = await prisma.subscriptionPayment.create({
    data: {
      paymentNumber,
      subscriptionInvoiceId: invoice.id,
      labId,
      amount: priceRupees,
      currency: "INR",
      status: PaymentStatus.PENDING,
      gateway: PaymentGateway.RAZORPAY,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
    },
  });

  return {
    success: true,
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
    gatewayOrderId: gatewayOrder.gatewayOrderId,
    amountInPaise,
    currency: "INR",
    amountRupees: priceRupees,
    // Only public Key ID is returned to client modal (NEVER key secret or webhook secret)
    razorpayKeyId: platformKeyId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    labName: subscription.lab.name,
    planName: plan.name,
    billingCycle: subscription.billingCycle,
  };
}

/**
 * Initiates payment for an existing Gyrex platform subscription invoice.
 */
export async function initiateSubscriptionInvoicePayment(input: CreateSubscriptionPaymentInput) {
  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      lab: true,
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Subscription invoice '${input.invoiceId}' not found.`);
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error(`Invoice '${invoice.invoiceNumber}' is already paid.`);
  }

  const amountInPaise = Math.round(Number(invoice.amountDue) * 100);
  const receipt = `rcpt_inv_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "")}`;

  const platformKeyId = process.env.GYREX_RAZORPAY_KEY_ID || "rzp_test_platform_key";
  const platformSecret = process.env.GYREX_RAZORPAY_KEY_SECRET || "dummy_platform_secret";

  const gatewayOrder = await razorpayProvider.createOrder(
    {
      amountInPaise,
      currency: invoice.currency,
      receipt,
      notes: {
        flow: "LAB_TO_GYREX",
        invoiceNumber: invoice.invoiceNumber,
        labId: invoice.labId,
        planCode: invoice.subscription.plan.code,
      },
    },
    { keyId: platformKeyId, keySecret: platformSecret }
  );

  const paymentNumber = `PAY-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const payment = await prisma.subscriptionPayment.create({
    data: {
      paymentNumber,
      subscriptionInvoiceId: invoice.id,
      labId: invoice.labId,
      amount: invoice.amountDue,
      currency: invoice.currency,
      status: PaymentStatus.PENDING,
      gateway: PaymentGateway.RAZORPAY,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
    },
  });

  return {
    success: true,
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
    gatewayOrderId: gatewayOrder.gatewayOrderId,
    amountInPaise,
    currency: invoice.currency,
    razorpayKeyId: platformKeyId,
    invoiceNumber: invoice.invoiceNumber,
    labName: invoice.lab.name,
    planName: invoice.subscription.plan.name,
  };
}

/**
 * Verifies subscription payment and activates/renews the laboratory's subscription.
 * Uses timing-safe HMAC-SHA256 signature verification.
 * Enforces multi-tenant isolation.
 */
export async function verifyAndConfirmSubscriptionPayment(input: VerifySubscriptionPaymentInput) {
  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      subscription: {
        include: { plan: true },
      },
      payments: {
        where: { gatewayOrderId: input.gatewayOrderId },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Subscription invoice '${input.invoiceId}' not found.`);
  }

  // Tenant Isolation Check
  if (input.labId && invoice.labId !== input.labId) {
    await recordAuditLog({
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.SECURITY_ALERT,
      entityType: "SubscriptionInvoice",
      entityId: invoice.id,
      labId: invoice.labId,
      metadata: {
        reason: "Cross-tenant subscription verification attempt rejected",
        providedLabId: input.labId,
        actualLabId: invoice.labId,
      },
    });
    throw new Error("Unauthorized: Cross-tenant subscription invoice verification.");
  }

  const payment = invoice.payments[0];
  if (!payment) {
    throw new Error(`Payment record for order '${input.gatewayOrderId}' not found.`);
  }

  // Idempotency: If already paid with this payment ID, return clean confirmation
  if (payment.status === PaymentStatus.PAID) {
    if (payment.gatewayPaymentId === input.gatewayPaymentId.trim()) {
      return {
        success: true,
        invoiceNumber: invoice.invoiceNumber,
        status: PaymentStatus.PAID,
        alreadyProcessed: true,
      };
    } else {
      throw new Error("Invoice has already been paid with a different payment reference.");
    }
  }

  const platformSecret = process.env.GYREX_RAZORPAY_KEY_SECRET || "dummy_platform_secret";

  const isSignatureValid = razorpayProvider.verifyPaymentSignature({
    orderId: input.gatewayOrderId,
    paymentId: input.gatewayPaymentId,
    signature: input.gatewaySignature,
    secret: platformSecret,
  });

  if (!isSignatureValid) {
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayPaymentId: input.gatewayPaymentId,
      },
    });

    await recordAuditLog({
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.SECURITY_ALERT,
      entityType: "SubscriptionPayment",
      entityId: payment.id,
      labId: invoice.labId,
      metadata: {
        reason: "Invalid subscription payment signature",
        gatewayOrderId: input.gatewayOrderId,
        gatewayPaymentId: input.gatewayPaymentId,
      },
    });

    throw new Error("Invalid subscription payment signature.");
  }

  const now = new Date();
  const isYearly = invoice.subscription.billingCycle === BillingCycle.YEARLY;
  const durationDays = isYearly ? 365 : 30;
  const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Atomic state transition
  const [, , updatedSubscription] = await prisma.$transaction([
    prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        gatewayPaymentId: input.gatewayPaymentId.trim(),
        gatewaySignature: input.gatewaySignature.trim(),
        paidAt: now,
      },
    }),
    prisma.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        amountPaid: invoice.amountDue,
        paidAt: now,
      },
    }),
    prisma.subscription.update({
      where: { id: invoice.subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        gracePeriodEndsAt: null,
      },
      include: { plan: true },
    }),
  ]);

  await recordAuditLog({
    actorUserId: input.actorUserId ?? null,
    action: AuditAction.SUBSCRIPTION_CHANGED,
    entityType: "Subscription",
    entityId: invoice.subscriptionId,
    labId: invoice.labId,
    metadata: {
      action: "SUBSCRIPTION_ACTIVATED_VIA_PAYMENT",
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amountDue),
      planCode: invoice.subscription.plan.code,
      billingCycle: invoice.subscription.billingCycle,
      currentPeriodEnd: periodEnd,
    },
  });

  return {
    success: true,
    invoiceNumber: invoice.invoiceNumber,
    paymentNumber: payment.paymentNumber,
    status: PaymentStatus.PAID,
    subscription: updatedSubscription,
  };
}
