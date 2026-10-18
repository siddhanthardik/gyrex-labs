/**
 * Gyrex Labs - Shared WhatsApp Outbound Messaging Test Suite (Phase 2)
 *
 * Verifies all Phase 2 requirements:
 * 1. Plan Routing: Growth plan routes via Gyrex Shared WhatsApp with quota reservation.
 * 2. Plan Routing: Professional plan routes via custom lab-owned WABA without deducting shared quota.
 * 3. Plan Routing: Ineligible plan (e.g. Starter or unmapped) fails closed with PLAN_NOT_ENTITLED.
 * 4. Missing Configuration: Fails cleanly when platform credentials or template config is missing.
 * 5. Template Parameter Assembly: Includes laboratory name, patient name, and order details.
 * 6. Security: Report notifications send authenticated links, NEVER raw PDF bytes.
 * 7. Quota Hard Cap: Enforces monthly shared quota and blocks dispatch upon exhaustion.
 * 8. Deduplication: Duplicate events/idempotency keys do not dispatch duplicate messages or double-charge quota.
 * 9. Patient Opt-Out: Suppresses messages for opted-out patients and preserves quota.
 * 10. Ambiguous Timeout: Network timeouts transition to PENDING_RECONCILIATION and NEVER prematurely release quota.
 */

