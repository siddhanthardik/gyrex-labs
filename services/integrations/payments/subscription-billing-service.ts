/**
 * Gyrex Labs - Subscription Billing Service (Flow B: LABORATORY -> GYREX)
 *
 * Manages SaaS platform subscription billing for laboratories.
 * Strictly separated from patient diagnostic payments.
 */

import { prisma } from "@/lib/db/prisma";
import {
  SubscriptionStatus,
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
}

/**
 * Initiates payment for a Gyrex platform subscription invoice.
 * Uses Gyrex's platform Razorpay credentials.
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

  // Uses Gyrex platform credentials exclusively
  const gatewayOrder = await razorpayProvider.createOrder({
    amountInPaise,
    currency: invoice.currency,
    receipt,
    notes: {
      flow: "LAB_TO_GYREX",
      invoiceNumber: invoice.invoiceNumber,
      labId: invoice.labId,
      planCode: invoice.subscription.plan.code,
    },
  });

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
    // Only Platform Key ID is exposed to client modal (NEVER secret)
    razorpayKeyId: process.env.GYREX_RAZORPAY_KEY_ID || "rzp_test_platform_key",
    invoiceNumber: invoice.invoiceNumber,
    labName: invoice.lab.name,
    planName: invoice.subscription.plan.name,
  };
}

/**
 * Verifies subscription payment and activates/renews the laboratory's subscription.
 */
export async function verifyAndConfirmSubscriptionPayment(input: VerifySubscriptionPaymentInput) {
  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      subscription: true,
      payments: {
        where: { gatewayOrderId: input.gatewayOrderId },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Subscription invoice '${input.invoiceId}' not found.`);
  }

  const payment = invoice.payments[0];
  if (!payment) {
    throw new Error(`Payment record for order '${input.gatewayOrderId}' not found.`);
  }

  // Idempotency
  if (payment.status === PaymentStatus.PAID) {
    return {
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      status: PaymentStatus.PAID,
    };
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
      data: { status: PaymentStatus.FAILED },
    });

    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "SubscriptionPayment",
      entityId: payment.id,
      labId: invoice.labId,
      metadata: {
        reason: "Invalid subscription payment signature",
        gatewayOrderId: input.gatewayOrderId,
      },
    });

    throw new Error("Invalid subscription payment signature.");
  }

  // Update payment and invoice
  await prisma.$transaction([
    prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        gatewayPaymentId: input.gatewayPaymentId,
        gatewaySignature: input.gatewaySignature,
        paidAt: new Date(),
      },
    }),
    prisma.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        amountPaid: invoice.amountDue,
        paidAt: new Date(),
      },
    }),
    prisma.subscription.update({
      where: { id: invoice.subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        gracePeriodEndsAt: null,
      },
    }),
  ]);

  await recordAuditLog({
    action: AuditAction.SUBSCRIPTION_CHANGED,
    entityType: "Subscription",
    entityId: invoice.subscriptionId,
    labId: invoice.labId,
    metadata: {
      action: "INVOICE_PAID",
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amountDue),
    },
  });

  return {
    success: true,
    invoiceNumber: invoice.invoiceNumber,
    paymentNumber: payment.paymentNumber,
    status: PaymentStatus.PAID,
  };
}
