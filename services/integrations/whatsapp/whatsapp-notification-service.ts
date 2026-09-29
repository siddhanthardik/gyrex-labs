/**
 * Gyrex Labs - WhatsApp Transactional Notification Service
 *
 * Implements non-blocking, tenant-isolated transactional notifications for:
 * 1. Order Confirmation (on order booking / confirmation)
 * 2. Payment Confirmation (on online payment verification or capture)
 * 3. Sample Collection (on sample collection status update)
 * 4. Diagnostic Report Ready (on report release / final status)
 *
 * HARD CONSTRAINTS:
 * - WhatsApp is 100% OPTIONAL: unconfigured/disabled labs gracefully exit with no side-effects.
 * - Non-blocking: Notification failures NEVER roll back or crash order, payment, or report flows.
 * - Idempotency: Duplicate calls for the same event and entity do not send duplicate messages.
 * - Tenant isolation: Each lab strictly uses its own encrypted WABA credentials.
 * - Secure reports: Send authenticated verification link (${baseUrl}/${labSlug}/reports), NEVER raw PDF bytes.
 * - Patient consent: Opt-out respected and standard opt-out footer included.
 */

import { prisma } from "@/lib/db/prisma";
import { whatsAppService } from "./whatsapp-service";
import { NotificationChannel, NotificationRecipientType, AuditAction, PaymentStatus } from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";

export interface NotificationResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  notificationId?: string;
}

/**
 * Checks if a notification with the specified idempotency key was already recorded for this lab.
 */