import { prisma } from "../lib/db/prisma";
import {
  SubscriptionStatus,
  BillingCycle,
  WhatsAppReservationStatus,
  UserRole,
  PaymentStatus,
  CollectionType,
  FileCategory,
  StorageProvider,
  FileAccessClassification,
  FileStatus,
} from "@prisma/client";
import { whatsAppService } from "../services/integrations/whatsapp/whatsapp-service";
import {
  sendOrderConfirmationWhatsApp,
  sendPaymentConfirmationWhatsApp,
  sendSampleCollectedWhatsApp,
  sendReportReadyWhatsApp,
} from "../services/integrations/whatsapp/whatsapp-notification-service";
import {
  buildOrderConfirmationTemplate,
  buildPaymentConfirmationTemplate,
  buildSampleCollectedTemplate,
  buildReportReadyTemplate,
  getWhatsAppTemplateConfig,
} from "../services/integrations/whatsapp/whatsapp-template-service";
import {
  getOrCreateCurrentQuotaPeriod,
  getLabQuotaUsage,
  reserveQuota,
  markReservationPendingReconciliation,
} from "../services/integrations/whatsapp/whatsapp-quota-service";
import { encryptSecret } from "../lib/integrations/crypto";

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
  console.log("🧪 Gyrex Labs - Shared WhatsApp Outbound Messaging Test Suite (Phase 2)");
  console.log("================================================================================\n");

  const testSuffix = `p2_${Date.now()}`;
  const labGrowthId = `lab_growth_${testSuffix}`;
  const labProId = `lab_pro_${testSuffix}`;
  const labStarterId = `lab_starter_${testSuffix}`;

  const planGrowthId = `plan_growth_${testSuffix}`;
  const planProId = `plan_pro_${testSuffix}`;
  const planStarterId = `plan_starter_${testSuffix}`;

  const adminUserId = `user_admin_${testSuffix}`;
  const patientId = `patient_${testSuffix}`;
  const fileAssetId = `file_${testSuffix}`;

  // Preserve test mock mode during tests
  const originalMockEnv = process.env.TEST_PAYMENT_MOCK;
  process.env.TEST_PAYMENT_MOCK = "true";

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("🔧 Setting up isolated test fixtures...");

    // Create superadmin user for audit log relations
    await prisma.user.create({
      data: {
        id: adminUserId,
        email: `admin_${testSuffix}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Test Admin P2",
        role: UserRole.SUPERADMIN,
      },
    });

    // Create 3 Subscription Plans: Growth (Shared), Pro (Custom), Starter (Ineligible)
    await prisma.subscriptionPlan.createMany({
      data: [
        {
          id: planGrowthId,
          code: `GROWTH_${testSuffix.slice(-6)}`,
          name: "Growth Test Plan",
          priceMonthly: 1499,
          priceYearly: 14990,
          canUseSharedWhatsApp: true,
          monthlySharedWhatsAppQuota: 250,
          canConfigureCustomWaba: false,
          isActive: true,
        },
        {
          id: planProId,
          code: `PRO_${testSuffix.slice(-6)}`,
          name: "Professional Test Plan",
          priceMonthly: 2999,
          priceYearly: 29990,
          canUseSharedWhatsApp: false,
          monthlySharedWhatsAppQuota: 0,
          canConfigureCustomWaba: true,
          isActive: true,
        },
        {
          id: planStarterId,
          code: `STARTER_${testSuffix.slice(-6)}`,
          name: "Starter Test Plan",
          priceMonthly: 499,
          priceYearly: 4990,
          canUseSharedWhatsApp: false,
          monthlySharedWhatsAppQuota: 0,
          canConfigureCustomWaba: false,
          isActive: true,
        },
      ],
    });

    // Create 3 Laboratories
    await prisma.lab.createMany({
      data: [
        {
          id: labGrowthId,
          slug: `growth-lab-${testSuffix}`,
          name: "Gyrex Growth Pathology Lab",
          code: `GRL_${testSuffix.slice(-4)}`,
          email: `growth_${testSuffix}@example.com`,
          phone: "+91 98765 33001",
          addressLine1: "101 Growth Blvd",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400001",
        },
        {
          id: labProId,
          slug: `pro-lab-${testSuffix}`,
          name: "Gyrex Pro Diagnostics",
          code: `PRL_${testSuffix.slice(-4)}`,
          email: `pro_${testSuffix}@example.com`,
          phone: "+91 98765 33002",
          addressLine1: "202 Pro Ave",
          city: "Pune",
          state: "Maharashtra",
          postalCode: "411001",
        },
        {
          id: labStarterId,
          slug: `starter-lab-${testSuffix}`,
          name: "Gyrex Starter Clinic",
          code: `STL_${testSuffix.slice(-4)}`,
          email: `starter_${testSuffix}@example.com`,
          phone: "+91 98765 33003",
          addressLine1: "303 Starter Lane",
          city: "Nashik",
          state: "Maharashtra",
          postalCode: "422001",
        },
      ],
    });

    // Create Active Subscriptions
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.createMany({
      data: [
        {
          labId: labGrowthId,
          planId: planGrowthId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        {
          labId: labProId,
          planId: planProId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        {
          labId: labStarterId,
          planId: planStarterId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      ],
    });

    // Configure Pro Lab with custom WABA credentials
    await prisma.platformSettings.create({
      data: {
        key: `lab_whatsapp:${labProId}`,
        value: {
          wabaId: "123456789012345",
          phoneNumberId: "mock_pro_phone_id",
          displayPhoneNumber: "+91 98765 33002",
          accessTokenEncrypted: encryptSecret("mock_pro_access_token"),
          appSecretEncrypted: encryptSecret("mock_pro_app_secret"),
          webhookVerifyToken: "mock_pro_verify_token",
          status: "CONNECTED",
          isEnabled: true,
          notifyOrderConfirmation: true,
          notifyPaymentConfirmation: true,
          notifySampleCollected: true,
          notifyReportReady: true,
        },
        description: `Pro Lab custom WABA settings ${testSuffix}`,
      },
    });

    // Create test patient
    await prisma.patient.create({
      data: {
        id: patientId,
        fullName: "Rahul Sharma",
        phone: "+919876500001",
        email: `patient_${testSuffix}@example.com`,
        gender: "MALE",
        dateOfBirth: new Date("1990-05-15"),
      },
    });

    // Create a dummy FileAsset for report tests
    await prisma.fileAsset.create({
      data: {
        id: fileAssetId,
        labId: labGrowthId,
        category: FileCategory.REPORT,
        storageProvider: StorageProvider.LOCAL_SECURE,
        storagePath: `reports/${testSuffix}/test_report.pdf`,
        originalFileName: "diagnostic_report.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(102400),
        accessClassification: FileAccessClassification.RESTRICTED_PATIENT_LAB,
        status: FileStatus.ACTIVE,
      },
    });

    console.log("✅ Fixtures created.\n");

    // =========================================================================
    // TEST SECTION 1: TEMPLATE BUILDERS & SECURITY CONSTRAINTS
    // =========================================================================
    console.log("--- 1. Testing Template Parameter Assembly & Security Constraints ---");

    const orderTmpl = await buildOrderConfirmationTemplate({
      patientName: "Rahul Sharma",
      labName: "Gyrex Growth Pathology Lab",
      orderNumber: "GYR-2026-10001",
      collectionSchedule: "Home Collection (20 Oct 2026 09:00 AM)",
      totalAmount: 1450,
      trackingUrl: "https://labs.gyrex.in/growth-lab/booking/GYR-2026-10001",
    });

    assert(orderTmpl.valid === true, "Order Confirmation template builds valid payload");
    assert(
      Boolean(orderTmpl.payload?.components[0]?.parameters.some((p) => p.text === "Gyrex Growth Pathology Lab")),
      "Order Confirmation template parameters include laboratory name for attribution"
    );
    assert(
      Boolean(orderTmpl.payload?.components[0]?.parameters.some((p) => p.text === "₹1,450")),
      "Order Confirmation template formats currency correctly"
    );

    const reportTmpl = await buildReportReadyTemplate({
      patientName: "Rahul Sharma",
      labName: "Gyrex Growth Pathology Lab",
      orderNumber: "GYR-2026-10001",
      reportNumber: "RPT-2026-0001",
      reportUrl: "https://labs.gyrex.in/growth-lab/reports?orderNumber=GYR-2026-10001",
    });

    assert(reportTmpl.valid === true, "Report Ready template builds valid payload");
    assert(
      Boolean(
        reportTmpl.payload?.components[0]?.parameters.some((p) =>
          p.text.startsWith("https://labs.gyrex.in/growth-lab/reports")
        )
      ),
      "Report Ready template sends authenticated web verification link"
    );

    // CRITICAL SECURITY ASSERTION: Verify NO raw PDF bytes or media attachments
    const payloadStr = JSON.stringify(reportTmpl.payload);
    assert(
      !payloadStr.includes("document") && !payloadStr.includes(".pdf") && !payloadStr.includes("base64"),
      "Report Ready payload NEVER contains raw PDF bytes or document attachments"
    );

    // Test missing required parameter validation
    const invalidTmpl = await buildOrderConfirmationTemplate({
      patientName: "",
      labName: "Gyrex Growth Pathology Lab",
      orderNumber: "GYR-2026-10001",
      collectionSchedule: "Home Collection",
      totalAmount: 500,
      trackingUrl: "https://labs.gyrex.in",
    });
    assert(invalidTmpl.valid === false, "Template builder rejects missing patient name cleanly");

    // =========================================================================
    // TEST SECTION 2: GROWTH PLAN SHARED ROUTING & QUOTA LEDGER
    // =========================================================================
    console.log("\n--- 2. Testing Growth Plan Shared Routing & Quota Confirmation ---");

    const orderGrowth1 = await prisma.order.create({
      data: {
        id: `order_growth_1_${testSuffix}`,
        orderNumber: `GYR-2026-G1-${testSuffix.slice(-4)}`,
        labId: labGrowthId,
        patientId,
        collectionType: CollectionType.HOME_COLLECTION,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 1250,
        totalAmount: 1250,
      },
    });

    // Check initial quota state
    const quotaBefore = await getLabQuotaUsage(labGrowthId);
    assert(quotaBefore.messagesConfirmed === 0, "Growth lab initially has 0 confirmed messages");
    assert(quotaBefore.quotaLimit === 250, "Growth lab quota limit is snapshotted to 250");

    // Dispatch order confirmation via shared sender
    const dispatchResult1 = await sendOrderConfirmationWhatsApp(orderGrowth1.id);
    assert(dispatchResult1.sent === true, "sendOrderConfirmationWhatsApp succeeds on Growth plan");
    assert(
      Boolean(dispatchResult1.messageId?.startsWith("wamid.")),
      "Outbound dispatch returns provider WAMID",
      dispatchResult1.messageId
    );

    // Verify quota ledger was atomically updated: 1 confirmed, 0 reserved
    const quotaAfter1 = await getLabQuotaUsage(labGrowthId);
    assert(
      quotaAfter1.messagesConfirmed === 1,
      "Growth lab quota messagesConfirmed incremented to 1",
      `Actual: ${quotaAfter1.messagesConfirmed}`
    );
    assert(
      quotaAfter1.messagesReserved === 0,
      "Growth lab quota messagesReserved decremented back to 0 on confirmation"
    );

    // Verify reservation status in database
    const reservationRecord1 = await prisma.labWhatsAppReservation.findUnique({
      where: {
        labId_idempotencyKey: {
          labId: labGrowthId,
          idempotencyKey: `order_confirmed:${orderGrowth1.id}`,
        },
      },
    });
    assert(
      reservationRecord1?.status === WhatsAppReservationStatus.CONFIRMED,
      "Reservation record status is CONFIRMED in database"
    );
    assert(
      reservationRecord1?.providerMessageId === dispatchResult1.messageId,
      "Reservation record stores providerMessageId"
    );

    // Verify Notification record in database
    const notification1 = await prisma.notification.findFirst({
      where: {
        labId: labGrowthId,
        data: { path: ["idempotencyKey"], equals: `order_confirmed:${orderGrowth1.id}` },
      },
    });
    assert(Boolean(notification1), "Notification record created in Prisma");
    assert(
      (notification1?.data as any)?.provider === "SHARED_GYREX_WHATSAPP",
      "Notification record identifies provider as SHARED_GYREX_WHATSAPP"
    );

    // =========================================================================
    // TEST SECTION 3: IDEMPOTENCY DEDUPLICATION
    // =========================================================================
    console.log("\n--- 3. Testing Idempotency Deduplication ---");

    // Attempt duplicate dispatch for the exact same order
    const duplicateResult = await sendOrderConfirmationWhatsApp(orderGrowth1.id);
    assert(
      duplicateResult.sent === false && duplicateResult.skipped === true,
      "Duplicate order confirmation call is skipped idempotently"
    );
    assert(
      duplicateResult.reason === "ALREADY_SENT",
      "Duplicate order confirmation returns ALREADY_SENT reason"
    );

    // Verify quota was NOT incremented twice
    const quotaAfterDup = await getLabQuotaUsage(labGrowthId);
    assert(
      quotaAfterDup.messagesConfirmed === 1,
      "Confirmed quota remains 1 after duplicate attempt (no double deduction)"
    );

    // =========================================================================
    // TEST SECTION 4: PROFESSIONAL PLAN (CUSTOM WABA)
    // =========================================================================
    console.log("\n--- 4. Testing Professional Plan (Custom WABA Routing) ---");

    const orderPro = await prisma.order.create({
      data: {
        id: `order_pro_${testSuffix}`,
        orderNumber: `GYR-2026-P1-${testSuffix.slice(-4)}`,
        labId: labProId,
        patientId,
        collectionType: CollectionType.LAB_VISIT,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 2500,
        totalAmount: 2500,
      },
    });

    const paymentPro = await prisma.patientPayment.create({
      data: {
        id: `payment_pro_${testSuffix}`,
        paymentNumber: `PAY-2026-PRO-${testSuffix.slice(-4)}`,
        orderId: orderPro.id,
        labId: labProId,
        amount: 2500,
        status: PaymentStatus.PAID,
      },
    });

    const proDispatchResult = await sendPaymentConfirmationWhatsApp(paymentPro.id);
    assert(proDispatchResult.sent === true, "sendPaymentConfirmationWhatsApp succeeds on Professional plan");

    // Verify Professional plan uses CUSTOM_LAB_WABA and DOES NOT touch shared quota
    const proNotification = await prisma.notification.findFirst({
      where: {
        labId: labProId,
        data: { path: ["idempotencyKey"], equals: `payment_confirmed:${paymentPro.id}` },
      },
    });
    assert(
      (proNotification?.data as any)?.provider === "CUSTOM_LAB_WABA",
      "Professional notification is routed via CUSTOM_LAB_WABA"
    );

    const proReservations = await prisma.labWhatsAppReservation.count({
      where: { labId: labProId },
    });
    assert(proReservations === 0, "Professional plan creates 0 shared quota reservations (uses own WABA)");

    // =========================================================================
    // TEST SECTION 5: INELIGIBLE PLAN (FAIL CLOSED)
    // =========================================================================
    console.log("\n--- 5. Testing Ineligible Plan (Fail Closed) ---");

    const orderStarter = await prisma.order.create({
      data: {
        id: `order_starter_${testSuffix}`,
        orderNumber: `GYR-2026-S1-${testSuffix.slice(-4)}`,
        labId: labStarterId,
        patientId,
        collectionType: CollectionType.LAB_VISIT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 500,
        totalAmount: 500,
      },
    });

    const starterDispatchResult = await sendOrderConfirmationWhatsApp(orderStarter.id);
    assert(
      starterDispatchResult.sent === false && starterDispatchResult.skipped === true,
      "Starter plan dispatch is skipped (fails closed)"
    );
    assert(
      starterDispatchResult.reason === "PLAN_NOT_ENTITLED",
      "Starter plan returns PLAN_NOT_ENTITLED reason"
    );

    // =========================================================================
    // TEST SECTION 6: PATIENT OPT-OUT SUPPRESSION & SAFE QUOTA HANDLING
    // =========================================================================
    console.log("\n--- 6. Testing Patient Opt-Out Suppression ---");

    // Opt out the patient from Growth Lab
    await whatsAppService.optOutPatient(labGrowthId, "+919876500001");
    const isOptedOut = await whatsAppService.isPatientOptedOut(labGrowthId, "+919876500001");
    assert(isOptedOut === true, "Patient is marked as opted out in PlatformSettings");

    const orderGrowthOptOut = await prisma.order.create({
      data: {
        id: `order_optout_${testSuffix}`,
        orderNumber: `GYR-2026-OPT-${testSuffix.slice(-4)}`,
        labId: labGrowthId,
        patientId,
        collectionType: CollectionType.HOME_COLLECTION,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 800,
        totalAmount: 800,
      },
    });

    const optOutDispatch = await sendOrderConfirmationWhatsApp(orderGrowthOptOut.id);
    assert(
      optOutDispatch.sent === false && optOutDispatch.skipped === true,
      "Opted-out patient dispatch is suppressed"
    );
    assert(
      optOutDispatch.reason === "PATIENT_OPTED_OUT",
      "Opted-out patient returns PATIENT_OPTED_OUT reason"
    );

    // Verify quota was not decremented
    const quotaOptOut = await getLabQuotaUsage(labGrowthId);
    assert(
      quotaOptOut.messagesConfirmed === 1,
      "Confirmed quota remains 1 (no quota consumed for opted-out patient)"
    );

    // Opt patient back in for subsequent tests
    await whatsAppService.optInPatient(labGrowthId, "+919876500001");
    assert(
      (await whatsAppService.isPatientOptedOut(labGrowthId, "+919876500001")) === false,
      "Patient is opted back in successfully"
    );

    // =========================================================================
    // TEST SECTION 7: QUOTA HARD CAP EXHAUSTION
    // =========================================================================
    console.log("\n--- 7. Testing Quota Hard Cap Exhaustion ---");

    // Create a 4th lab with quota limit = 1 for deterministic hard cap test
    const labExhaustId = `lab_exhaust_${testSuffix}`;
    const planExhaustId = `plan_exhaust_${testSuffix}`;

    await prisma.subscriptionPlan.create({
      data: {
        id: planExhaustId,
        code: `EXHAUST_${testSuffix.slice(-6)}`,
        name: "Exhaustion Test Plan",
        priceMonthly: 999,
        priceYearly: 9990,
        canUseSharedWhatsApp: true,
        monthlySharedWhatsAppQuota: 1, // Cap is exactly 1!
        canConfigureCustomWaba: false,
        isActive: true,
      },
    });

    await prisma.lab.create({
      data: {
        id: labExhaustId,
        slug: `exhaust-lab-${testSuffix}`,
        name: "Gyrex Exhaustion Test Lab",
        code: `EXT_${testSuffix.slice(-4)}`,
        email: `exhaust_${testSuffix}@example.com`,
        phone: "+91 98765 33004",
        addressLine1: "404 Cap Rd",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
      },
    });

    await prisma.subscription.create({
      data: {
        labId: labExhaustId,
        planId: planExhaustId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    const orderExhaust1 = await prisma.order.create({
      data: {
        id: `order_exh_1_${testSuffix}`,
        orderNumber: `GYR-EXH-1-${testSuffix.slice(-4)}`,
        labId: labExhaustId,
        patientId,
        collectionType: CollectionType.LAB_VISIT,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 1000,
        totalAmount: 1000,
      },
    });

    const orderExhaust2 = await prisma.order.create({
      data: {
        id: `order_exh_2_${testSuffix}`,
        orderNumber: `GYR-EXH-2-${testSuffix.slice(-4)}`,
        labId: labExhaustId,
        patientId,
        collectionType: CollectionType.LAB_VISIT,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 1000,
        totalAmount: 1000,
      },
    });

    // 1st dispatch consumes the only available slot (1 of 1)
    const exhResult1 = await sendOrderConfirmationWhatsApp(orderExhaust1.id);
    assert(exhResult1.sent === true, "First message consumes 1/1 quota slot successfully");

    // 2nd dispatch must fail with QUOTA_EXHAUSTED
    const exhResult2 = await sendOrderConfirmationWhatsApp(orderExhaust2.id);
    assert(
      exhResult2.sent === false && exhResult2.skipped === true,
      "Second message is blocked when quota is exhausted"
    );
    assert(
      exhResult2.reason === "QUOTA_EXHAUSTED",
      "Quota exhausted returns reason QUOTA_EXHAUSTED",
      exhResult2.reason
    );

    // =========================================================================
    // TEST SECTION 8: SAMPLE COLLECTION & REPORT READY NOTIFICATIONS
    // =========================================================================
    console.log("\n--- 8. Testing Sample Collection & Report Ready Dispatches ---");

    const orderSample = await prisma.order.create({
      data: {
        id: `order_sample_${testSuffix}`,
        orderNumber: `GYR-SMP-${testSuffix.slice(-4)}`,
        labId: labGrowthId,
        patientId,
        collectionType: CollectionType.HOME_COLLECTION,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 1500,
        totalAmount: 1500,
      },
    });

    const sampleDispatch = await sendSampleCollectedWhatsApp(orderSample.id, {
      phlebotomistName: "Vikram Singh",
    });
    assert(sampleDispatch.sent === true, "sendSampleCollectedWhatsApp succeeds on Growth plan");

    const reportRecord = await prisma.report.create({
      data: {
        id: `report_${testSuffix}`,
        reportNumber: `RPT-2026-VAL-${testSuffix.slice(-4)}`,
        labId: labGrowthId,
        orderId: orderSample.id,
        patientId,
        fileAssetId,
      },
    });

    const reportDispatch = await sendReportReadyWhatsApp(reportRecord.id);
    assert(reportDispatch.sent === true, "sendReportReadyWhatsApp succeeds on Growth plan");

    // Verify deliveredViaWhatsappAt was updated on Report record
    const updatedReport = await prisma.report.findUnique({
      where: { id: reportRecord.id },
    });
    assert(
      updatedReport?.deliveredViaWhatsappAt !== null,
      "Report deliveredViaWhatsappAt timestamp is populated upon delivery"
    );

    // =========================================================================
    // TEST SECTION 9: AMBIGUOUS TIMEOUT HANDLING (RECONCILIATION SAFETY)
    // =========================================================================
    console.log("\n--- 9. Testing Ambiguous Timeout & Reconciliation Safety ---");

    // Temporarily save env vars and clear them to test unconfigured handling
    const origSharedPhone = process.env.WHATSAPP_SHARED_PHONE_NUMBER_ID;
    const origPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const origSharedToken = process.env.WHATSAPP_SHARED_ACCESS_TOKEN;
    const origToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const origMock = process.env.TEST_PAYMENT_MOCK;

    delete process.env.WHATSAPP_SHARED_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_SHARED_ACCESS_TOKEN;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.TEST_PAYMENT_MOCK;

    const credentials = await whatsAppService.getPlatformWhatsAppCredentials();
    assert(
      credentials === null,
      "When TEST_PAYMENT_MOCK is false and env/DB unconfigured, getPlatformWhatsAppCredentials returns null"
    );

    // Directly test timeout simulation on sendTemplateMessageInternal with invalid token/endpoint
    const timeoutResult = await whatsAppService.sendTemplateMessageInternal({
      recipientPhone: "+919876500001",
      template: orderTmpl.payload!,
      phoneNumberId: "1234567890",
      accessToken: "invalid_real_token_for_network_abort",
      timeoutMs: 1, // 1ms timeout guarantees abort
    });

    assert(
      timeoutResult.success === false,
      "Immediate 1ms timeout triggers failure"
    );
    assert(
      timeoutResult.isAmbiguousNetworkError === true,
      "Send outcome cleanly flags ambiguous network error"
    );

    // Restore env vars
    if (origSharedPhone) process.env.WHATSAPP_SHARED_PHONE_NUMBER_ID = origSharedPhone;
    if (origPhone) process.env.WHATSAPP_PHONE_NUMBER_ID = origPhone;
    if (origSharedToken) process.env.WHATSAPP_SHARED_ACCESS_TOKEN = origSharedToken;
    if (origToken) process.env.WHATSAPP_ACCESS_TOKEN = origToken;
    if (origMock) process.env.TEST_PAYMENT_MOCK = origMock;

    // Create an isolated order on Growth lab to test reservation reconciliation
    const orderTimeout = await prisma.order.create({
      data: {
        id: `order_timeout_${testSuffix}`,
        orderNumber: `GYR-TO-${testSuffix.slice(-4)}`,
        labId: labGrowthId,
        patientId,
        collectionType: CollectionType.HOME_COLLECTION,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 1100,
        totalAmount: 1100,
      },
    });

    const timeoutKey = `order_confirmed:${orderTimeout.id}`;

    // 1. Reserve quota
    const timeoutRes = await reserveQuota({
      labId: labGrowthId,
      idempotencyKey: timeoutKey,
      recipientPhone: "+919876500001",
      eventType: "ORDER_CONFIRMATION",
    });
    assert(timeoutRes.success === true, "Quota reserved for timeout simulation");

    const quotaDuringRes = await getLabQuotaUsage(labGrowthId);
    const reservedCountBefore = quotaDuringRes.messagesReserved;

    // 2. Simulate ambiguous timeout transition
    await markReservationPendingReconciliation({
      labId: labGrowthId,
      idempotencyKey: timeoutKey,
      reason: "NETWORK_TIMEOUT: fetch aborted after 10000ms",
    });

    // 3. CRITICAL: Verify quota is NOT released upon ambiguous failure
    const timeoutRecord = await prisma.labWhatsAppReservation.findUnique({
      where: { labId_idempotencyKey: { labId: labGrowthId, idempotencyKey: timeoutKey } },
    });
    assert(
      timeoutRecord?.status === WhatsAppReservationStatus.PENDING_RECONCILIATION,
      "Reservation transitions to PENDING_RECONCILIATION"
    );

    const quotaAfterTimeout = await getLabQuotaUsage(labGrowthId);
    assert(
      quotaAfterTimeout.messagesReserved === reservedCountBefore,
      "Quota reservation is NOT released upon ambiguous timeout"
    );

    console.log("\n================================================================================");
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log("================================================================================\n");
  } catch (err: any) {
    console.error("❌ Fatal error in test runner:", err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("🧹 Cleaning up isolated test fixtures...");
    process.env.TEST_PAYMENT_MOCK = originalMockEnv;

    try {
      const allTestLabIds = [labGrowthId, labProId, labStarterId, `lab_exhaust_${testSuffix}`];

      await prisma.notification.deleteMany({
        where: { labId: { in: allTestLabIds } },
      });
      await prisma.labWhatsAppReservation.deleteMany({
        where: { labId: { in: allTestLabIds } },
      });
      await prisma.labWhatsAppQuotaPeriod.deleteMany({
        where: { labId: { in: allTestLabIds } },
      });
      await prisma.report.deleteMany({
        where: { labId: { in: allTestLabIds } },
      });
      await prisma.fileAsset.deleteMany({
        where: { id: fileAssetId },
      });
      await prisma.patientPayment.deleteMany({
        where: { labId: { in: allTestLabIds } },
      });
      await prisma.order.deleteMany({
        where: { labId: { in: allTestLabIds } },
      });
      await prisma.patient.deleteMany({
        where: { id: patientId },
      });
      await prisma.platformSettings.deleteMany({
        where: {
          key: {
            in: [
              `lab_whatsapp:${labProId}`,
              `lab_whatsapp_optouts:${labGrowthId}`,
            ],
          },
        },
      });
      await prisma.subscription.deleteMany({
        where: { labId: { in: allTestLabIds } },
      });
      await prisma.subscriptionPlan.deleteMany({
        where: {
          id: {
            in: [
              planGrowthId,
              planProId,
              planStarterId,
              `plan_exhaust_${testSuffix}`,
            ],
          },
        },
      });
      await prisma.lab.deleteMany({
        where: { id: { in: allTestLabIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { actorUserId: adminUserId },
      });
      await prisma.user.deleteMany({
        where: { id: adminUserId },
      });
      console.log("✅ Cleanup complete.");
    } catch (cleanupErr) {
      console.error("⚠️ Cleanup notice:", cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(async (err) => {
  console.error("❌ Fatal error in test runner:", err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
