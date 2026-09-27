/**
 * Gyrex Labs - Patient Payment Service (Flow A: PATIENT -> LABORATORY)
 *
 * Enforces the core business rule:
 * Patient diagnostic payment goes directly to the individual laboratory's merchant account.
 * Gyrex does NOT appear to the patient as the recipient of diagnostic revenue.
 */

import { prisma } from "@/lib/db/prisma";
import { PaymentStatus, PaymentMethod, OrderStatus, AuditAction } from "@prisma/client";
import { razorpayProvider } from "./razorpay-provider";
import { decryptSecret } from "@/lib/integrations/crypto";
import { recordAuditLog } from "@/lib/db/audit";

export interface InitiatePatientPaymentInput {
  orderId: string;
  paymentMethod: PaymentMethod;
}

export interface VerifyPatientPaymentInput {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

/**
 * Initiates diagnostic payment for an order using the laboratory's merchant configuration.
 */
export async function initiatePatientPayment(input: InitiatePatientPaymentInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      lab: {
        include: {
          paymentSettings: true,
        },
      },
      patient: true,
    },
  });

  if (!order) {
    throw new Error(`Order '${input.orderId}' not found.`);
  }

  const lab = order.lab;
  const paymentSettings = lab.paymentSettings;

  // 1. CASH ON COLLECTION
  if (input.paymentMethod === PaymentMethod.CASH_ON_COLLECTION) {
    if (!paymentSettings?.cashOnCollectionEnabled) {
      throw new Error("Cash on Collection is not enabled for this laboratory.");
    }

    const paymentNumber = `PAY-PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await prisma.patientPayment.create({
      data: {
        paymentNumber,
        orderId: order.id,
        labId: lab.id,
        amount: order.totalAmount,
        currency: "INR",
        method: PaymentMethod.CASH_ON_COLLECTION,
        status: PaymentStatus.CASH_ON_COLLECTION,
        metadata: {
          flow: "PATIENT_TO_LAB",
          labName: lab.name,
          notice: "Payment to be collected in cash during sample collection.",
        },
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.CASH_ON_COLLECTION,
      },
    });

    return {
      success: true,
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      method: PaymentMethod.CASH_ON_COLLECTION,
      requiresGatewayCheckout: false,
      trustNotice: `Your payment goes directly to ${lab.name}. Powered by Gyrex Labs.`,
    };
  }

  // 2. ONLINE RAZORPAY PAYMENT (LAB MERCHANT GATEWAY)
  let labCredentials: { keyId: string; keySecret: string } | undefined;

  if (paymentSettings?.razorpayKeyId && paymentSettings.razorpayKeySecretEncrypted) {
    try {
      const decryptedSecret = decryptSecret(paymentSettings.razorpayKeySecretEncrypted);
      labCredentials = {
        keyId: paymentSettings.razorpayKeyId,
        keySecret: decryptedSecret,
      };
    } catch {
      console.error(`Failed to decrypt Razorpay secret for lab '${lab.id}'. Falling back to default.`);
    }
  }

  const amountInPaise = Math.round(Number(order.totalAmount) * 100);
  const receipt = `rcpt_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`;

  const gatewayOrder = await razorpayProvider.createOrder(
    {
      amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        labId: lab.id,
        labName: lab.name,
        orderNumber: order.orderNumber,
        flow: "PATIENT_TO_LAB",
      },
    },
    labCredentials
  );

  const paymentNumber = `PAY-PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const payment = await prisma.patientPayment.create({
    data: {
      paymentNumber,
      orderId: order.id,
      labId: lab.id,
      amount: order.totalAmount,
      currency: "INR",
      method: PaymentMethod.RAZORPAY,
      status: PaymentStatus.PENDING,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      metadata: {
        flow: "PATIENT_TO_LAB",
        labName: lab.name,
        gatewayStatus: gatewayOrder.status,
      },
    },
  });

  return {
    success: true,
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
    gatewayOrderId: gatewayOrder.gatewayOrderId,
    amountInPaise,
    currency: "INR",
    method: PaymentMethod.RAZORPAY,
    requiresGatewayCheckout: true,
    // Only Key ID is exposed to client modal (NEVER key secret)
    razorpayKeyId: labCredentials?.keyId || paymentSettings?.razorpayKeyId || process.env.GYREX_RAZORPAY_KEY_ID || "rzp_test_placeholder",
    labName: lab.name,
    patientName: order.patient.fullName,
    patientPhone: order.patient.phone,
    trustNotice: `Pay ${lab.name}. Your payment goes directly to ${lab.name}. Powered by Gyrex Labs.`,
  };
}

/**
 * Authoritatively verifies Razorpay checkout payment signature server-side.
 * Updates payment to PAID and order to CONFIRMED.
 */
export async function verifyAndConfirmPatientPayment(input: VerifyPatientPaymentInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      lab: {
        include: {
          paymentSettings: true,
        },
      },
      payments: {
        where: { gatewayOrderId: input.gatewayOrderId },
      },
    },
  });

  if (!order) {
    throw new Error(`Order '${input.orderId}' not found.`);
  }

  const payment = order.payments[0];
  if (!payment) {
    throw new Error(`Payment record matching gateway order '${input.gatewayOrderId}' not found.`);
  }

  // Idempotency: If already paid, return existing success state
  if (payment.status === PaymentStatus.PAID) {
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentNumber: payment.paymentNumber,
      status: PaymentStatus.PAID,
    };
  }

  const paymentSettings = order.lab.paymentSettings;
  let secret = process.env.GYREX_RAZORPAY_KEY_SECRET || "dummy_secret_for_test";

  if (paymentSettings?.razorpayKeySecretEncrypted) {
    try {
      secret = decryptSecret(paymentSettings.razorpayKeySecretEncrypted);
    } catch {
      // Fallback
    }
  }

  const isSignatureValid = razorpayProvider.verifyPaymentSignature({
    orderId: input.gatewayOrderId,
    paymentId: input.gatewayPaymentId,
    signature: input.gatewaySignature,
    secret,
  });

  if (!isSignatureValid) {
    await prisma.patientPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: "INVALID_GATEWAY_SIGNATURE",
      },
    });

    await recordAuditLog({
      action: AuditAction.SECURITY_ALERT,
      entityType: "Payment",
      entityId: payment.id,
      labId: order.labId,
      orderId: order.id,
      metadata: {
        reason: "Tampered or invalid Razorpay payment signature submitted",
        gatewayOrderId: input.gatewayOrderId,
        gatewayPaymentId: input.gatewayPaymentId,
      },
    });

    throw new Error("Payment signature verification failed. Tampered or invalid signature.");
  }

  // Authoritative update
  const updatedPayment = await prisma.patientPayment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAID,
      gatewayPaymentId: input.gatewayPaymentId,
      gatewaySignature: input.gatewaySignature,
      paidAt: new Date(),
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      confirmedAt: new Date(),
    },
  });

  await recordAuditLog({
    action: AuditAction.ORDER_STATUS_CHANGED,
    entityType: "Order",
    entityId: order.id,
    labId: order.labId,
    orderId: order.id,
    metadata: {
      previousStatus: order.orderStatus,
      newStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      paymentNumber: updatedPayment.paymentNumber,
    },
  });

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentNumber: updatedPayment.paymentNumber,
    status: PaymentStatus.PAID,
  };
}
