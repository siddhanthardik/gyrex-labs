/**
 * Gyrex Labs - Patient Payment Service (Flow A: PATIENT -> LABORATORY)
 *
 * Enforces the core business rule:
 * Patient diagnostic payment goes directly to the individual laboratory's merchant account.
 * Gyrex does NOT appear to the patient as the recipient of diagnostic revenue.
 */

import { prisma } from "@/lib/db/prisma";
import { PaymentStatus, PaymentMethod, OrderStatus, AuditAction, LabStatus } from "@prisma/client";
import { razorpayProvider } from "./razorpay-provider";
import { decryptSecret } from "@/lib/integrations/crypto";
import { recordAuditLog } from "@/lib/db/audit";
import {
  sendPaymentConfirmationWhatsApp,
  sendOrderConfirmationWhatsApp,
} from "@/services/integrations/whatsapp/whatsapp-notification-service";

export interface InitiatePatientPaymentInput {
  orderId: string;
  paymentMethod?: PaymentMethod;
  verificationPhone?: string;
  clientSuppliedAmount?: number;
  clientSuppliedLabId?: string;
}

export interface VerifyPatientPaymentInput {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
  verificationPhone?: string;
  currency?: string;
  amountInPaise?: number;
}

/**
 * Initiates diagnostic payment for an order using the laboratory's merchant configuration.
 * Authoritative: Calculates amount strictly from database records.
 * Idempotent: If a pending Razorpay order exists for this internal order, it reuses it.
 */
