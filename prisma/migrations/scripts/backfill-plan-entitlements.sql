-- ==============================================================================
-- GYREX LABS — SUBSCRIPTION PLAN CUSTOM DOMAIN ENTITLEMENT BACKFILL
-- ==============================================================================
-- Purpose:
-- Safely enables customDomainEnabled on approved subscription plans in production.
-- As per Gyrex Labs Security Audit (Fix 5), the column defaults to FALSE for all plans
-- to prevent silent, unintentional activation of custom domains across paid subscribers.
--
-- Review plan packaging before running this script in production:
-- - PLAN_PRO: Professional Diagnostic Tier (Custom Domain Enabled)
-- - PLAN_ENTERPRISE: Multi-Branch Enterprise Diagnostic Tier (Custom Domain Enabled)
-- - PLAN_GROWTH: Growth Tier (Custom Domain Disabled by default)
-- - PLAN_STARTER: Starter Tier (Custom Domain Disabled by default)
-- ==============================================================================

BEGIN;

-- 1. Inspect existing plan state
SELECT id, code, name, "customDomainEnabled"
FROM "SubscriptionPlan"
ORDER BY code ASC;

-- 2. Explicitly update approved plans only
UPDATE "SubscriptionPlan"
SET "customDomainEnabled" = true
WHERE code IN ('PLAN_PRO', 'PLAN_ENTERPRISE');

-- 3. Verify updated state
SELECT id, code, name, "customDomainEnabled"
FROM "SubscriptionPlan"
ORDER BY code ASC;

COMMIT;
