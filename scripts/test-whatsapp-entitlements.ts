/**
 * Gyrex Labs - WhatsApp Subscription Entitlements & Quota Foundation Test Suite
 *
 * Verifies all Phase 1 requirements:
 *  1. Eligible shared plan resolves to SHARED (canUseSharedWhatsApp = true, canConfigureCustomWaba = false).
 *  2. Eligible custom WABA plan resolves to CUSTOM_WABA (canConfigureCustomWaba = true, canUseSharedWhatsApp = false).
 *  3. Ineligible plan cannot reserve shared quota.
 *  4. Ineligible plan cannot access custom Meta configuration (assertLabCanConfigureCustomWaba throws 403).
 *  5. Credentials alone do not grant premium access (stored credentials fail-closed without plan entitlement).
 *  6. Expired, cancelled, or past-due subscriptions cannot perform operations (fail-closed).
 *  7. Zero quota prevents shared reservations.
 *  8. Two concurrent requests competing for the final quota slot cannot both succeed (race-condition safety).
 *  9. Duplicate idempotency keys cannot reserve quota twice (idempotency deduplication).
 * 10. Immediate pre-dispatch failures can be released safely (releaseQuotaReservation).
 * 11. Provider acceptance (confirmQuotaReservation) transitions status to CONFIRMED and records providerMessageId.
 * 12. Ambiguous external results transition to PENDING_RECONCILIATION without prematurely releasing quota.
 * 13. Expired reservations enter reconciliation (reconcileExpiredReservations) and NEVER auto-release.
 * 14. Plan quota change does not alter existing/historical period snapshot limits.
 * 15. Cross-tenant isolation prevents accessing another laboratory's quota.
 * 16. Existing PlatformSettings, webhook tokens, and opt-outs remain untouched.
 */

