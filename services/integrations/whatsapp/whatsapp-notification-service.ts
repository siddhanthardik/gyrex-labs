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
 * - Plan Entitlements:
 *   * Growth plan: routed via Gyrex Shared WhatsApp sender with strict 250 msg/mo quota ledger.
 *   * Professional / Enterprise: routed via laboratory's own Meta integration (Custom WABA).
 *   * Ineligible / Unmapped: fail-closed with PLAN_NOT_ENTITLED.
 * - Secure reports: Send authenticated verification link (${baseUrl}/${labSlug}/reports), NEVER raw PDF bytes.
 * - Patient consent: Opt-out respected and standard opt-out footer included.
 * - Reconciliation safety: Ambiguous network outcomes (e.g. timeouts) NEVER prematurely release quota.
 */

import { prisma } from "@/lib/db/prisma";
import { whatsAppService } from "./whatsapp-service";
import {
  NotificationChannel,
  NotificationRecipientType,
  AuditAction,
  PaymentStatus,
} from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";
import { resolveLabWhatsAppEntitlement } from "./whatsapp-entitlement-service";
import {
  reserveQuota,
  confirmQuotaReservation,
  releaseQuotaReservation,
  markReservationPendingReconciliation,
} from "./whatsapp-quota-service";
import {
  WhatsAppEventType,
  buildOrderConfirmationTemplate,
  buildPaymentConfirmationTemplate,
  buildSampleCollectedTemplate,
  buildReportReadyTemplate,
  TemplateBuildResult,
} from "./whatsapp-template-service";

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

interface OutboundNotificationContext {
  labId: string;
  orderId?: string;
  recipientPhone: string;
  recipientName: string;
  eventType: WhatsAppEventType;
  idempotencyKey: string;
  title: string;
  preferenceKey:
    | "notifyOrderConfirmation"
    | "notifyPaymentConfirmation"
    | "notifySampleCollected"
    | "notifyReportReady";
  buildTemplate: () => Promise<TemplateBuildResult>;
  metadata?: Record<string, any>;
  onSuccess?: () => Promise<void>;
}

/**
 * Core outbound WhatsApp notification dispatcher.
 * Handles patient opt-out, idempotency deduplication, plan entitlement routing,
 * quota reservation/reconciliation, and template dispatch.
 */
