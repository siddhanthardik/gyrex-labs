import { prisma } from "@/lib/db/prisma";
import {
  SubscriptionStatus,
  BillingCycle,
  WhatsAppReservationStatus,
  LabWhatsAppQuotaPeriod,
  LabWhatsAppReservation,
} from "@prisma/client";
import {
  resolveLabWhatsAppEntitlement,
  assertLabCanUseSharedWhatsApp,
  LabWhatsAppEntitlement,
} from "./whatsapp-entitlement-service";

export interface QuotaReservationSuccess {
  success: true;
  isDuplicate: boolean;
  status: WhatsAppReservationStatus;
  reservation: LabWhatsAppReservation;
  period: LabWhatsAppQuotaPeriod;
  providerMessageId?: string | null;
}

export interface QuotaReservationFailure {
  success: false;
  reason: "QUOTA_EXHAUSTED" | "NOT_ENTITLED" | "INVALID_INPUT";
  message: string;
  upgradeRequired: boolean;
  entitlement?: LabWhatsAppEntitlement;
}

export type QuotaReservationResult = QuotaReservationSuccess | QuotaReservationFailure;

export interface LabQuotaUsageSummary {
  periodId: string;
  periodStart: Date;
  periodEnd: Date;
  quotaLimit: number;
  messagesReserved: number;
  messagesConfirmed: number;
  messagesAvailable: number;
  isExhausted: boolean;
}

/**
 * Calculates the monthly quota window boundaries for a laboratory subscription.
 * Handles both MONTHLY and YEARLY billing cycles deterministically.
 * Standard operational timezone: Asia/Kolkata (canonical UTC stored in PostgreSQL).
 */
