-- CreateEnum
CREATE TYPE "WhatsAppReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED', 'PENDING_RECONCILIATION', 'RECONCILED_FAILED');

-- AlterTable SubscriptionPlan
ALTER TABLE "SubscriptionPlan" ADD COLUMN "canUseSharedWhatsApp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "monthlySharedWhatsAppQuota" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "canConfigureCustomWaba" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable LabWhatsAppQuotaPeriod
CREATE TABLE "LabWhatsAppQuotaPeriod" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "quotaLimit" INTEGER NOT NULL,
    "messagesReserved" INTEGER NOT NULL DEFAULT 0,
    "messagesConfirmed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabWhatsAppQuotaPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable LabWhatsAppReservation
CREATE TABLE "LabWhatsAppReservation" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "WhatsAppReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "recipientPhone" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "LabWhatsAppReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabWhatsAppQuotaPeriod_labId_periodStart_periodEnd_key" ON "LabWhatsAppQuotaPeriod"("labId", "periodStart", "periodEnd");
CREATE INDEX "LabWhatsAppQuotaPeriod_labId_idx" ON "LabWhatsAppQuotaPeriod"("labId");
CREATE UNIQUE INDEX "LabWhatsAppReservation_labId_idempotencyKey_key" ON "LabWhatsAppReservation"("labId", "idempotencyKey");
CREATE INDEX "LabWhatsAppReservation_periodId_status_idx" ON "LabWhatsAppReservation"("periodId", "status");
CREATE INDEX "LabWhatsAppReservation_labId_status_idx" ON "LabWhatsAppReservation"("labId", "status");
CREATE INDEX "LabWhatsAppReservation_expiresAt_idx" ON "LabWhatsAppReservation"("expiresAt");

-- AddForeignKey
ALTER TABLE "LabWhatsAppQuotaPeriod" ADD CONSTRAINT "LabWhatsAppQuotaPeriod_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabWhatsAppReservation" ADD CONSTRAINT "LabWhatsAppReservation_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabWhatsAppReservation" ADD CONSTRAINT "LabWhatsAppReservation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "LabWhatsAppQuotaPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Apply initial reviewed defaults to known seed plans
UPDATE "SubscriptionPlan"
SET "canUseSharedWhatsApp" = true, "monthlySharedWhatsAppQuota" = 250, "canConfigureCustomWaba" = false
WHERE "code" = 'PLAN_GROWTH';

UPDATE "SubscriptionPlan"
SET "canUseSharedWhatsApp" = false, "monthlySharedWhatsAppQuota" = 0, "canConfigureCustomWaba" = true
WHERE "code" = 'PLAN_PRO';

UPDATE "SubscriptionPlan"
SET "canUseSharedWhatsApp" = false, "monthlySharedWhatsAppQuota" = 0, "canConfigureCustomWaba" = true
WHERE "code" = 'PLAN_ENTERPRISE';
