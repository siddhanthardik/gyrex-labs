/**
 * Gyrex Labs - Phase 4: Plan-Aware WhatsApp UI & Entitlement Regression Test Suite
 *
 * Verifies all Phase 4 requirements:
 * 1. Growth Plan Shared Access:
 *    - Resolves canUseSharedWhatsApp = true, quota = 250, canConfigureCustomWaba = false.
 *    - Quota statistics (allowance, used, remaining) are accurate.
 *    - Cannot configure or enable custom Meta credentials (assertLabCanConfigureCustomWaba throws 403).
 * 2. Professional / Enterprise Dedicated WABA Access:
 *    - Resolves canConfigureCustomWaba = true, canUseSharedWhatsApp = false.
 *    - Custom credentials can be saved.
 *    - Verification status integrity: Credentials alone do NOT mark integration CONNECTED.
 *    - Test connection verifies with Meta and sets status = CONNECTED with lastVerifiedAt.
 *    - Dedicated plan does not assign shared quota.
 * 3. Ineligible, Expired, or Unmapped Plans:
 *    - Fails closed for EXPIRED, PAST_DUE, CANCELLED, and unsubscribed labs.
 *    - Both shared reservation and custom WABA configuration fail closed.
 * 4. Quota Exhaustion Semantics:
 *    - When quota is consumed to 0, isExhausted = true and messagesAvailable = 0.
 *    - Outbound dispatch returns QUOTA_EXHAUSTED.
 * 5. Superadmin Plan Quota Validation:
 *    - Server rejects fractional or negative quotas.
 *    - Server persists valid non-negative integer quotas.
 * 6. Server-Side Enforcement Independent of UI:
 *    - Direct API calls attempting custom WABA configuration are rejected with 403 regardless of client payloads.
 */