async function dispatchWhatsAppNotification(
  ctx: OutboundNotificationContext
): Promise<NotificationResult> {
  // 1. Patient Opt-Out Check (Per-Tenant)
  const isOptedOut = await whatsAppService.isPatientOptedOut(ctx.labId, ctx.recipientPhone);
  if (isOptedOut) {
    return { sent: false, skipped: true, reason: "PATIENT_OPTED_OUT" };
  }

  // 2. Idempotency Check in Notification table
  if (await isNotificationAlreadySent(ctx.labId, ctx.idempotencyKey)) {
    return { sent: false, skipped: true, reason: "ALREADY_SENT" };
  }

  // 3. Lab Notification Preference Check
  const labSettings = await whatsAppService.getLabWhatsAppSettings(ctx.labId);
  if (labSettings[ctx.preferenceKey] === false) {
    return { sent: false, skipped: true, reason: "NOTIFICATION_DISABLED_IN_LAB_SETTINGS" };
  }

  // 4. Resolve Server-Authoritative Subscription Entitlement
  const entitlement = await resolveLabWhatsAppEntitlement(ctx.labId);

  // =========================================================================
  // ROUTING PATH A: GROWTH PLAN (Shared Gyrex WhatsApp Sender with Quota Ledger)
  // =========================================================================
  if (entitlement.canUseSharedWhatsApp) {
    // A1. Atomically reserve quota
    const reservationResult = await reserveQuota({
      labId: ctx.labId,
      idempotencyKey: ctx.idempotencyKey,
      recipientPhone: ctx.recipientPhone,
      eventType: ctx.eventType,
      metadata: ctx.metadata,
    });

    if (!reservationResult.success) {
      return {
        sent: false,
        skipped: true,
        reason: reservationResult.reason,
      };
    }

    if (reservationResult.isDuplicate) {
      return {
        sent: true,
        skipped: true,
        reason: "DUPLICATE_EVENT",
        messageId: reservationResult.providerMessageId || undefined,
      };
    }

    // A2. Build template payload
    const templateResult = await ctx.buildTemplate();
    if (!templateResult.valid || !templateResult.payload) {
      // Configuration error: immediately release reserved quota
      await releaseQuotaReservation({
        labId: ctx.labId,
        idempotencyKey: ctx.idempotencyKey,
        failureReason: templateResult.error || "MISSING_TEMPLATE_CONFIG",
      });
      return {
        sent: false,
        skipped: false,
        reason: templateResult.error || "MISSING_TEMPLATE_CONFIG",
      };
    }

    // A3. Dispatch via Gyrex Shared Sender
    const sendResult = await whatsAppService.sendSharedTemplateMessage({
      recipientPhone: ctx.recipientPhone,
      template: templateResult.payload,
    });

    // A4. Handle dispatch outcome
    if (sendResult.success) {
      // Provider accepted with WAMID: confirm quota permanently
      await confirmQuotaReservation({
        labId: ctx.labId,
        idempotencyKey: ctx.idempotencyKey,
        providerMessageId: sendResult.messageId,
      });

      const notification = await prisma.notification.create({
        data: {
          recipientType: NotificationRecipientType.PATIENT,
          channel: NotificationChannel.WHATSAPP,
          labId: ctx.labId,
          title: ctx.title,
          message: templateResult.summaryText || ctx.title,
          data: {
            eventType: ctx.eventType,
            idempotencyKey: ctx.idempotencyKey,
            recipientPhone: ctx.recipientPhone,
            messageId: sendResult.messageId,
            provider: "SHARED_GYREX_WHATSAPP",
            status: sendResult.status,
            ...ctx.metadata,
          },
        },
      });

      if (ctx.onSuccess) {
        try {
          await ctx.onSuccess();
        } catch (onSuccessErr: any) {
          console.error("Non-blocking error in notification onSuccess callback:", onSuccessErr.message);
        }
      }

      await recordAuditLog({
        action: AuditAction.USER_PERMISSION_CHANGED,
        entityType: "Notification",
        entityId: notification.id,
        labId: ctx.labId,
        orderId: ctx.orderId,
        metadata: {
          channel: "WHATSAPP",
          provider: "SHARED_GYREX_WHATSAPP",
          eventType: ctx.eventType,
          messageId: sendResult.messageId,
        },
      });

      return {
        sent: true,
        messageId: sendResult.messageId,
        notificationId: notification.id,
      };
    } else if (sendResult.isAmbiguousNetworkError) {
      // Ambiguous outcome (network timeout, connection drop):
      // NEVER release quota automatically because Meta may have accepted the message!
      await markReservationPendingReconciliation({
        labId: ctx.labId,
        idempotencyKey: ctx.idempotencyKey,
        reason: sendResult.reason || "NETWORK_TIMEOUT",
      });

      return {
        sent: false,
        skipped: false,
        reason: "PENDING_RECONCILIATION",
      };
    } else {
      // Explicit provider rejection (e.g. invalid phone number, unapproved template):
      // Safe to release quota back to laboratory
      await releaseQuotaReservation({
        labId: ctx.labId,
        idempotencyKey: ctx.idempotencyKey,
        failureReason: sendResult.reason || "PROVIDER_REJECTED",
      });

      return {
        sent: false,
        skipped: false,
        reason: sendResult.reason || "SEND_FAILED",
      };
    }
  }

  // =========================================================================
  // ROUTING PATH B: PROFESSIONAL / ENTERPRISE (Custom Laboratory WABA)
  // =========================================================================
  if (entitlement.canConfigureCustomWaba) {
    if (!labSettings.configured || !labSettings.isEnabled) {
      return { sent: false, skipped: true, reason: "CUSTOM_WABA_UNCONFIGURED" };
    }

    const templateResult = await ctx.buildTemplate();
    if (!templateResult.valid || !templateResult.payload) {
      return {
        sent: false,
        skipped: false,
        reason: templateResult.error || "MISSING_TEMPLATE_CONFIG",
      };
    }

    const sendResult = await whatsAppService.sendLabTemplateMessage({
      labId: ctx.labId,
      recipientPhone: ctx.recipientPhone,
      template: templateResult.payload,
    });

    if (!sendResult.success) {
      return { sent: false, skipped: false, reason: sendResult.reason || sendResult.status };
    }

    const notification = await prisma.notification.create({
      data: {
        recipientType: NotificationRecipientType.PATIENT,
        channel: NotificationChannel.WHATSAPP,
        labId: ctx.labId,
        title: ctx.title,
        message: templateResult.summaryText || ctx.title,
        data: {
          eventType: ctx.eventType,
          idempotencyKey: ctx.idempotencyKey,
          recipientPhone: ctx.recipientPhone,
          messageId: sendResult.messageId,
          provider: "CUSTOM_LAB_WABA",
          status: sendResult.status,
          ...ctx.metadata,
        },
      },
    });

    if (ctx.onSuccess) {
      try {
        await ctx.onSuccess();
      } catch (onSuccessErr: any) {
        console.error("Non-blocking error in notification onSuccess callback:", onSuccessErr.message);
      }
    }

    await recordAuditLog({
      action: AuditAction.USER_PERMISSION_CHANGED,
      entityType: "Notification",
      entityId: notification.id,
      labId: ctx.labId,
      orderId: ctx.orderId,
      metadata: {
        channel: "WHATSAPP",
        provider: "CUSTOM_LAB_WABA",
        eventType: ctx.eventType,
        messageId: sendResult.messageId,
      },
    });

    return {
      sent: true,
      messageId: sendResult.messageId,
      notificationId: notification.id,
    };
  }

  // =========================================================================
  // ROUTING PATH C: INELIGIBLE PLAN (Fail Closed)
  // =========================================================================
  return { sent: false, skipped: true, reason: "PLAN_NOT_ENTITLED" };
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
    const collectionSchedule = `${collectionTypeLabel} (${scheduledDateStr}${slotStr ? ` ${slotStr}` : ""})`;

    return await dispatchWhatsAppNotification({
      labId: order.lab.id,
      orderId: order.id,
      recipientPhone: order.patient.phone,
      recipientName: order.patient.fullName,
      eventType: "ORDER_CONFIRMATION",
      idempotencyKey: `order_confirmed:${order.id}`,
      title: `Order Confirmed: ${order.orderNumber}`,
      preferenceKey: "notifyOrderConfirmation",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      buildTemplate: () =>
        buildOrderConfirmationTemplate({
          patientName: order.patient.fullName,
          labName: order.lab.name,
          orderNumber: order.orderNumber,
          collectionSchedule,
          totalAmount: Number(order.totalAmount),
          trackingUrl,
        }),
    });
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const trackingUrl = `${baseUrl}/${payment.lab.slug}/booking/${payment.order.orderNumber}`;

    return await dispatchWhatsAppNotification({
      labId: payment.labId,
      orderId: payment.order.id,
      recipientPhone: payment.order.patient.phone,
      recipientName: payment.order.patient.fullName,
      eventType: "PAYMENT_CONFIRMATION",
      idempotencyKey: `payment_confirmed:${payment.id}`,
      title: `Payment Received: ${payment.paymentNumber}`,
      preferenceKey: "notifyPaymentConfirmation",
      metadata: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        orderId: payment.order.id,
        orderNumber: payment.order.orderNumber,
      },
      buildTemplate: () =>
        buildPaymentConfirmationTemplate({
          patientName: payment.order.patient.fullName,
          labName: payment.lab.name,
          amount: Number(payment.amount),
          orderNumber: payment.order.orderNumber,
          paymentNumber: payment.paymentNumber,
          trackingUrl,
        }),
    });
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const trackingUrl = `${baseUrl}/${order.lab.slug}/booking/${order.orderNumber}`;
    const phlebotomist = details?.phlebotomistName || order.collection?.phlebotomistName || "Gyrex Phlebotomy Team";

    return await dispatchWhatsAppNotification({
      labId: order.lab.id,
      orderId: order.id,
      recipientPhone: order.patient.phone,
      recipientName: order.patient.fullName,
      eventType: "SAMPLE_COLLECTED",
      idempotencyKey: `sample_collected:${order.id}`,
      title: `Sample Collected: ${order.orderNumber}`,
      preferenceKey: "notifySampleCollected",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      buildTemplate: () =>
        buildSampleCollectedTemplate({
          patientName: order.patient.fullName,
          labName: order.lab.name,
          orderNumber: order.orderNumber,
          phlebotomistName: phlebotomist,
          trackingUrl,
        }),
    });
  } catch (err: any) {
    console.error("Non-blocking error in sendSampleCollectedWhatsApp:", err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * Dispatches a Diagnostic Report Ready WhatsApp notification to the patient.
 * CRITICAL SECURITY: Sends an authenticated verification URL, NEVER raw PDF bytes.
 * Updates Report.deliveredViaWhatsappAt upon successful provider acceptance.
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.gyrex.in";
    const reportUrl = `${baseUrl}/${report.lab.slug}/reports?orderNumber=${report.order.orderNumber}`;

    return await dispatchWhatsAppNotification({
      labId: report.labId,
      orderId: report.order.id,
      recipientPhone: report.order.patient.phone,
      recipientName: report.order.patient.fullName,
      eventType: "REPORT_READY",
      idempotencyKey: `report_ready:${report.id}`,
      title: `Report Ready: ${report.reportNumber}`,
      preferenceKey: "notifyReportReady",
      metadata: {
        reportId: report.id,
        reportNumber: report.reportNumber,
        orderId: report.order.id,
        orderNumber: report.order.orderNumber,
      },
      onSuccess: async () => {
        await prisma.report.update({
          where: { id: report.id },
          data: { deliveredViaWhatsappAt: new Date() },
        });
      },
      buildTemplate: () =>
        buildReportReadyTemplate({
          patientName: report.order.patient.fullName,
          labName: report.lab.name,
          orderNumber: report.order.orderNumber,
          reportNumber: report.reportNumber,
          reportUrl,
        }),
    });
  } catch (err: any) {
    console.error("Non-blocking error in sendReportReadyWhatsApp:", err.message);
    return { sent: false, reason: err.message };
  }
}