export function calculateQuotaWindowBoundaries(params: {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycle: BillingCycle;
  referenceDate?: Date;
}): { periodStart: Date; periodEnd: Date } {
  const { currentPeriodStart, currentPeriodEnd, billingCycle } = params;
  const now = params.referenceDate || new Date();

  // If monthly, the quota window matches the subscription billing cycle
  if (billingCycle === BillingCycle.MONTHLY) {
    return {
      periodStart: new Date(currentPeriodStart),
      periodEnd: new Date(currentPeriodEnd),
    };
  }

  // If yearly, calculate discrete 1-month slices starting from currentPeriodStart
  let sliceStart = new Date(currentPeriodStart);

  while (sliceStart < currentPeriodEnd) {
    const nextMonth = new Date(sliceStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const sliceEnd = nextMonth < currentPeriodEnd ? nextMonth : new Date(currentPeriodEnd);

    if (now >= sliceStart && now < sliceEnd) {
      return { periodStart: sliceStart, periodEnd: sliceEnd };
    }

    if (sliceEnd >= currentPeriodEnd) {
      break;
    }
    sliceStart = sliceEnd;
  }

  // Fallback: Bound within the subscription start and 1 month out
  const fallbackEnd = new Date(currentPeriodStart);
  fallbackEnd.setMonth(fallbackEnd.getMonth() + 1);
  return {
    periodStart: new Date(currentPeriodStart),
    periodEnd: fallbackEnd < currentPeriodEnd ? fallbackEnd : new Date(currentPeriodEnd),
  };
}

/**
 * Retrieves or initializes the active LabWhatsAppQuotaPeriod record for the laboratory.
 * Snapshots the plan's quota limit at the moment the window opens.
 */
export async function getOrCreateCurrentQuotaPeriod(
  labId: string,
  referenceDate: Date = new Date()
): Promise<{ period: LabWhatsAppQuotaPeriod; entitlement: LabWhatsAppEntitlement }> {
  const entitlement = await resolveLabWhatsAppEntitlement(labId);

  const subscription = await prisma.subscription.findUnique({
    where: { labId },
    select: {
      currentPeriodStart: true,
      currentPeriodEnd: true,
      billingCycle: true,
      status: true,
    },
  });

  const now = referenceDate;
  let periodStart: Date;
  let periodEnd: Date;

  if (subscription) {
    const boundaries = calculateQuotaWindowBoundaries({
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      billingCycle: subscription.billingCycle,
      referenceDate: now,
    });
    periodStart = boundaries.periodStart;
    periodEnd = boundaries.periodEnd;
  } else {
    // Unsubscribed fallback: calendar month slice (fail-closed quotaLimit = 0)
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }

  // Find or create the period record
  let period = await prisma.labWhatsAppQuotaPeriod.findUnique({
    where: {
      labId_periodStart_periodEnd: {
        labId,
        periodStart,
        periodEnd,
      },
    },
  });

  if (!period) {
    const quotaLimit = entitlement.canUseSharedWhatsApp ? entitlement.monthlySharedWhatsAppQuota : 0;
    try {
      period = await prisma.labWhatsAppQuotaPeriod.create({
        data: {
          labId,
          periodStart,
          periodEnd,
          quotaLimit,
          messagesReserved: 0,
          messagesConfirmed: 0,
        },
      });
    } catch {
      // Handle concurrent insert collision
      period = await prisma.labWhatsAppQuotaPeriod.findUniqueOrThrow({
        where: {
          labId_periodStart_periodEnd: {
            labId,
            periodStart,
            periodEnd,
          },
        },
      });
    }
  }

  return { period, entitlement };
}

/**
 * Retrieves the current quota usage summary for a laboratory.
 */
export async function getLabQuotaUsage(labId: string): Promise<LabQuotaUsageSummary> {
  const { period } = await getOrCreateCurrentQuotaPeriod(labId);

  const available = Math.max(0, period.quotaLimit - (period.messagesReserved + period.messagesConfirmed));
  const isExhausted = available <= 0;

  return {
    periodId: period.id,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    quotaLimit: period.quotaLimit,
    messagesReserved: period.messagesReserved,
    messagesConfirmed: period.messagesConfirmed,
    messagesAvailable: available,
    isExhausted,
  };
}

function getQuotaPeriodTableName(): string {
  try {
    const url = process.env.DATABASE_URL || "";
    const match = url.match(/[?&]schema=([^&]+)/);
    if (match && match[1] && match[1].trim() && match[1].trim() !== "public") {
      const clean = match[1].trim().replace(/[^a-zA-Z0-9_]/g, "");
      return `"${clean}"."LabWhatsAppQuotaPeriod"`;
    }
  } catch {}
  return `"LabWhatsAppQuotaPeriod"`;
}

/**
 * Atomically reserves quota capacity for an outbound WhatsApp notification.
 * Concurrency-safe: uses atomic conditional updates to prevent race conditions.
 * Idempotent: duplicate requests for the same idempotency key return the cached reservation.
 */
export async function reserveQuota(params: {
  labId: string;
  idempotencyKey: string;
  recipientPhone: string;
  eventType: string;
  ttlMs?: number;
  metadata?: any;
}): Promise<QuotaReservationResult> {
  const { labId, idempotencyKey, recipientPhone, eventType, metadata } = params;
  const ttlMs = params.ttlMs ?? 15 * 60 * 1000; // 15-minute default TTL

  if (!labId || !idempotencyKey || !recipientPhone) {
    return {
      success: false,
      reason: "INVALID_INPUT",
      message: "labId, idempotencyKey, and recipientPhone are required.",
      upgradeRequired: false,
    };
  }

  // 1. Idempotency Check: Look up existing reservation
  const existing = await prisma.labWhatsAppReservation.findUnique({
    where: {
      labId_idempotencyKey: { labId, idempotencyKey },
    },
    include: { period: true },
  });

  if (existing) {
    if (existing.status === WhatsAppReservationStatus.CONFIRMED) {
      return {
        success: true,
        isDuplicate: true,
        status: existing.status,
        reservation: existing,
        period: existing.period,
        providerMessageId: existing.providerMessageId,
      };
    }

    if (
      existing.status === WhatsAppReservationStatus.RESERVED ||
      existing.status === WhatsAppReservationStatus.PENDING_RECONCILIATION
    ) {
      return {
        success: true,
        isDuplicate: true,
        status: existing.status,
        reservation: existing,
        period: existing.period,
      };
    }
  }

  // 2. Authorize plan entitlement
  const entitlement = await resolveLabWhatsAppEntitlement(labId);
  if (!entitlement.canUseSharedWhatsApp || entitlement.monthlySharedWhatsAppQuota <= 0) {
    return {
      success: false,
      reason: "NOT_ENTITLED",
      message: `Laboratory plan (${entitlement.planName || "Unassigned"}) is not entitled to Gyrex Shared WhatsApp notifications.`,
      upgradeRequired: true,
      entitlement,
    };
  }

  // 3. Resolve active quota period
  const { period } = await getOrCreateCurrentQuotaPeriod(labId);

  // 4. Atomic conditional reservation inside transaction
  const expiresAt = new Date(Date.now() + ttlMs);
  const periodTable = getQuotaPeriodTableName();

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Atomic capacity check and reservation update
        const affected = await tx.$executeRawUnsafe(
          `UPDATE ${periodTable}
           SET "messagesReserved" = "messagesReserved" + 1,
               "updatedAt" = NOW()
           WHERE "id" = $1
             AND ("messagesReserved" + "messagesConfirmed") < "quotaLimit"`,
          period.id
        );

        if (affected === 0) {
          return {
            success: false,
            reason: "QUOTA_EXHAUSTED",
            message: `Monthly shared WhatsApp message quota (${period.quotaLimit}) exhausted for this period.`,
            upgradeRequired: true,
            entitlement,
          } as QuotaReservationFailure;
        }

        // Persist durable reservation record
        let reservation: LabWhatsAppReservation;
        if (existing) {
          // Re-activating a previously released / failed reservation row
          reservation = await tx.labWhatsAppReservation.update({
            where: { id: existing.id },
            data: {
              periodId: period.id,
              status: WhatsAppReservationStatus.RESERVED,
              recipientPhone,
              eventType,
              reservedAt: new Date(),
              expiresAt,
              confirmedAt: null,
              releasedAt: null,
              reconciledAt: null,
              failureReason: null,
              metadata: metadata || null,
            },
          });
        } else {
          reservation = await tx.labWhatsAppReservation.create({
            data: {
              labId,
              periodId: period.id,
              idempotencyKey,
              status: WhatsAppReservationStatus.RESERVED,
              recipientPhone,
              eventType,
              reservedAt: new Date(),
              expiresAt,
              metadata: metadata || null,
            },
          });
        }

        const updatedPeriod = await tx.labWhatsAppQuotaPeriod.findUniqueOrThrow({
          where: { id: period.id },
        });

        return {
          success: true,
          isDuplicate: false,
          status: WhatsAppReservationStatus.RESERVED,
          reservation,
          period: updatedPeriod,
        } as QuotaReservationSuccess;
      },
      { maxWait: 10000, timeout: 15000 }
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      // Handle simultaneous race condition where another concurrent worker inserted the reservation
      const committedReservation = await prisma.labWhatsAppReservation.findUnique({
        where: {
          labId_idempotencyKey: { labId, idempotencyKey },
        },
        include: { period: true },
      });

      if (committedReservation) {
        return {
          success: true,
          isDuplicate: true,
          status: committedReservation.status,
          reservation: committedReservation,
          period: committedReservation.period,
          providerMessageId: committedReservation.providerMessageId,
        };
      }
    }
    // Re-throw any other database or unexpected error
    throw error;
  }
}