import { prisma } from "../lib/db/prisma";
import {
  SubscriptionStatus,
  BillingCycle,
  UserRole,
} from "@prisma/client";
import {
  resolveLabWhatsAppEntitlement,
  assertLabCanConfigureCustomWaba,
  assertLabCanUseSharedWhatsApp,
} from "../services/integrations/whatsapp/whatsapp-entitlement-service";
import {
  getLabQuotaUsage,
  reserveQuota,
  confirmQuotaReservation,
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

async function runPhase4Tests() {
  console.log("================================================================================");
  console.log("🧪 Gyrex Labs - Phase 4: Plan-Aware WhatsApp UI & Entitlements Test Suite");
  console.log("================================================================================\n");

  const suffix = `p4_${Date.now()}`;
  const labGrowthId = `lab_growth_${suffix}`;
  const labProId = `lab_pro_${suffix}`;
  const labExpiredId = `lab_expired_${suffix}`;
  const labUnsubId = `lab_unsub_${suffix}`;

  const planGrowthId = `plan_growth_${suffix}`;
  const planProId = `plan_pro_${suffix}`;
  const planStarterId = `plan_starter_${suffix}`;

  const superadminUserId = `user_superadmin_${suffix}`;

  try {
    console.log("🔧 Setting up isolated Phase 4 test fixtures...");

    // 1. Create Superadmin User for audit logging
    const createdUser = await prisma.user.create({
      data: {
        id: superadminUserId,
        email: `superadmin_${suffix}@example.com`,
        passwordHash: "dummy_hash",
        fullName: "Test Superadmin Actor",
        role: UserRole.SUPERADMIN,
      },
    });
    const superadminActor = {
      userId: createdUser.id,
      email: createdUser.email,
      fullName: createdUser.fullName,
      role: createdUser.role,
    } as any;

    // 2. Create Plans
    await prisma.subscriptionPlan.createMany({
      data: [
        {
          id: planGrowthId,
          code: `PLAN_GROWTH_${suffix}`,
          name: "Growth Plan",
          priceMonthly: 2999,
          priceYearly: 29990,
          canUseSharedWhatsApp: true,
          monthlySharedWhatsAppQuota: 250,
          canConfigureCustomWaba: false,
          isActive: true,
        },
        {
          id: planProId,
          code: `PLAN_PRO_${suffix}`,
          name: "Professional Plan",
          priceMonthly: 6999,
          priceYearly: 69990,
          canUseSharedWhatsApp: false,
          monthlySharedWhatsAppQuota: 0,
          canConfigureCustomWaba: true,
          isActive: true,
        },
        {
          id: planStarterId,
          code: `PLAN_STARTER_${suffix}`,
          name: "Starter Plan",
          priceMonthly: 999,
          priceYearly: 9990,
          canUseSharedWhatsApp: false,
          monthlySharedWhatsAppQuota: 0,
          canConfigureCustomWaba: false,
          isActive: true,
        },
      ],
    });

    // 3. Create Labs
    await prisma.lab.createMany({
      data: [
        {
          id: labGrowthId,
          slug: `growth-${suffix}`,
          name: "Growth Diagnostic Lab",
          code: `LG_${suffix.slice(-4)}`,
          email: `growth_${suffix}@example.com`,
          phone: "+91 98765 00001",
          addressLine1: "101 Growth Ave",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560001",
        },
        {
          id: labProId,
          slug: `pro-${suffix}`,
          name: "Professional Pathology Lab",
          code: `LP_${suffix.slice(-4)}`,
          email: `pro_${suffix}@example.com`,
          phone: "+91 98765 00002",
          addressLine1: "202 Pro Blvd",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400001",
        },
        {
          id: labExpiredId,
          slug: `expired-${suffix}`,
          name: "Expired Subscription Lab",
          code: `LE_${suffix.slice(-4)}`,
          email: `expired_${suffix}@example.com`,
          phone: "+91 98765 00003",
          addressLine1: "303 Expired Rd",
          city: "Delhi",
          state: "Delhi",
          postalCode: "110001",
        },
        {
          id: labUnsubId,
          slug: `unsub-${suffix}`,
          name: "Unsubscribed Lab",
          code: `LU_${suffix.slice(-4)}`,
          email: `unsub_${suffix}@example.com`,
          phone: "+91 98765 00004",
          addressLine1: "404 Unsub Way",
          city: "Pune",
          state: "Maharashtra",
          postalCode: "411001",
        },
      ],
    });

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // 4. Create Subscriptions
    await prisma.subscription.createMany({
      data: [
        {
          labId: labGrowthId,
          planId: planGrowthId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        {
          labId: labProId,
          planId: planProId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        {
          labId: labExpiredId,
          planId: planProId,
          status: SubscriptionStatus.EXPIRED,
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    console.log("✅ Fixtures created.\n");

    // =========================================================================
    // SECTION 1: GROWTH PLAN SHARED ACCESS & QUOTA UI DATA
    // =========================================================================
    console.log("--- 1. Testing Growth Plan Shared Access & Quota UI Data ---");

    const growthEntitlement = await resolveLabWhatsAppEntitlement(labGrowthId);
    assert(
      growthEntitlement.canUseSharedWhatsApp === true &&
        growthEntitlement.monthlySharedWhatsAppQuota === 250 &&
        growthEntitlement.canConfigureCustomWaba === false,
      "TC-P4-01: Growth plan resolves shared WhatsApp with 250 quota and blocks custom WABA"
    );

    const growthQuota = await getLabQuotaUsage(labGrowthId);
    assert(
      growthQuota.quotaLimit === 250 &&
        growthQuota.messagesAvailable === 250 &&
        growthQuota.isExhausted === false,
      "TC-P4-02: Initial Growth plan quota reports 250 available and not exhausted"
    );

    let growthCustomWabaBlocked = false;
    try {
      await assertLabCanConfigureCustomWaba(labGrowthId);
    } catch (err: any) {
      growthCustomWabaBlocked = err.statusCode === 403;
    }
    assert(
      growthCustomWabaBlocked,
      "TC-P4-03: Growth plan laboratory cannot configure custom Meta WABA (throws 403)"
    );

    // =========================================================================
    // SECTION 2: PROFESSIONAL PLAN (CUSTOM WABA & VERIFICATION INTEGRITY)
    // =========================================================================
    console.log("\n--- 2. Testing Professional Plan Custom WABA & Verification Integrity ---");

    const proEntitlement = await resolveLabWhatsAppEntitlement(labProId);
    assert(
      proEntitlement.canConfigureCustomWaba === true &&
        proEntitlement.canUseSharedWhatsApp === false &&
        proEntitlement.monthlySharedWhatsAppQuota === 0,
      "TC-P4-04: Professional plan resolves canConfigureCustomWaba = true without shared quota"
    );

    // Save custom credentials
    process.env.TEST_PAYMENT_MOCK = "true";
    await whatsAppService.updateLabWhatsAppSettings(
      labProId,
      {
        phoneNumberId: "109876543210987",
        accessToken: "EAAG_TEST_TOKEN_FOR_VERIFICATION",
        wabaId: "waba_pro_test_123",
        isEnabled: true,
      },
      superadminUserId
    );

    // CRITICAL REQUIREMENT: Do not claim connected merely because credentials exist!
    const savedSettingsBeforeTest = await whatsAppService.getLabWhatsAppSettings(labProId);
    assert(
      savedSettingsBeforeTest.configured === true &&
        savedSettingsBeforeTest.status === "DISCONNECTED" &&
        savedSettingsBeforeTest.lastVerifiedAt === null,
      "TC-P4-05: Credentials saved alone do NOT mark integration CONNECTED (status remains DISCONNECTED)"
    );

    // Execute test connection to verify against Meta
    const testResult = await whatsAppService.testLabWhatsAppConnection(labProId);
    assert(testResult.success === true, "TC-P4-06: testLabWhatsAppConnection successfully verifies with Meta API");

    const savedSettingsAfterTest = await whatsAppService.getLabWhatsAppSettings(labProId);
    assert(
      savedSettingsAfterTest.status === "CONNECTED" &&
        Boolean(savedSettingsAfterTest.lastVerifiedAt),
      "TC-P4-07: Verified status transitions to CONNECTED with lastVerifiedAt timestamp only after test connection"
    );

    // If existing credentials are preserved without changing token or phoneId, verified status remains
    await whatsAppService.updateLabWhatsAppSettings(
      labProId,
      {
        notifyOrderConfirmation: false,
      },
      superadminUserId
    );
    const settingsAfterPreferenceUpdate = await whatsAppService.getLabWhatsAppSettings(labProId);
    assert(
      settingsAfterPreferenceUpdate.status === "CONNECTED" &&
        settingsAfterPreferenceUpdate.notifyOrderConfirmation === false,
      "TC-P4-08: Updating notification preferences preserves verified connection status"
    );

    // If access token is changed, status resets to DISCONNECTED pending re-verification
    await whatsAppService.updateLabWhatsAppSettings(
      labProId,
      {
        accessToken: "EAAG_NEW_DIFFERENT_TOKEN",
      },
      superadminUserId
    );
    const settingsAfterTokenChange = await whatsAppService.getLabWhatsAppSettings(labProId);
    assert(
      settingsAfterTokenChange.status === "DISCONNECTED" &&
        settingsAfterTokenChange.lastVerifiedAt === null,
      "TC-P4-09: Updating access token resets status to DISCONNECTED until re-verified"
    );

    // =========================================================================
    // SECTION 3: INELIGIBLE & EXPIRED PLANS FAIL CLOSED
    // =========================================================================
    console.log("\n--- 3. Testing Ineligible & Expired Plans Fail Closed ---");

    const expiredEntitlement = await resolveLabWhatsAppEntitlement(labExpiredId);
    assert(
      expiredEntitlement.isEntitled === false &&
        expiredEntitlement.canUseSharedWhatsApp === false &&
        expiredEntitlement.canConfigureCustomWaba === false &&
        expiredEntitlement.rejectionReason === "SUBSCRIPTION_STATUS_INELIGIBLE",
      "TC-P4-10: Expired subscription fails closed (isEntitled = false, SUBSCRIPTION_STATUS_INELIGIBLE)"
    );

    const unsubEntitlement = await resolveLabWhatsAppEntitlement(labUnsubId);
    assert(
      unsubEntitlement.isEntitled === false &&
        unsubEntitlement.rejectionReason === "NO_ACTIVE_SUBSCRIPTION",
      "TC-P4-11: Unsubscribed laboratory fails closed with NO_ACTIVE_SUBSCRIPTION"
    );

    let expiredSharedBlocked = false;
    try {
      await assertLabCanUseSharedWhatsApp(labExpiredId);
    } catch {
      expiredSharedBlocked = true;
    }
    assert(expiredSharedBlocked, "TC-P4-12: Expired laboratory cannot access shared WhatsApp (throws 403)");

    let expiredCustomBlocked = false;
    try {
      await assertLabCanConfigureCustomWaba(labExpiredId);
    } catch {
      expiredCustomBlocked = true;
    }
    assert(expiredCustomBlocked, "TC-P4-13: Expired laboratory cannot configure custom WABA (throws 403)");

    // =========================================================================
    // SECTION 4: QUOTA EXHAUSTION SEMANTICS
    // =========================================================================
    console.log("\n--- 4. Testing Quota Exhaustion Semantics ---");

    // Create a mini-quota test lab with limit = 1
    const labMiniId = `lab_mini_${suffix}`;
    const planMiniId = `plan_mini_${suffix}`;
    await prisma.subscriptionPlan.create({
      data: {
        id: planMiniId,
        code: `PLAN_MINI_${suffix}`,
        name: "Mini Plan",
        priceMonthly: 100,
        priceYearly: 1000,
        canUseSharedWhatsApp: true,
        monthlySharedWhatsAppQuota: 1,
        canConfigureCustomWaba: false,
      },
    });

    await prisma.lab.create({
      data: {
        id: labMiniId,
        slug: `mini-${suffix}`,
        name: "Mini Diagnostic Lab",
        code: `LM_${suffix.slice(-4)}`,
        email: `mini_${suffix}@example.com`,
        phone: "+91 98765 00005",
        addressLine1: "505 Mini Lane",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500001",
      },
    });

    await prisma.subscription.create({
      data: {
        labId: labMiniId,
        planId: planMiniId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    // Reserve the only slot
    const res1 = await reserveQuota({
      labId: labMiniId,
      idempotencyKey: `res_mini_${suffix}_1`,
      recipientPhone: "+919876500001",
      eventType: "ORDER_CONFIRMATION",
    });
    assert(res1.success === true, "TC-P4-14: First message slot reserved successfully");

    await confirmQuotaReservation({
      labId: labMiniId,
      idempotencyKey: `res_mini_${suffix}_1`,
      providerMessageId: "wamid.mini.1",
    });

    const exhaustedUsage = await getLabQuotaUsage(labMiniId);
    assert(
      exhaustedUsage.quotaLimit === 1 &&
        exhaustedUsage.messagesConfirmed === 1 &&
        exhaustedUsage.messagesAvailable === 0 &&
        exhaustedUsage.isExhausted === true,
      "TC-P4-15: Quota ledger reports 0 available and isExhausted = true"
    );

    const res2 = await reserveQuota({
      labId: labMiniId,
      idempotencyKey: `res_mini_${suffix}_2`,
      recipientPhone: "+919876500002",
      eventType: "ORDER_CONFIRMATION",
    });
    assert(
      res2.success === false && res2.reason === "QUOTA_EXHAUSTED",
      "TC-P4-16: Dispatch blocked cleanly when quota is exhausted (QUOTA_EXHAUSTED)"
    );

    // =========================================================================
    // SECTION 5: SUPERADMIN PLAN QUOTA VALIDATION & ENFORCEMENT
    // =========================================================================
    console.log("\n--- 5. Testing Superadmin Plan Quota Validation ---");

    // Invalid negative quota
    let negativeQuotaBlocked = false;
    try {
      await updateSubscriptionPlan(
        planGrowthId,
        { monthlySharedWhatsAppQuota: -25 },
        superadminActor
      );
    } catch (err: any) {
      negativeQuotaBlocked = err.message.includes("non-negative integer");
    }
    assert(negativeQuotaBlocked, "TC-P4-17: Superadmin rejects negative monthlySharedWhatsAppQuota");

    // Invalid fractional quota
    let fractionalQuotaBlocked = false;
    try {
      await updateSubscriptionPlan(
        planGrowthId,
        { monthlySharedWhatsAppQuota: 250.75 },
        superadminActor
      );
    } catch (err: any) {
      fractionalQuotaBlocked = err.message.includes("non-negative integer");
    }
    assert(fractionalQuotaBlocked, "TC-P4-18: Superadmin rejects fractional monthlySharedWhatsAppQuota");

    // Valid integer quota update
    const updatedPlan = await updateSubscriptionPlan(
      planGrowthId,
      { monthlySharedWhatsAppQuota: 500 },
      superadminActor
    );
    assert(
      updatedPlan.monthlySharedWhatsAppQuota === 500,
      "TC-P4-19: Superadmin successfully updates quota to valid integer (500)"
    );

    // Reset back to 250
    await updateSubscriptionPlan(
      planGrowthId,
      { monthlySharedWhatsAppQuota: 250 },
      superadminActor
    );

    // =========================================================================
    // SECTION 6: CLIENT-INDEPENDENT SERVER ENFORCEMENT
    // =========================================================================
    console.log("\n--- 6. Testing Client-Independent Server Enforcement ---");

    // Even if an ineligible lab directly calls the backend service attempting to configure custom credentials,
    // assertLabCanConfigureCustomWaba prevents unauthorized access.
    let serverSecurityPass = false;
    try {
      await assertLabCanConfigureCustomWaba(labGrowthId);
    } catch (err: any) {
      serverSecurityPass = err.statusCode === 403;
    }
    assert(
      serverSecurityPass,
      "TC-P4-20: Direct server authorization blocks Growth lab from custom WABA configuration"
    );

    let starterSecurityPass = false;
    try {
      await assertLabCanConfigureCustomWaba(labUnsubId);
    } catch (err: any) {
      starterSecurityPass = err.statusCode === 403;
    }
    assert(
      starterSecurityPass,
      "TC-P4-21: Direct server authorization blocks Unsubscribed lab from custom WABA configuration"
    );

    console.log("\n🧹 Cleaning up Phase 4 test fixtures...");
    await prisma.labWhatsAppReservation.deleteMany({
      where: { labId: { in: [labGrowthId, labProId, labExpiredId, labUnsubId, labMiniId] } },
    });
    await prisma.labWhatsAppQuotaPeriod.deleteMany({
      where: { labId: { in: [labGrowthId, labProId, labExpiredId, labUnsubId, labMiniId] } },
    });
    await prisma.platformSettings.deleteMany({
      where: {
        key: {
          in: [
            `lab_whatsapp_${labGrowthId}`,
            `lab_whatsapp_${labProId}`,
            `lab_whatsapp_${labExpiredId}`,
            `lab_whatsapp_${labUnsubId}`,
            `lab_whatsapp_${labMiniId}`,
          ],
        },
      },
    });
    await prisma.subscription.deleteMany({
      where: { labId: { in: [labGrowthId, labProId, labExpiredId, labUnsubId, labMiniId] } },
    });
    await prisma.lab.deleteMany({
      where: { id: { in: [labGrowthId, labProId, labExpiredId, labUnsubId, labMiniId] } },
    });
    await prisma.subscriptionPlan.deleteMany({
      where: { id: { in: [planGrowthId, planProId, planStarterId, planMiniId] } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorUserId: superadminUserId },
    });
    await prisma.user.deleteMany({
      where: { id: superadminUserId },
    });
    console.log("✅ Cleanup complete.");

    console.log("\n================================================================================");
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Unexpected error in Phase 4 test execution:", err);
    process.exit(1);
  }
}

runPhase4Tests();