export async function initiatePatientPayment(input: InitiatePatientPaymentInput) {
  if (!input.orderId || typeof input.orderId !== "string" || !input.orderId.trim()) {
    throw new Error("Order ID is required.");
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: input.orderId.trim() },
        { orderNumber: input.orderId.trim() },
      ],
    },
    include: {
      lab: {
        include: {
          paymentSettings: true,
        },
      },
      patient: true,
      items: true,
    },
  });

  if (!order) {
    throw new Error(`Order '${input.orderId}' not found.`);
  }

  // 1. Authorization & Tenant Security Checks
  if (input.clientSuppliedLabId && input.clientSuppliedLabId !== order.labId) {
    throw new Error("Security Violation: Order does not belong to the supplied laboratory ID.");
  }

  if (input.verificationPhone) {
    const cleanVerification = input.verificationPhone.replace(/\D/g, "");
    const cleanPatient = order.patient.phone.replace(/\D/g, "");
    if (!cleanVerification || cleanVerification !== cleanPatient) {
      throw new Error("Unauthorized: Patient phone verification failed.");
    }
  }

  const lab = order.lab;
  if (lab.status !== LabStatus.ACTIVE) {
    throw new Error("Laboratory account is currently inactive.");
  }

  // 2. Payable State Validations
  if (order.orderStatus === OrderStatus.CONFIRMED && order.paymentStatus === PaymentStatus.PAID) {
    throw new Error("Order is already paid and confirmed.");
  }

  if (order.orderStatus === OrderStatus.CANCELLED) {
    throw new Error("Cannot initiate payment for a cancelled order.");
  }

  if (order.orderStatus !== OrderStatus.PENDING_PAYMENT && order.paymentStatus !== PaymentStatus.PENDING) {
    throw new Error("Order is not in a payable state.");
  }

  // 3. Authoritative Amount Calculation
  // Disregard any clientSuppliedAmount; DB total is the sole source of truth
  const totalNum = Number(order.totalAmount);
  if (isNaN(totalNum) || totalNum <= 0) {
    throw new Error("Invalid order total amount.");
  }

  // Double check item consistency (defense in depth)
  if (order.items && order.items.length > 0) {
    const itemsSum = order.items.reduce((acc, it) => acc + Number(it.totalPrice), 0);
    const expectedTotal = itemsSum + Number(order.collectionFee) - Number(order.discountAmount);
    if (Math.abs(expectedTotal - totalNum) > 0.05) {
      throw new Error("Authoritative integrity check failed: Order item total does not match total amount.");
    }
  }

  const amountInPaise = Math.round(totalNum * 100);
  const paymentMethod = input.paymentMethod || PaymentMethod.RAZORPAY;
  const paymentSettings = lab.paymentSettings;

  // 4. CASH ON COLLECTION
  if (paymentMethod === PaymentMethod.CASH_ON_COLLECTION) {
    if (!paymentSettings?.cashOnCollectionEnabled) {
      throw new Error("Cash on Collection is not enabled for this laboratory.");
    }

    const paymentNumber = `PAY-PAT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

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

    try {
      sendOrderConfirmationWhatsApp(order.id).catch((err) =>
        console.error("Non-blocking WhatsApp order confirmation error:", err)
      );
    } catch {
      // non-blocking
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      method: PaymentMethod.CASH_ON_COLLECTION,
      requiresGatewayCheckout: false,
      trustNotice: `Your payment goes directly to ${lab.name}. Powered by Gyrex Labs.`,
    };
  }

  // 5. ONLINE RAZORPAY PAYMENT (LAB MERCHANT GATEWAY)
  if (!paymentSettings?.razorpayKeyId || !paymentSettings.razorpayKeySecretEncrypted) {
    throw new Error("Payment configuration is not available for this laboratory. Razorpay merchant credentials not configured.");
  }

  let decryptedSecret: string;
  try {
    decryptedSecret = decryptSecret(paymentSettings.razorpayKeySecretEncrypted);
  } catch {
    throw new Error("Failed to decrypt laboratory Razorpay credentials.");
  }

  // 6. Idempotency Check: Reuse existing pending gateway order if already created for this order
  const existingPendingPayment = await prisma.patientPayment.findFirst({
    where: {
      orderId: order.id,
      status: PaymentStatus.PENDING,
      gatewayOrderId: { not: null },
      method: PaymentMethod.RAZORPAY,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingPendingPayment && existingPendingPayment.gatewayOrderId) {
    // Verify amount matches authoritative order total
    if (Math.abs(Number(existingPendingPayment.amount) - totalNum) < 0.01) {
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: existingPendingPayment.id,
        paymentNumber: existingPendingPayment.paymentNumber,
        gatewayOrderId: existingPendingPayment.gatewayOrderId,
        amountInPaise,
        currency: existingPendingPayment.currency || "INR",
        method: PaymentMethod.RAZORPAY,
        requiresGatewayCheckout: true,
        razorpayKeyId: paymentSettings.razorpayKeyId,
        labName: lab.name,
        patientName: order.patient.fullName,
        patientPhone: order.patient.phone,
        reusedExistingOrder: true,
        trustNotice: `Pay ${lab.name}. Your payment goes directly to ${lab.name}. Powered by Gyrex Labs.`,
      };
    }
  }

  // 7. Create Gateway Order
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
    {
      keyId: paymentSettings.razorpayKeyId,
      keySecret: decryptedSecret,
    }
  );

  if (!gatewayOrder || !gatewayOrder.gatewayOrderId) {
    throw new Error("Payment order could not be created.");
  }

  const paymentNumber = `PAY-PAT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

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
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
    gatewayOrderId: gatewayOrder.gatewayOrderId,
    amountInPaise,
    currency: "INR",
    method: PaymentMethod.RAZORPAY,
    requiresGatewayCheckout: true,
    // Only Key ID is exposed to client modal (NEVER key secret)
    razorpayKeyId: paymentSettings.razorpayKeyId,
    labName: lab.name,
    patientName: order.patient.fullName,
    patientPhone: order.patient.phone,
    reusedExistingOrder: false,
    trustNotice: `Pay ${lab.name}. Your payment goes directly to ${lab.name}. Powered by Gyrex Labs.`,
  };
}

/**
 * Authoritatively verifies Razorpay checkout payment signature server-side.
 * Updates payment to PAID and order to CONFIRMED inside an atomic transaction.
 * Strictly verifies amount integrity, tenant isolation, and idempotency.
 */