import { prisma } from "../lib/db/prisma";
import {
  SubscriptionStatus,
  BillingCycle,
  WhatsAppReservationStatus,
  UserRole,
} from "@prisma/client";
import {
  resolveLabWhatsAppEntitlement,
  assertLabCanConfigureCustomWaba,
  assertLabCanUseSharedWhatsApp,
} from "../services/integrations/whatsapp/whatsapp-entitlement-service";
import {
  reserveQuota,
  confirmQuotaReservation,
  releaseQuotaReservation,
  markReservationPendingReconciliation,
  reconcileReservation,
  reconcileExpiredReservations,
  getOrCreateCurrentQuotaPeriod,
  getLabQuotaUsage,
  calculateQuotaWindowBoundaries,
} from "../services/integrations/whatsapp/whatsapp-quota-service";
import { whatsAppService } from "../services/integrations/whatsapp/whatsapp-service";
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
} from "../services/superadmin/subscriptions-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 Gyrex Labs - WhatsApp Subscription Entitlements & Quota Foundation Test Suite");
  console.log("================================================================================\n");

  const testSuffix = `test_${Date.now()}`;
  const testLabId1 = `lab_entitle_${testSuffix}_1`;
  const testLabId2 = `lab_entitle_${testSuffix}_2`;
  const testPlanSharedId = `plan_shared_${testSuffix}`;
  const testPlanCustomId = `plan_custom_${testSuffix}`;
  const testPlanZeroQuotaId = `plan_zero_${testSuffix}`;
  const testAdminUserId = `user_admin_${testSuffix}`;

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("🔧 Setting up isolated test fixtures in database...");

    // Create test superadmin user for audit logs
    await prisma.user.create({
      data: {
        id: testAdminUserId,
        email: `admin_${testSuffix}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Test Superadmin",
        role: UserRole.SUPERADMIN,
      },
    });

    // Create 2 test labs
    await prisma.lab.createMany({
      data: [
        {
          id: testLabId1,
          slug: `test-lab-1-${testSuffix}`,
          name: "Test Lab One (Shared)",
          code: `TL1_${testSuffix.slice(-4)}`,
          email: `test1_${testSuffix}@example.com`,
          phone: "+91 98765 11111",
          addressLine1: "123 Test Street",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400001",
        },
        {
          id: testLabId2,
          slug: `test-lab-2-${testSuffix}`,
          name: "Test Lab Two (Custom WABA)",
          code: `TL2_${testSuffix.slice(-4)}`,
          email: `test2_${testSuffix}@example.com`,
          phone: "+91 98765 22222",
          addressLine1: "456 Test Avenue",
          city: "Pune",
          state: "Maharashtra",
          postalCode: "411001",
        },
      ],
    });

    // Create 3 test subscription plans
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    await prisma.subscriptionPlan.createMany({
      data: [
        {
          id: testPlanSharedId,
          code: `PLAN_TEST_SHARED_${testSuffix}`,
          name: "Test Growth Shared Plan",
          priceMonthly: 4999,
          priceYearly: 49990,
          canUseSharedWhatsApp: true,
          monthlySharedWhatsAppQuota: 250,
          canConfigureCustomWaba: false,
        },
        {
          id: testPlanCustomId,
          code: `PLAN_TEST_CUSTOM_${testSuffix}`,
          name: "Test Pro Custom Plan",
          priceMonthly: 9999,
          priceYearly: 99990,
          canUseSharedWhatsApp: false,
          monthlySharedWhatsAppQuota: 0,
          canConfigureCustomWaba: true,
        },
        {
          id: testPlanZeroQuotaId,
          code: `PLAN_TEST_ZERO_${testSuffix}`,
          name: "Test Zero Quota Plan",
          priceMonthly: 1999,
          priceYearly: 19990,
          canUseSharedWhatsApp: true,
          monthlySharedWhatsAppQuota: 0,
          canConfigureCustomWaba: false,
        },
      ],
    });

    // Lab 1 assigned Shared Plan
    await prisma.subscription.create({
      data: {
        labId: testLabId1,
        planId: testPlanSharedId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    // Lab 2 assigned Custom WABA Plan
    await prisma.subscription.create({
      data: {
        labId: testLabId2,
        planId: testPlanCustomId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    console.log("✅ Fixtures created successfully.\n");

    // -------------------------------------------------------------------------
    // TEST 1: Eligible shared plan resolves to SHARED
    // -------------------------------------------------------------------------
    console.log("--- Test 1 & 2: Plan Entitlement Resolution ---");
    {
      const ent1 = await resolveLabWhatsAppEntitlement(testLabId1);
      assert(
        ent1.isEntitled === true &&
        ent1.canUseSharedWhatsApp === true &&
        ent1.monthlySharedWhatsAppQuota === 250 &&
        ent1.canConfigureCustomWaba === false,
        "TC-01: Shared Plan resolves canUseSharedWhatsApp = true (250) and canConfigureCustomWaba = false"
      );

      const ent2 = await resolveLabWhatsAppEntitlement(testLabId2);
      assert(
        ent2.isEntitled === true &&
        ent2.canUseSharedWhatsApp === false &&
        ent2.monthlySharedWhatsAppQuota === 0 &&
        ent2.canConfigureCustomWaba === true,
        "TC-02: Custom WABA Plan resolves canConfigureCustomWaba = true and canUseSharedWhatsApp = false"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3 & 4: Ineligible plan blocks and enforcement guards
    // -------------------------------------------------------------------------
    console.log("\n--- Test 3 & 4: Ineligible Plan & Route Guard Enforcement ---");
    {
      // Lab 2 cannot reserve shared quota
      const res = await reserveQuota({
        labId: testLabId2,
        idempotencyKey: `idemp_${testSuffix}_1`,
        recipientPhone: "+919876543210",
        eventType: "ORDER_CONFIRMATION",
      });
      assert(
        res.success === false && res.reason === "NOT_ENTITLED",
        "TC-03: Ineligible plan cannot reserve shared quota (returns NOT_ENTITLED)"
      );

      // Lab 1 cannot configure custom Meta WABA
      let threw403 = false;
      try {
        await assertLabCanConfigureCustomWaba(testLabId1);
      } catch (err: any) {
        if (err.statusCode === 403) threw403 = true;
      }
      assert(
        threw403,
        "TC-04: Ineligible plan cannot configure custom Meta WABA (assertLabCanConfigureCustomWaba throws 403)"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: Credentials alone do not grant premium access
    // -------------------------------------------------------------------------
    console.log("\n--- Test 5: Credentials Alone Never Grant Entitlement ---");
    {
      // Store dummy credentials in PlatformSettings for Lab 1 (Basic/Growth plan)
      await prisma.platformSettings.upsert({
        where: { key: `lab_whatsapp:${testLabId1}` },
        update: {
          value: {
            phoneNumberId: "mock_phone_12345",
            accessTokenEncrypted: "mock_token_encrypted_xyz",
            status: "CONNECTED",
          },
        },
        create: {
          key: `lab_whatsapp:${testLabId1}`,
          value: {
            phoneNumberId: "mock_phone_12345",
            accessTokenEncrypted: "mock_token_encrypted_xyz",
            status: "CONNECTED",
          },
        },
      });

      let stillBlocked = false;
      try {
        await assertLabCanConfigureCustomWaba(testLabId1);
      } catch (err: any) {
        if (err.statusCode === 403) stillBlocked = true;
      }
      assert(
        stillBlocked,
        "TC-05: Existing credentials in PlatformSettings do not grant custom WABA access without plan entitlement (fail-closed)"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: Expired or cancelled subscription fails closed
    // -------------------------------------------------------------------------
    console.log("\n--- Test 6: Ineligible Subscription Lifecycle Statuses ---");
    {
      // Temporarily set Lab 2 subscription to PAST_DUE
      await prisma.subscription.update({
        where: { labId: testLabId2 },
        data: { status: SubscriptionStatus.PAST_DUE },
      });

      const entPastDue = await resolveLabWhatsAppEntitlement(testLabId2);
      assert(
        entPastDue.isEntitled === false &&
        entPastDue.canConfigureCustomWaba === false &&
        entPastDue.rejectionReason === "SUBSCRIPTION_STATUS_INELIGIBLE",
        "TC-06a: PAST_DUE subscription fails closed (isEntitled = false, rejectionReason = SUBSCRIPTION_STATUS_INELIGIBLE)"
      );

      // Set to CANCELLED
      await prisma.subscription.update({
        where: { labId: testLabId2 },
        data: { status: SubscriptionStatus.CANCELLED },
      });

      const entCancelled = await resolveLabWhatsAppEntitlement(testLabId2);
      assert(
        entCancelled.isEntitled === false &&
        entCancelled.canConfigureCustomWaba === false,
        "TC-06b: CANCELLED subscription fails closed"
      );

      // Restore to ACTIVE for remaining tests
      await prisma.subscription.update({
        where: { labId: testLabId2 },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    }

    // -------------------------------------------------------------------------
    // TEST 7: Zero quota prevents reservations
    // -------------------------------------------------------------------------
    console.log("\n--- Test 7: Zero Quota Semantics ---");
    {
      // Switch Lab 1 to zero quota plan
      await prisma.subscription.update({
        where: { labId: testLabId1 },
        data: { planId: testPlanZeroQuotaId },
      });

      const zeroRes = await reserveQuota({
        labId: testLabId1,
        idempotencyKey: `idemp_zero_${testSuffix}`,
        recipientPhone: "+919876543210",
        eventType: "ORDER_CONFIRMATION",
      });

      assert(
        zeroRes.success === false && zeroRes.reason === "NOT_ENTITLED",
        "TC-07: Plan with monthlySharedWhatsAppQuota = 0 prevents reservations (NOT_ENTITLED)"
      );

      // Restore Lab 1 to standard shared plan
      await prisma.subscription.update({
        where: { labId: testLabId1 },
        data: { planId: testPlanSharedId },
      });
    }

    // -------------------------------------------------------------------------
    // TEST 8: Concurrency Race Condition Safety
    // -------------------------------------------------------------------------
    console.log("\n--- Test 8: Concurrency & Atomic Quota Protection ---");
    {
      // Create a dedicated quota period for Lab 1 with a tight quotaLimit = 2
      const testPeriodStart = new Date(Date.UTC(2028, 0, 1));
      const testPeriodEnd = new Date(Date.UTC(2028, 1, 1));

      const tightPeriod = await prisma.labWhatsAppQuotaPeriod.create({
        data: {
          labId: testLabId1,
          periodStart: testPeriodStart,
          periodEnd: testPeriodEnd,
          quotaLimit: 2,
          messagesReserved: 0,
          messagesConfirmed: 0,
        },
      });

      // Override the current subscription boundaries to match this period for testing
      await prisma.subscription.update({
        where: { labId: testLabId1 },
        data: {
          currentPeriodStart: testPeriodStart,
          currentPeriodEnd: testPeriodEnd,
        },
      });

      // Fire 6 concurrent reservation requests simultaneously
      const parallelKeys = Array.from({ length: 6 }, (_, i) => `concurrent_${testSuffix}_${i}`);
      const results = await Promise.all(
        parallelKeys.map((key) =>
          reserveQuota({
            labId: testLabId1,
            idempotencyKey: key,
            recipientPhone: "+919876543210",
            eventType: "ORDER_CONFIRMATION",
          })
        )
      );

      const successful = results.filter((r) => r.success === true);
      const exhausted = results.filter((r) => r.success === false && r.reason === "QUOTA_EXHAUSTED");

      assert(
        successful.length === 2 && exhausted.length === 4,
        "TC-08: Concurrency guard: Exactly 2 of 6 concurrent requests succeed when quotaLimit is 2; remaining 4 return QUOTA_EXHAUSTED"
      );

      // Clean up tight period reservations
      await prisma.labWhatsAppReservation.deleteMany({
        where: { periodId: tightPeriod.id },
      });
      await prisma.labWhatsAppQuotaPeriod.delete({
        where: { id: tightPeriod.id },
      });

      // Restore Lab 1 subscription boundaries
      await prisma.subscription.update({
        where: { labId: testLabId1 },
        data: {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      // Allow Neon connection pool to settle after parallel transaction burst
      await new Promise((r) => setTimeout(r, 300));
    }

    // -------------------------------------------------------------------------
    // TEST 9: Idempotency Deduplication
    // -------------------------------------------------------------------------
    console.log("\n--- Test 9: Idempotency Deduplication ---");
    {
      const idempKey = `idemp_dedup_${testSuffix}`;

      // First reservation
      const res1 = await reserveQuota({
        labId: testLabId1,
        idempotencyKey: idempKey,
        recipientPhone: "+919876543210",
        eventType: "ORDER_CONFIRMATION",
      });
      assert(res1.success === true && res1.isDuplicate === false, "TC-09a: Initial reservation succeeds (isDuplicate = false)");

      // Duplicate reservation with identical key
      const res2 = await reserveQuota({
        labId: testLabId1,
        idempotencyKey: idempKey,
        recipientPhone: "+919876543210",
        eventType: "ORDER_CONFIRMATION",
      });
      assert(
        res2.success === true && res2.isDuplicate === true && res2.status === WhatsAppReservationStatus.RESERVED,
        "TC-09b: Duplicate reservation returns cached reservation without deducting extra quota (isDuplicate = true)"
      );

      // Simultaneous near-instant race with identical idempotency key (Prisma P2002 handling)
      const raceKey = `idemp_race_${testSuffix}`;
      const [raceRes1, raceRes2] = await Promise.all([
        reserveQuota({
          labId: testLabId1,
          idempotencyKey: raceKey,
          recipientPhone: "+919876543210",
          eventType: "ORDER_CONFIRMATION",
        }),
        reserveQuota({
          labId: testLabId1,
          idempotencyKey: raceKey,
          recipientPhone: "+919876543210",
          eventType: "ORDER_CONFIRMATION",
        }),
      ]);

      const bothSucceeded = raceRes1.success && raceRes2.success;
      const oneInitialOneDuplicate =
        bothSucceeded &&
        ((!raceRes1.isDuplicate && raceRes2.isDuplicate) || (raceRes1.isDuplicate && !raceRes2.isDuplicate));

      assert(
        oneInitialOneDuplicate,
        "TC-09c: Simultaneous requests with identical idempotencyKey resolve safely without P2002 crash (one initial, one duplicate)"
      );

      const raceReservations = await prisma.labWhatsAppReservation.findMany({
        where: { labId: testLabId1, idempotencyKey: raceKey },
      });
      assert(
        raceReservations.length === 1,
        "TC-09d: Simultaneous race condition creates exactly one reservation record in database"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: Safe Reservation Release
    // -------------------------------------------------------------------------
    console.log("\n--- Test 10: Pre-Dispatch Safe Release ---");
    {
      const releaseKey = `idemp_release_${testSuffix}`;
      const res = await reserveQuota({
        labId: testLabId1,
        idempotencyKey: releaseKey,
        recipientPhone: "+919876543210",
        eventType: "ORDER_CONFIRMATION",
      });
      assert(res.success === true, "TC-10a: Reservation created for release test");

      const usageBefore = await getLabQuotaUsage(testLabId1);
      const released = await releaseQuotaReservation({
        labId: testLabId1,
        idempotencyKey: releaseKey,
        failureReason: "Recipient patient opted out before dispatch",
      });
      const usageAfter = await getLabQuotaUsage(testLabId1);

      assert(
        released === true && usageAfter.messagesReserved === usageBefore.messagesReserved - 1,
        "TC-10b: releaseQuotaReservation decrements messagesReserved and restores capacity safely"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 11: Provider Acceptance Confirmation
    // -------------------------------------------------------------------------
    console.log("\n--- Test 11: Provider Acceptance (Confirmation) ---");
    {
      const confirmKey = `idemp_confirm_${testSuffix}`;
      await reserveQuota({
        labId: testLabId1,
        idempotencyKey: confirmKey,
        recipientPhone: "+919876543210",
        eventType: "ORDER_CONFIRMATION",
      });

      const usageBefore = await getLabQuotaUsage(testLabId1);
      const confirmed = await confirmQuotaReservation({
        labId: testLabId1,
        idempotencyKey: confirmKey,
        providerMessageId: "wamid.HBgLMTIzNDU2Nzg5MA==",
      });
      const usageAfter = await getLabQuotaUsage(testLabId1);

      assert(
        confirmed === true &&
        usageAfter.messagesReserved === usageBefore.messagesReserved - 1 &&
        usageAfter.messagesConfirmed === usageBefore.messagesConfirmed + 1,
        "TC-11: confirmQuotaReservation transitions to CONFIRMED, decrements messagesReserved, and increments messagesConfirmed"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 12: Ambiguous Timeout Retains Capacity in Reconciliation
    // -------------------------------------------------------------------------
    console.log("\n--- Test 12: Ambiguous Network Timeout Safety ---");
    {
      const timeoutKey = `idemp_timeout_${testSuffix}`;
      await reserveQuota({
        labId: testLabId1,
        idempotencyKey: timeoutKey,
        recipientPhone: "+919876543210",
        eventType: "REPORT_READY",
      });

      const usageBefore = await getLabQuotaUsage(testLabId1);
      const marked = await markReservationPendingReconciliation({
        labId: testLabId1,
        idempotencyKey: timeoutKey,
        reason: "Meta Graph API HTTP 504 Gateway Timeout",
      });
      const usageAfter = await getLabQuotaUsage(testLabId1);

      assert(
        marked === true && usageAfter.messagesReserved === usageBefore.messagesReserved,
        "TC-12: Network timeout transitions to PENDING_RECONCILIATION without releasing reserved quota"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 13: Mandatory Safety Correction 1 - Expired TTL Never Auto-Releases
    // -------------------------------------------------------------------------
    console.log("\n--- Test 13: Mandatory Safety Rule 1 - Expired Reservations Reconciled ---");
    {
      const expiredKey = `idemp_expired_${testSuffix}`;
      // Reserve with negative TTL so it is already expired
      await reserveQuota({
        labId: testLabId1,
        idempotencyKey: expiredKey,
        recipientPhone: "+919876543210",
        eventType: "ORDER_CONFIRMATION",
        ttlMs: -1000,
      });

      const usageBefore = await getLabQuotaUsage(testLabId1);
      const reapResult = await reconcileExpiredReservations(testLabId1);
      const usageAfter = await getLabQuotaUsage(testLabId1);

      // Verify status changed to PENDING_RECONCILIATION, NOT released
      const record = await prisma.labWhatsAppReservation.findUnique({
        where: { labId_idempotencyKey: { labId: testLabId1, idempotencyKey: expiredKey } },
      });

      assert(
        reapResult.transitionedToPending >= 1 &&
        record?.status === WhatsAppReservationStatus.PENDING_RECONCILIATION &&
        usageAfter.messagesReserved === usageBefore.messagesReserved,
        "TC-13: Expired reservations transition to PENDING_RECONCILIATION and are NEVER auto-released"
      );

      // Test concrete reconciliation: now verify it reconciles once evidence is available
      const reconciled = await reconcileReservation({
        labId: testLabId1,
        idempotencyKey: expiredKey,
        outcome: "RECONCILED_FAILED",
        failureReason: "Meta webhook verified message 404 / never arrived",
      });
      const usageFinal = await getLabQuotaUsage(testLabId1);

      assert(
        reconciled === true && usageFinal.messagesReserved === usageAfter.messagesReserved - 1,
        "TC-13b: Concrete reconciliation with failure evidence safely restores reserved capacity"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 14: Historical Ledger Snapshot Immutability
    // -------------------------------------------------------------------------
    console.log("\n--- Test 14: Historical Period Snapshot Immutability ---");
    {
      const { period: currentPeriod } = await getOrCreateCurrentQuotaPeriod(testLabId1);
      const originalLimit = currentPeriod.quotaLimit;

      // Update plan's monthlySharedWhatsAppQuota in SubscriptionPlan from 250 to 500
      await prisma.subscriptionPlan.update({
        where: { id: testPlanSharedId },
        data: { monthlySharedWhatsAppQuota: 500 },
      });

      // Refetch the current period
      const refetchedPeriod = await prisma.labWhatsAppQuotaPeriod.findUniqueOrThrow({
        where: { id: currentPeriod.id },
      });

      assert(
        refetchedPeriod.quotaLimit === originalLimit,
        "TC-14: Updating plan quota in SubscriptionPlan does not corrupt existing period snapshot quotaLimit"
      );

      // Restore plan quota
      await prisma.subscriptionPlan.update({
        where: { id: testPlanSharedId },
        data: { monthlySharedWhatsAppQuota: 250 },
      });
    }

    // -------------------------------------------------------------------------
    // TEST 15: Cross-Tenant Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- Test 15: Tenant Isolation ---");
    {
      // Attempting to resolve Lab 1 reservation under Lab 2 key
      const record = await prisma.labWhatsAppReservation.findUnique({
        where: {
          labId_idempotencyKey: {
            labId: testLabId2,
            idempotencyKey: `idemp_dedup_${testSuffix}`, // Created for Lab 1
          },
        },
      });

      assert(
        record === null,
        "TC-15: Cross-tenant isolation: Laboratory 2 cannot access Laboratory 1 reservations"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 16: Existing Settings & Opt-Out Records Preserved
    // -------------------------------------------------------------------------
    console.log("\n--- Test 16: Preservation of Existing WhatsApp Settings & Opt-Outs ---");
    {
      // Verify opt-out API still operates cleanly without interference
      const testOptOutPhone = "+91 99887 76655";
      await whatsAppService.optOutPatient(testLabId1, testOptOutPhone);
      const isOpted = await whatsAppService.isPatientOptedOut(testLabId1, testOptOutPhone);

      assert(
        isOpted === true,
        "TC-16: Existing PlatformSettings opt-out management operates normally alongside new quota ledger"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 17: Superadmin Plan Quota Validation (Fix 2)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 17: Superadmin Plan Quota Integer Validation ---");
    {
      const dummyActor = {
        userId: testAdminUserId,
        email: `admin_${testSuffix}@example.com`,
        fullName: "Test Superadmin",
        role: UserRole.SUPERADMIN,
        labMemberships: [],
      };

      // 17a: Float quota in createSubscriptionPlan rejected
      let createFloatFailed = false;
      try {
        await createSubscriptionPlan(
          {
            name: "Float Plan",
            code: `PLAN_FLOAT_${testSuffix}`,
            priceMonthly: 1000,
            priceYearly: 10000,
            monthlySharedWhatsAppQuota: 250.5,
          },
          dummyActor
        );
      } catch (e: any) {
        if (e.message.includes("non-negative integer")) {
          createFloatFailed = true;
        }
      }
      assert(
        createFloatFailed,
        "TC-17a: createSubscriptionPlan rejects fractional float monthlySharedWhatsAppQuota (250.5)"
      );

      // 17b: Negative quota in createSubscriptionPlan rejected
      let createNegativeFailed = false;
      try {
        await createSubscriptionPlan(
          {
            name: "Negative Plan",
            code: `PLAN_NEG_${testSuffix}`,
            priceMonthly: 1000,
            priceYearly: 10000,
            monthlySharedWhatsAppQuota: -10,
          },
          dummyActor
        );
      } catch (e: any) {
        if (e.message.includes("non-negative integer")) {
          createNegativeFailed = true;
        }
      }
      assert(
        createNegativeFailed,
        "TC-17b: createSubscriptionPlan rejects negative monthlySharedWhatsAppQuota (-10)"
      );

      // 17c: Float quota in updateSubscriptionPlan rejected
      let updateFloatFailed = false;
      try {
        await updateSubscriptionPlan(
          testPlanSharedId,
          {
            monthlySharedWhatsAppQuota: 99.9,
          },
          dummyActor
        );
      } catch (e: any) {
        if (e.message.includes("non-negative integer")) {
          updateFloatFailed = true;
        }
      }
      assert(
        updateFloatFailed,
        "TC-17c: updateSubscriptionPlan rejects fractional float monthlySharedWhatsAppQuota (99.9)"
      );

      // 17d: Valid integer quota in updateSubscriptionPlan accepted
      const updatedPlan = await updateSubscriptionPlan(
        testPlanSharedId,
        {
          monthlySharedWhatsAppQuota: 300,
        },
        dummyActor
      );
      assert(
        updatedPlan.monthlySharedWhatsAppQuota === 300,
        "TC-17d: updateSubscriptionPlan accepts valid non-negative integer monthlySharedWhatsAppQuota (300)"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 18: Custom WABA Enable Guard Without Credentials (Fix 3)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 18: Custom WABA isEnabled: true Guard ---");
    {
      // Simulate request body from client: { isEnabled: true } without credentials
      const bodyWithOnlyIsEnabled = { isEnabled: true };
      const isConfiguringMetaCredentials = Boolean(
        (bodyWithOnlyIsEnabled as any).wabaId?.trim() ||
        (bodyWithOnlyIsEnabled as any).phoneNumberId?.trim() ||
        (bodyWithOnlyIsEnabled as any).accessToken?.trim() ||
        (bodyWithOnlyIsEnabled as any).appSecret?.trim()
      );
      const isEnablingCustomWaba = bodyWithOnlyIsEnabled.isEnabled === true;

      let enableBlocked = false;
      if (isConfiguringMetaCredentials || isEnablingCustomWaba) {
        try {
          await assertLabCanConfigureCustomWaba(testLabId1); // Lab 1 is on shared plan (no custom WABA)
        } catch (err: any) {
          if (err.statusCode === 403) {
            enableBlocked = true;
          }
        }
      }

      assert(
        enableBlocked,
        "TC-18: Enabling custom WABA (isEnabled = true) without credentials on ineligible plan throws 403"
      );
    }

  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("\n🧹 Cleaning up test fixtures from database...");
    try {
      await prisma.labWhatsAppReservation.deleteMany({
        where: { labId: { in: [testLabId1, testLabId2] } },
      });
      await prisma.labWhatsAppQuotaPeriod.deleteMany({
        where: { labId: { in: [testLabId1, testLabId2] } },
      });
      await prisma.platformSettings.deleteMany({
        where: {
          key: {
            in: [
              `lab_whatsapp:${testLabId1}`,
              `lab_whatsapp:${testLabId2}`,
              `lab_whatsapp_optouts:${testLabId1}`,
              `lab_whatsapp_optouts:${testLabId2}`,
            ],
          },
        },
      });
      await prisma.subscription.deleteMany({
        where: { labId: { in: [testLabId1, testLabId2] } },
      });
      await prisma.subscriptionPlan.deleteMany({
        where: { id: { in: [testPlanSharedId, testPlanCustomId, testPlanZeroQuotaId] } },
      });
      await prisma.lab.deleteMany({
        where: { id: { in: [testLabId1, testLabId2] } },
      });
      await prisma.auditLog.deleteMany({
        where: { actorUserId: testAdminUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testAdminUserId },
      });
      console.log("✅ Cleanup complete.");
    } catch (cleanupErr) {
      console.error("⚠️ Cleanup notice:", cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log("\n================================================================================");
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(async (err) => {
  console.error("❌ Fatal error in test runner:", err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