/**
 * Confirms a quota reservation after successful Meta provider acceptance (HTTP 200 + WAMID).
 * Transitions status to CONFIRMED, permanently spending 1 quota message.
 */
export async function confirmQuotaReservation(params: {
  labId: string;
  idempotencyKey: string;
  providerMessageId: string;
}): Promise<boolean> {
  const { labId, idempotencyKey, providerMessageId } = params;

  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.labWhatsAppReservation.findUnique({
      where: { labId_idempotencyKey: { labId, idempotencyKey } },
    });

    if (!reservation) {
      return false;
    }

    if (reservation.status === WhatsAppReservationStatus.CONFIRMED) {
      return true; // Already confirmed
    }

    const wasPending =
      reservation.status === WhatsAppReservationStatus.RESERVED ||
      reservation.status === WhatsAppReservationStatus.PENDING_RECONCILIATION;

    if (!wasPending) {
      return false;
    }

    // Update reservation
    await tx.labWhatsAppReservation.update({
      where: { id: reservation.id },
      data: {
        status: WhatsAppReservationStatus.CONFIRMED,
        providerMessageId,
        confirmedAt: new Date(),
      },
    });

    // Decrement reserved, increment confirmed atomically
    const periodTable = getQuotaPeriodTableName();
    await tx.$executeRawUnsafe(
      `UPDATE ${periodTable}
       SET "messagesReserved" = GREATEST(0, "messagesReserved" - 1),
           "messagesConfirmed" = "messagesConfirmed" + 1,
           "updatedAt" = NOW()
       WHERE "id" = $1`,
      reservation.periodId
    );

    return true;
  }, { maxWait: 10000, timeout: 15000 });
}

/**
 * Releases a quota reservation strictly for immediate client-side or pre-dispatch errors
 * (e.g. invalid phone number, opted-out patient) BEFORE any network request was sent to Meta.
 */
export async function releaseQuotaReservation(params: {
  labId: string;
  idempotencyKey: string;
  failureReason: string;
}): Promise<boolean> {
  const { labId, idempotencyKey, failureReason } = params;

  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.labWhatsAppReservation.findUnique({
      where: { labId_idempotencyKey: { labId, idempotencyKey } },
    });

    if (!reservation || reservation.status !== WhatsAppReservationStatus.RESERVED) {
      return false;
    }

    await tx.labWhatsAppReservation.update({
      where: { id: reservation.id },
      data: {
        status: WhatsAppReservationStatus.RELEASED,
        releasedAt: new Date(),
        failureReason,
      },
    });

    // Safely decrement reserved counter
    const periodTable = getQuotaPeriodTableName();
    await tx.$executeRawUnsafe(
      `UPDATE ${periodTable}
       SET "messagesReserved" = GREATEST(0, "messagesReserved" - 1),
           "updatedAt" = NOW()
       WHERE "id" = $1`,
      reservation.periodId
    );

    return true;
  }, { maxWait: 10000, timeout: 15000 });
}