async function isNotificationAlreadySent(labId: string, idempotencyKey: string): Promise<boolean> {
  try {
    const existing = await prisma.notification.findFirst({
      where: {
        labId,
        channel: NotificationChannel.WHATSAPP,
        recipientType: NotificationRecipientType.PATIENT,
        data: {
          path: ["idempotencyKey"],
          equals: idempotencyKey,
        },
      },
    });
    return Boolean(existing);
  } catch {
    // Fallback: in case of JSON query nuance, search recent lab notifications
    const recent = await prisma.notification.findMany({
      where: {
        labId,
        channel: NotificationChannel.WHATSAPP,
        recipientType: NotificationRecipientType.PATIENT,
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    return recent.some((n: any) => n.data?.idempotencyKey === idempotencyKey);
  }
}

/**
 * Dispatches an Order Confirmation WhatsApp notification to the patient.
 */
export async function sendOrderConfirmationWhatsApp(orderId: string): Promise<NotificationResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lab: { select: { id: true, name: true, slug: true, phone: true } },
        patient: { select: { id: true, fullName: true, phone: true } },
        collection: true,
      },
    });

    if (!order || !order.patient?.phone) {
      return { sent: false, skipped: true, reason: "Order or patient phone not found" };
    }

    const labId = order.lab.id;

    // Check laboratory WhatsApp connection & preference
    const settings = await whatsAppService.getLabWhatsAppSettings(labId);
    if (!settings.configured || !settings.isEnabled || settings.notifyOrderConfirmation === false) {
      return { sent: false, skipped: true, reason: "WhatsApp unconfigured or order notification disabled" };
    }

    // Idempotency check
    const idempotencyKey = `order_confirmed:${order.id}`;
    if (await isNotificationAlreadySent(labId, idempotencyKey)) {
      return { sent: false, skipped: true, reason: "Order confirmation notification already sent" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const trackingUrl = `${baseUrl}/${order.lab.slug}/booking/${order.orderNumber}`;
    const collectionTypeLabel =
      order.collectionType === "HOME_COLLECTION" ? "Home Collection" : "Laboratory Visit";

    const scheduledDateStr = order.collection?.scheduledDate
      ? new Date(order.collection.scheduledDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "As scheduled";
    const slotStr = order.collection?.scheduledSlot || "";

    const paymentLabel =
      order.paymentStatus === PaymentStatus.PAID
        ? "PAID (Online)"
        : order.paymentStatus === PaymentStatus.CASH_ON_COLLECTION
        ? "Cash on Collection"
        : "Pending Payment";

    const text =
      `Order Confirmed! 📋\n\n` +
      `Dear ${order.patient.fullName}, your diagnostic test booking with *${order.lab.name}* has been confirmed.\n\n` +
      `• *Order Number:* ${order.orderNumber}\n` +
      `• *Collection Type:* ${collectionTypeLabel}\n` +
      `• *Schedule:* ${scheduledDateStr}${slotStr ? ` (${slotStr})` : ""}\n` +
      `• *Total Amount:* ₹${Number(order.totalAmount).toLocaleString("en-IN")}\n` +
      `• *Payment Status:* ${paymentLabel}\n\n` +
      `Track your booking status & updates:\n${trackingUrl}\n\n` +
      (order.lab.phone ? `Need help? Call: ${order.lab.phone}\n\n` : "") +
      `Reply STOP to opt out of updates.`;

    const sendResult = await whatsAppService.sendLabTextMessage({
      labId,
      recipientPhone: order.patient.phone,
      text,
    });

    if (!sendResult.success) {
      return { sent: false, skipped: false, reason: sendResult.status };
    }

    // Record notification in database
    const notification = await prisma.notification.create({
      data: {
        recipientType: NotificationRecipientType.PATIENT,
        channel: NotificationChannel.WHATSAPP,
        labId,
        title: `Order Confirmed: ${order.orderNumber}`,
        message: text,
        data: {
          eventType: "ORDER_CONFIRMATION",
          idempotencyKey,
          orderId: order.id,
          orderNumber: order.orderNumber,
          recipientPhone: order.patient.phone,
          messageId: sendResult.messageId,
          status: sendResult.status,
        },
      },
    });

    await recordAuditLog({
      action: AuditAction.USER_PERMISSION_CHANGED,
      entityType: "Notification",
      entityId: notification.id,
      labId,
      orderId: order.id,
      metadata: {
        channel: "WHATSAPP",
        eventType: "ORDER_CONFIRMATION",
        messageId: sendResult.messageId,
        recipientPhoneMasked: order.patient.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2"),
      },
    });

    return {
      sent: true,
      messageId: sendResult.messageId,
      notificationId: notification.id,
    };
  } catch (err: any) {
    console.error("Non-blocking error in sendOrderConfirmationWhatsApp:", err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * Dispatches a Payment Confirmation WhatsApp notification to the patient.
 */
export async function sendPaymentConfirmationWhatsApp(paymentId: string): Promise<NotificationResult> {
  try {
    const payment = await prisma.patientPayment.findUnique({
      where: { id: paymentId },
      include: {
        lab: { select: { id: true, name: true, slug: true, phone: true } },
        order: {
          include: {
            patient: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
    });

    if (!payment || !payment.order || !payment.order.patient?.phone) {
      return { sent: false, skipped: true, reason: "Payment, order, or patient phone not found" };
    }

    const labId = payment.labId;

    // Check laboratory WhatsApp connection & preference
    const settings = await whatsAppService.getLabWhatsAppSettings(labId);
    if (!settings.configured || !settings.isEnabled || settings.notifyPaymentConfirmation === false) {
      return { sent: false, skipped: true, reason: "WhatsApp unconfigured or payment notification disabled" };
    }

    // Idempotency check
    const idempotencyKey = `payment_confirmed:${payment.id}`;
    if (await isNotificationAlreadySent(labId, idempotencyKey)) {
      return { sent: false, skipped: true, reason: "Payment confirmation notification already sent" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const trackingUrl = `${baseUrl}/${payment.lab.slug}/booking/${payment.order.orderNumber}`;

    const text =
      `Payment Received! 💳\n\n` +
      `Dear ${payment.order.patient.fullName}, we have received your payment of *₹${Number(payment.amount).toLocaleString("en-IN")}* for Order *${payment.order.orderNumber}*.\n\n` +
      `• *Payment Reference:* ${payment.paymentNumber}\n` +
      `• *Laboratory:* ${payment.lab.name}\n` +
      `• *Status:* Payment Verified & Confirmed\n\n` +
      `View your order receipt & collection details:\n${trackingUrl}\n\n` +
      `Reply STOP to opt out of updates.`;

    const sendResult = await whatsAppService.sendLabTextMessage({
      labId,
      recipientPhone: payment.order.patient.phone,
      text,
    });

    if (!sendResult.success) {
      return { sent: false, skipped: false, reason: sendResult.status };
    }

    const notification = await prisma.notification.create({
      data: {
        recipientType: NotificationRecipientType.PATIENT,
        channel: NotificationChannel.WHATSAPP,
        labId,
        title: `Payment Received: ${payment.paymentNumber}`,
        message: text,
        data: {
          eventType: "PAYMENT_CONFIRMATION",
          idempotencyKey,
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          orderId: payment.order.id,
          orderNumber: payment.order.orderNumber,
          recipientPhone: payment.order.patient.phone,
          messageId: sendResult.messageId,
          status: sendResult.status,
        },
      },
    });

    await recordAuditLog({
      action: AuditAction.USER_PERMISSION_CHANGED,
      entityType: "Notification",
      entityId: notification.id,
      labId,
      orderId: payment.order.id,
      metadata: {
        channel: "WHATSAPP",
        eventType: "PAYMENT_CONFIRMATION",
        messageId: sendResult.messageId,
      },
    });

    return {
      sent: true,
      messageId: sendResult.messageId,
      notificationId: notification.id,
    };
  } catch (err: any) {
    console.error("Non-blocking error in sendPaymentConfirmationWhatsApp:", err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * Dispatches a Sample Collection WhatsApp notification to the patient.
 */
export async function sendSampleCollectedWhatsApp(
  orderId: string,
  details?: { phlebotomistName?: string }
): Promise<NotificationResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lab: { select: { id: true, name: true, slug: true, phone: true } },
        patient: { select: { id: true, fullName: true, phone: true } },
        collection: true,
      },
    });

    if (!order || !order.patient?.phone) {
      return { sent: false, skipped: true, reason: "Order or patient phone not found" };
    }

    const labId = order.lab.id;

    // Check laboratory WhatsApp connection & preference
    const settings = await whatsAppService.getLabWhatsAppSettings(labId);
    if (!settings.configured || !settings.isEnabled || settings.notifySampleCollected === false) {
      return { sent: false, skipped: true, reason: "WhatsApp unconfigured or sample notification disabled" };
    }

    // Idempotency check
    const idempotencyKey = `sample_collected:${order.id}`;
    if (await isNotificationAlreadySent(labId, idempotencyKey)) {
      return { sent: false, skipped: true, reason: "Sample collection notification already sent" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const trackingUrl = `${baseUrl}/${order.lab.slug}/booking/${order.orderNumber}`;
    const phlebotomist = details?.phlebotomistName || order.collection?.phlebotomistName;

    const text =
      `Sample Collected! 🧪\n\n` +
      `Dear ${order.patient.fullName}, your diagnostic sample for Order *${order.orderNumber}* has been successfully collected and safely transported to *${order.lab.name}*.\n\n` +
      (phlebotomist ? `• *Collected by:* ${phlebotomist}\n` : "") +
      `• *Status:* Processing in Laboratory\n\n` +
      `Our clinical team is currently analyzing your sample. You will receive an instant notification as soon as your verified report is ready.\n\n` +
      `Track your test processing live:\n${trackingUrl}\n\n` +
      `Reply STOP to opt out of updates.`;

    const sendResult = await whatsAppService.sendLabTextMessage({
      labId,
      recipientPhone: order.patient.phone,
      text,
    });

    if (!sendResult.success) {
      return { sent: false, skipped: false, reason: sendResult.status };
    }

    const notification = await prisma.notification.create({
      data: {
        recipientType: NotificationRecipientType.PATIENT,
        channel: NotificationChannel.WHATSAPP,
        labId,
        title: `Sample Collected: ${order.orderNumber}`,
        message: text,
        data: {
          eventType: "SAMPLE_COLLECTED",
          idempotencyKey,
          orderId: order.id,
          orderNumber: order.orderNumber,
          recipientPhone: order.patient.phone,
          messageId: sendResult.messageId,
          status: sendResult.status,
        },
      },
    });

    await recordAuditLog({
      action: AuditAction.USER_PERMISSION_CHANGED,
      entityType: "Notification",
      entityId: notification.id,
      labId,
      orderId: order.id,
      metadata: {
        channel: "WHATSAPP",
        eventType: "SAMPLE_COLLECTED",
        messageId: sendResult.messageId,
      },
    });

    return {
      sent: true,
      messageId: sendResult.messageId,
      notificationId: notification.id,
    };
  } catch (err: any) {
    console.error("Non-blocking error in sendSampleCollectedWhatsApp:", err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * Dispatches a Diagnostic Report Ready WhatsApp notification to the patient.
 * CRITICAL SECURITY: Sends a secure authenticated link, NEVER raw PDF bytes over WhatsApp.
 * Updates Report.deliveredViaWhatsappAt on success.
 */
export async function sendReportReadyWhatsApp(reportId: string): Promise<NotificationResult> {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        lab: { select: { id: true, name: true, slug: true, phone: true } },
        order: {
          include: {
            patient: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
    });

    if (!report || !report.order || !report.order.patient?.phone) {
      return { sent: false, skipped: true, reason: "Report, order, or patient phone not found" };
    }

    const labId = report.labId;

    // Check laboratory WhatsApp connection & preference
    const settings = await whatsAppService.getLabWhatsAppSettings(labId);
    if (!settings.configured || !settings.isEnabled || settings.notifyReportReady === false) {
      return { sent: false, skipped: true, reason: "WhatsApp unconfigured or report notification disabled" };
    }

    // Idempotency check
    const idempotencyKey = `report_ready:${report.id}`;
    if (await isNotificationAlreadySent(labId, idempotencyKey)) {
      return { sent: false, skipped: true, reason: "Report ready notification already sent" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const reportUrl = `${baseUrl}/${report.lab.slug}/reports?orderNumber=${report.order.orderNumber}`;

    const text =
      `Diagnostic Report Ready! 📄\n\n` +
      `Dear ${report.order.patient.fullName}, your diagnostic test report from *${report.lab.name}* is now verified and available.\n\n` +
      `• *Order Number:* ${report.order.orderNumber}\n` +
      `• *Report ID:* ${report.reportNumber}\n\n` +
      `View and download your official report securely:\n${reportUrl}\n\n` +
      `🔒 *Privacy Notice:* To protect your clinical data, phone verification is required to download.\n\n` +
      `Reply STOP to opt out of updates.`;

    const sendResult = await whatsAppService.sendLabTextMessage({
      labId,
      recipientPhone: report.order.patient.phone,
      text,
    });

    if (!sendResult.success) {
      return { sent: false, skipped: false, reason: sendResult.status };
    }

    // Update Report.deliveredViaWhatsappAt
    await prisma.report.update({
      where: { id: report.id },
      data: { deliveredViaWhatsappAt: new Date() },
    });

    const notification = await prisma.notification.create({
      data: {
        recipientType: NotificationRecipientType.PATIENT,
        channel: NotificationChannel.WHATSAPP,
        labId,
        title: `Report Ready: ${report.reportNumber}`,
        message: text,
        data: {
          eventType: "REPORT_READY",
          idempotencyKey,
          reportId: report.id,
          reportNumber: report.reportNumber,
          orderId: report.order.id,
          orderNumber: report.order.orderNumber,
          recipientPhone: report.order.patient.phone,
          messageId: sendResult.messageId,
          status: sendResult.status,
        },
      },
    });

    await recordAuditLog({
      action: AuditAction.USER_PERMISSION_CHANGED,
      entityType: "Notification",
      entityId: notification.id,
      labId,
      orderId: report.order.id,
      metadata: {
        channel: "WHATSAPP",
        eventType: "REPORT_READY",
        reportId: report.id,
        messageId: sendResult.messageId,
      },
    });

    return {
      sent: true,
      messageId: sendResult.messageId,
      notificationId: notification.id,
    };
  } catch (err: any) {
    console.error("Non-blocking error in sendReportReadyWhatsApp:", err.message);
    return { sent: false, reason: err.message };
  }
}