export async function verifyAndConfirmPatientPayment(input: VerifyPatientPaymentInput) {
  if (
    !input.orderId ||
    !input.gatewayOrderId ||
    !input.gatewayPaymentId ||
    !input.gatewaySignature ||
    typeof input.orderId !== "string" ||
    typeof input.gatewayOrderId !== "string" ||
    typeof input.gatewayPaymentId !== "string" ||
    typeof input.gatewaySignature !== "string" ||
    !input.orderId.trim() ||
    !input.gatewayOrderId.trim() ||
    !input.gatewayPaymentId.trim() ||
    !input.gatewaySignature.trim()
  ) {
    throw new Error("Missing or invalid payment verification parameters.");
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: input.orderId.trim() },
        { orderNumber: input.orderId.trim() },
      ],
    },
    include: {
      lab: {
        include: {
          paymentSettings: true,
        },
      },
      patient: true,
      payments: true,
    },
  });

  if (!order) {
    throw new Error(`Order '${input.orderId}' not found.`);
  }

  // 1. Authorization check
  if (input.verificationPhone) {
    const cleanVerification = input.verificationPhone.replace(/\D/g, "");
    const cleanPatient = order.patient.phone.replace(/\D/g, "");
    if (!cleanVerification || cleanVerification !== cleanPatient) {
      throw new Error("Unauthorized: Patient phone verification failed.");
    }
  }

  // 2. Find matching payment by gatewayOrderId
  const payment = order.payments.find((p) => p.gatewayOrderId === input.gatewayOrderId.trim());
  if (!payment) {
    throw new Error(`Payment record matching gateway order '${input.gatewayOrderId}' not found.`);
  }

  // 3. Idempotency Check
  if (payment.status === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.PAID) {
    if (payment.gatewayPaymentId === input.gatewayPaymentId.trim()) {
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentNumber: payment.paymentNumber,
        status: PaymentStatus.PAID,
        alreadyProcessed: true,
      };
    } else {
      throw new Error("Order has already been paid with a different payment reference.");
    }
  }

  // 4. Amount & Currency Integrity Checks
  if (input.currency && input.currency.trim().toUpperCase() !== "INR") {
    throw new Error("Invalid payment currency. Only INR is supported.");
  }

  const expectedPaise = Math.round(Number(order.totalAmount) * 100);
  if (input.amountInPaise !== undefined && input.amountInPaise !== expectedPaise) {
    throw new Error("Payment amount does not match the order.");
  }

  if (Math.abs(Number(payment.amount) - Number(order.totalAmount)) > 0.01) {
    throw new Error("Payment amount integrity violation: payment amount does not match order total.");
  }

  // 5. Decrypt laboratory's Razorpay Secret
  const paymentSettings = order.lab.paymentSettings;
  if (!paymentSettings?.razorpayKeySecretEncrypted) {
    throw new Error("Payment configuration is not available for this laboratory. Missing secret for verification.");
  }

  let labSecret: string;
  try {
    labSecret = decryptSecret(paymentSettings.razorpayKeySecretEncrypted);
  } catch {
    throw new Error("Failed to decrypt laboratory credentials for payment verification.");
  }

  // 6. Cryptographic HMAC-SHA256 Signature Verification
  const isSignatureValid = razorpayProvider.verifyPaymentSignature({
    orderId: input.gatewayOrderId.trim(),
    paymentId: input.gatewayPaymentId.trim(),
    signature: input.gatewaySignature.trim(),
    secret: labSecret,
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
        reason: "Invalid Razorpay payment signature",
        gatewayOrderId: input.gatewayOrderId,
        gatewayPaymentId: input.gatewayPaymentId,
      },
    });

    throw new Error("Payment verification failed. Invalid or tampered signature.");
  }

  // 7. Atomic Database State Update
  const { updatedPayment, updatedOrder } = await prisma.$transaction(
    async (tx) => {
      const upPayment = await tx.patientPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          gatewayPaymentId: input.gatewayPaymentId.trim(),
          gatewaySignature: input.gatewaySignature.trim(),
          paidAt: new Date(),
        },
      });

      const upOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          confirmedAt: new Date(),
        },
      });

      return { updatedPayment: upPayment, updatedOrder: upOrder };
    },
    { maxWait: 15000, timeout: 20000 }
  );

  // 8. Audit Logging for State Transition
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

  // 9. Non-blocking WhatsApp Transactional Notifications
  try {
    sendPaymentConfirmationWhatsApp(updatedPayment.id).catch((err) =>
      console.error("Non-blocking payment confirmation WhatsApp error:", err)
    );
    sendOrderConfirmationWhatsApp(updatedOrder.id).catch((err) =>
      console.error("Non-blocking order confirmation WhatsApp error:", err)
    );
  } catch (err: any) {
    console.error("Non-blocking notification trigger error:", err);
  }

  return {
    success: true,
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    paymentNumber: updatedPayment.paymentNumber,
    status: PaymentStatus.PAID,
    alreadyProcessed: false,
  };
}
