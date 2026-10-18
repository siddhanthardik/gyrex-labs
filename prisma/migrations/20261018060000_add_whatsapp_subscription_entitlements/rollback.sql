-- ============================================================
-- GYREX LABS - SAFE ROLLBACK SCRIPT
-- Migration: 20261018060000_add_whatsapp_subscription_entitlements
--
-- Safety Notice:
-- This script safely drops only the new tables and columns added by
-- the WhatsApp entitlement foundation migration.
-- Existing lab settings, credentials, opt-outs, and core tables remain intact.
-- Per safety policy, this script does NOT alter _prisma_migrations.
-- ============================================================

-- Drop new tables (CASCADE removes foreign keys and indexes)
DROP TABLE IF EXISTS "LabWhatsAppReservation" CASCADE;
DROP TABLE IF EXISTS "LabWhatsAppQuotaPeriod" CASCADE;

-- Remove new columns from SubscriptionPlan
ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "canUseSharedWhatsApp";
ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "monthlySharedWhatsAppQuota";
ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "canConfigureCustomWaba";

-- Drop new enum
DROP TYPE IF EXISTS "WhatsAppReservationStatus";