/**
 * Transitions an ambiguous dispatch outcome (e.g. HTTP timeout, 504 Gateway Timeout)
 * to PENDING_RECONCILIATION. Does NOT release quota because Meta may have accepted the message.
 */
export async function markReservationPendingReconciliation(params: {
  labId: string;
  idempotencyKey: string;
  reason: string;
}): Promise<boolean> {
  const { labId, idempotencyKey, reason } = params;

  const reservation = await prisma.labWhatsAppReservation.findUnique({
    where: { labId_idempotencyKey: { labId, idempotencyKey } },
  });

  if (!reservation || reservation.status !== WhatsAppReservationStatus.RESERVED) {
    return false;
  }

  await prisma.labWhatsAppReservation.update({
    where: { id: reservation.id },
    data: {
      status: WhatsAppReservationStatus.PENDING_RECONCILIATION,
      failureReason: reason,
    },
  });

  return true;
}

/**
 * Reconciles an expired or pending reservation once concrete evidence is available.
 * Outcome "CONFIRMED": Verified accepted by provider (decrements reserved, increments confirmed).
 * Outcome "RECONCILED_FAILED": Verified never received by provider (safely releases reserved quota).
 */
export async function reconcileReservation(params: {
  labId: string;
  idempotencyKey: string;
  outcome: "CONFIRMED" | "RECONCILED_FAILED";
  providerMessageId?: string;
  failureReason?: string;
}): Promise<boolean> {
  const { labId, idempotencyKey, outcome, providerMessageId, failureReason } = params;

  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.labWhatsAppReservation.findUnique({
      where: { labId_idempotencyKey: { labId, idempotencyKey } },
    });

    if (
      !reservation ||
      (reservation.status !== WhatsAppReservationStatus.RESERVED &&
        reservation.status !== WhatsAppReservationStatus.PENDING_RECONCILIATION)
    ) {
      return false;
    }

    const periodTable = getQuotaPeriodTableName();

    if (outcome === "CONFIRMED") {
      await tx.labWhatsAppReservation.update({
        where: { id: reservation.id },
        data: {
          status: WhatsAppReservationStatus.CONFIRMED,
          providerMessageId: providerMessageId || reservation.providerMessageId,
          confirmedAt: new Date(),
          reconciledAt: new Date(),
        },
      });

      await tx.$executeRawUnsafe(
        `UPDATE ${periodTable}
         SET "messagesReserved" = GREATEST(0, "messagesReserved" - 1),
             "messagesConfirmed" = "messagesConfirmed" + 1,
             "updatedAt" = NOW()
         WHERE "id" = $1`,
        reservation.periodId
      );
    } else {
      await tx.labWhatsAppReservation.update({
        where: { id: reservation.id },
        data: {
          status: WhatsAppReservationStatus.RECONCILED_FAILED,
          reconciledAt: new Date(),
          failureReason: failureReason || "Reconciled as failed",
        },
      });

      await tx.$executeRawUnsafe(
        `UPDATE ${periodTable}
         SET "messagesReserved" = GREATEST(0, "messagesReserved" - 1),
             "updatedAt" = NOW()
         WHERE "id" = $1`,
        reservation.periodId
      );
    }

    return true;
  }, { maxWait: 10000, timeout: 15000 });
}

/**
 * MANDATORY SAFETY CORRECTION 1:
 * Expired reservations must enter reconciliation.
 * NEVER automatically releases quota solely because a TTL elapsed or process crashed.
 * Transitions expired RESERVED rows to PENDING_RECONCILIATION for safe inspection.
 */
export async function reconcileExpiredReservations(
  labId?: string
): Promise<{ transitionedToPending: number }> {
  const now = new Date();

  const whereClause: any = {
    status: WhatsAppReservationStatus.RESERVED,
    expiresAt: { lt: now },
  };

  if (labId) {
    whereClause.labId = labId;
  }

  const result = await prisma.labWhatsAppReservation.updateMany({
    where: whereClause,
    data: {
      status: WhatsAppReservationStatus.PENDING_RECONCILIATION,
      failureReason: "Reservation TTL elapsed without provider confirmation (Awaiting Reconciliation)",
    },
  });

  return { transitionedToPending: result.count };
}
