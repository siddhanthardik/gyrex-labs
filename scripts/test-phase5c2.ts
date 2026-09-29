/**
 * Gyrex Labs - Phase 5C-2 Security & Integration Test Suite
 * Gyrex Subscription Billing: Laboratory -> Gyrex
 *
 * Verifies:
 * 1. Platform credential separation (GYREX_RAZORPAY_* exclusively; zero LabPaymentSettings usage)
 * 2. Subscription checkout session creation with authoritative DB pricing
 * 3. Multi-tenant isolation (cross-tenant verification attempts blocked and audited)
 * 4. Client payment verification with timing-safe HMAC-SHA256 signature validation
 * 5. Platform webhook HMAC-SHA256 signature verification over raw body
 * 6. Authoritative subscription resolution from provider references (no looping all labs)
 * 7. Webhook event processing: subscription.charged, subscription.halted, payment.captured, payment.failed
 * 8. Stale-event protection & out-of-order event resilience (terminal state preservation)
 * 9. Idempotent processing of duplicate client and webhook calls
 * 10. Strict financial and domain separation: zero PatientPayment, Order, or catalogue interference
 */

import { prisma } from "../lib/db/prisma";
import {
  createSubscriptionCheckout,
  verifyAndConfirmSubscriptionPayment,
} from "../services/integrations/payments/subscription-billing-service";
import {
  handleSubscriptionWebhook,
  WebhookError,
} from "../services/integrations/payments/webhook-handler";
import {
  LabStatus,
  SubscriptionStatus,
  BillingCycle,
  InvoiceStatus,
  PaymentStatus,
  AuditAction,
} from "@prisma/client";
import crypto from "crypto";

// Configure test environment
process.env.TEST_PAYMENT_MOCK = "true";
const PLATFORM_KEY_ID = process.env.GYREX_RAZORPAY_KEY_ID || "rzp_test_platform_key";
const PLATFORM_KEY_SECRET = process.env.GYREX_RAZORPAY_KEY_SECRET || "dummy_platform_secret";
const PLATFORM_WEBHOOK_SECRET = process.env.GYREX_RAZORPAY_WEBHOOK_SECRET || "dummy_platform_secret";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${passedTests}: ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${passedTests + failedTests}: ${testName}${detail ? ` - ${detail}` : ""}`);
  }
}

function generateSignature(orderId: string, paymentId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function createSignedPlatformWebhook(payloadObj: any, secret: string = PLATFORM_WEBHOOK_SECRET) {
  const rawBody = JSON.stringify(payloadObj);
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return { rawBody, signature };
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("GYREX LABS — PHASE 5C-2 TEST SUITE STARTING");
  console.log("Gyrex Subscription Billing: Laboratory -> Gyrex");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const labASlug = `sub5c2-lab-a-${timestamp}`;
  const labBSlug = `sub5c2-lab-b-${timestamp}`;

  let labA: any;
  let labB: any;
  let planMonthly: any;
  let planYearly: any;
  let inactivePlan: any;
  let subA: any;
  let subB: any;

  // Baseline counts for non-interference checks
  let initialPatientPaymentCount = 0;
  let initialOrderCount = 0;
  let initialTestCount = 0;
  let initialPackageCount = 0;

  try {
    initialPatientPaymentCount = await prisma.patientPayment.count();
    initialOrderCount = await prisma.order.count();
    initialTestCount = await prisma.testMaster.count();
    initialPackageCount = await prisma.package.count();

    // 1. SETUP TEST FIXTURES
    labA = await prisma.lab.create({
      data: {
        name: `Apex Sub Test Lab A ${timestamp}`,
        slug: labASlug,
        code: `APA${timestamp.toString().slice(-4)}`,
        email: `apex_sub_a_${timestamp}@gyrex.test`,
        phone: "+919876500101",
        addressLine1: "100 Innovation Way",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        status: LabStatus.ACTIVE,
        isVerified: true,
      },
    });

    labB = await prisma.lab.create({
      data: {
        name: `Apex Sub Test Lab B ${timestamp}`,
        slug: labBSlug,
        code: `APB${timestamp.toString().slice(-4)}`,
        email: `apex_sub_b_${timestamp}@gyrex.test`,
        phone: "+919876500102",
        addressLine1: "200 Innovation Way",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400002",
        status: LabStatus.ACTIVE,
        isVerified: true,
      },
    });

    // Dedicated test plans
    planMonthly = await prisma.subscriptionPlan.create({
      data: {
        name: `Test Monthly Growth ${timestamp}`,
        code: `PLAN_TEST_M_${timestamp}`,
        description: "Test Monthly Plan",
        priceMonthly: 4999.0,
        priceYearly: 49990.0,
        maxOrdersPerMonth: 1000,
        maxStaffAccounts: 5,
        customBrandingEnabled: true,
        geminiPrescriptionAiEnabled: true,
        isActive: true,
        displayOrder: 1,
      },
    });

    planYearly = await prisma.subscriptionPlan.create({
      data: {
        name: `Test Yearly Growth ${timestamp}`,
        code: `PLAN_TEST_Y_${timestamp}`,
        description: "Test Yearly Plan",
        priceMonthly: 9999.0,
        priceYearly: 99990.0,
        maxOrdersPerMonth: 5000,
        maxStaffAccounts: 20,
        customBrandingEnabled: true,
        geminiPrescriptionAiEnabled: true,
        isActive: true,
        displayOrder: 2,
      },
    });

    inactivePlan = await prisma.subscriptionPlan.create({
      data: {
        name: `Inactive Test Plan ${timestamp}`,
        code: `PLAN_INACTIVE_${timestamp}`,
        description: "Archived Plan",
        priceMonthly: 1999.0,
        priceYearly: 19990.0,
        isActive: false,
        displayOrder: 99,
      },
    });

    // Subscriptions in initial TRIALING state
    subA = await prisma.subscription.create({
      data: {
        labId: labA.id,
        planId: planMonthly.id,
        status: SubscriptionStatus.TRIALING,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });

    subB = await prisma.subscription.create({
      data: {
        labId: labB.id,
        planId: planYearly.id,
        status: SubscriptionStatus.TRIALING,
        billingCycle: BillingCycle.YEARLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });

    console.log("--- PART 1: ARCHITECTURE & PLATFORM CREDENTIAL SEPARATION ---");

    // Test 1: Uses GYREX platform key ID in subscription checkout
    const checkoutA = await createSubscriptionCheckout({ labId: labA.id });
    assert(
      checkoutA.razorpayKeyId === PLATFORM_KEY_ID,
      "Checkout payload returns platform Razorpay Key ID"
    );

    // Test 2: Platform secret is NEVER exposed in checkout payload
    assert(
      (checkoutA as any).razorpayKeySecret === undefined &&
        (checkoutA as any).keySecret === undefined &&
        (checkoutA as any).secret === undefined,
      "Platform Razorpay Key Secret is never exposed to client"
    );

    // Test 3: Platform webhook secret is NEVER exposed in checkout payload
    assert(
      (checkoutA as any).webhookSecret === undefined &&
        (checkoutA as any).razorpayWebhookSecret === undefined,
      "Platform Webhook Secret is never exposed to client"
    );

    // Test 4: LabPaymentSettings is not created or modified during subscription checkout
    const labAPaymentSettings = await prisma.labPaymentSettings.findUnique({
      where: { labId: labA.id },
    });
    assert(
      labAPaymentSettings === null,
      "LabPaymentSettings is never created or accessed during subscription checkout"
    );

    // Test 5: PatientPayment table remains completely unwritten
    const interimPatientPaymentCount = await prisma.patientPayment.count();
    assert(
      interimPatientPaymentCount === initialPatientPaymentCount,
      "Zero PatientPayment records created during subscription checkout initiation"
    );

    console.log("\n--- PART 2: SUBSCRIPTION CHECKOUT CREATION & AUTHORITATIVE PRICING ---");

    // Test 6: Authoritative price calculation for Monthly plan (paise = priceMonthly * 100)
    const expectedPaiseMonthly = Math.round(Number(planMonthly.priceMonthly) * 100);
    assert(
      checkoutA.amountInPaise === expectedPaiseMonthly,
      `Monthly checkout amount matches planMonthly * 100 (${expectedPaiseMonthly} paise)`
    );

    // Test 7: Currency is strictly INR
    assert(checkoutA.currency === "INR", "Checkout currency is strictly INR");

    // Test 8: SubscriptionInvoice record created in ISSUED status
    const invoiceA = await prisma.subscriptionInvoice.findUnique({
      where: { id: checkoutA.invoiceId },
    });
    assert(
      invoiceA !== null &&
        invoiceA.status === InvoiceStatus.ISSUED &&
        Number(invoiceA.amountDue) === Number(planMonthly.priceMonthly) &&
        Number(invoiceA.amountPaid) === 0.0,
      "SubscriptionInvoice created in ISSUED status with correct amountDue and 0.0 amountPaid"
    );

    // Test 9: SubscriptionPayment record created in PENDING status
    const paymentA = await prisma.subscriptionPayment.findUnique({
      where: { id: checkoutA.paymentId },
    });
    assert(
      paymentA !== null &&
        paymentA.status === PaymentStatus.PENDING &&
        paymentA.gatewayOrderId === checkoutA.gatewayOrderId &&
        Number(paymentA.amount) === Number(planMonthly.priceMonthly),
      "SubscriptionPayment created in PENDING status matching gatewayOrderId"
    );

    // Test 10: Authoritative price calculation for Yearly plan (paise = priceYearly * 100)
    const checkoutB = await createSubscriptionCheckout({ labId: labB.id });
    const expectedPaiseYearly = Math.round(Number(planYearly.priceYearly) * 100);
    assert(
      checkoutB.amountInPaise === expectedPaiseYearly,
      `Yearly checkout amount matches planYearly * 100 (${expectedPaiseYearly} paise)`
    );

    // Test 11: Checkout fails gracefully if lab has no subscription record
    let unconfiguredError: any = null;
    try {
      await createSubscriptionCheckout({ labId: "non-existent-lab-id" });
    } catch (e: any) {
      unconfiguredError = e;
    }
    assert(
      unconfiguredError !== null && unconfiguredError.message.includes("No subscription plan"),
      "Checkout creation fails gracefully when lab has no subscription plan selected"
    );

    // Test 12: Checkout fails gracefully if selected plan is inactive
    const labC = await prisma.lab.create({
      data: {
        name: `Inactive Plan Lab ${timestamp}`,
        slug: `inactive-plan-lab-${timestamp}`,
        code: `INC${timestamp.toString().slice(-4)}`,
        email: `inc_${timestamp}@gyrex.test`,
        phone: "+919876500103",
        addressLine1: "300 Inactive Way",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400003",
        status: LabStatus.ACTIVE,
        isVerified: true,
      },
    });
    await prisma.subscription.create({
      data: {
        labId: labC.id,
        planId: inactivePlan.id,
        status: SubscriptionStatus.TRIALING,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    let inactiveError: any = null;
    try {
      await createSubscriptionCheckout({ labId: labC.id });
    } catch (e: any) {
      inactiveError = e;
    }
    assert(
      inactiveError !== null && inactiveError.message.includes("inactive or invalid"),
      "Checkout creation fails when subscription plan is inactive"
    );
    // Cleanup temporary labC
    await prisma.subscription.deleteMany({ where: { labId: labC.id } });
    await prisma.lab.deleteMany({ where: { id: labC.id } });

    console.log("\n--- PART 3: SERVER-SIDE PAYMENT VERIFICATION & SIGNATURE VALIDATION ---");

    // Test 13: Reject verification with invalid signature
    const fakePaymentIdA = `pay_mock_${Date.now()}_invalid`;
    let invalidSigError: any = null;
    try {
      await verifyAndConfirmSubscriptionPayment({
        invoiceId: checkoutA.invoiceId,
        gatewayOrderId: checkoutA.gatewayOrderId,
        gatewayPaymentId: fakePaymentIdA,
        gatewaySignature: "bad_invalid_signature_hex_1234567890abcdef",
        labId: labA.id,
      });
    } catch (e: any) {
      invalidSigError = e;
    }
    assert(
      invalidSigError !== null && invalidSigError.message.includes("signature"),
      "Payment verification rejects invalid HMAC-SHA256 signature"
    );

    // Test 14: Failed signature transitions payment to FAILED
    const failedPaymentCheck = await prisma.subscriptionPayment.findUnique({
      where: { id: checkoutA.paymentId },
    });
    assert(
      failedPaymentCheck?.status === PaymentStatus.FAILED,
      "SubscriptionPayment marked as FAILED following invalid signature"
    );

    // Test 15: Cross-tenant verification attempt is blocked (Lab A cannot verify Lab B's invoice)
    let crossTenantError: any = null;
    try {
      await verifyAndConfirmSubscriptionPayment({
        invoiceId: checkoutB.invoiceId,
        gatewayOrderId: checkoutB.gatewayOrderId,
        gatewayPaymentId: "pay_cross_tenant_1",
        gatewaySignature: "dummy_sig",
        labId: labA.id, // Lab A tenant attempting to verify Lab B invoice
      });
    } catch (e: any) {
      crossTenantError = e;
    }
    assert(
      crossTenantError !== null && crossTenantError.message.includes("Unauthorized"),
      "Cross-tenant subscription verification attempt is strictly blocked"
    );

    // Test 16: Security alert audit log recorded for cross-tenant attempt
    const crossTenantAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: "SubscriptionInvoice",
        entityId: checkoutB.invoiceId,
        action: AuditAction.SECURITY_ALERT,
      },
    });
    assert(
      crossTenantAudit !== null,
      "SECURITY_ALERT audit log is recorded when cross-tenant verification is attempted"
    );

    // Create a fresh checkout for Lab A to verify legitimate payment
    const validCheckoutA = await createSubscriptionCheckout({ labId: labA.id });
    const legitimatePaymentIdA = `pay_valid_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const legitimateSigA = generateSignature(
      validCheckoutA.gatewayOrderId,
      legitimatePaymentIdA,
      PLATFORM_KEY_SECRET
    );

    // Test 17: Legitimate signature verification succeeds
    const verifyResultA = await verifyAndConfirmSubscriptionPayment({
      invoiceId: validCheckoutA.invoiceId,
      gatewayOrderId: validCheckoutA.gatewayOrderId,
      gatewayPaymentId: legitimatePaymentIdA,
      gatewaySignature: legitimateSigA,
      labId: labA.id,
    });
    assert(
      verifyResultA.success === true && verifyResultA.status === PaymentStatus.PAID,
      "Legitimate payment verification succeeds and returns status: PAID"
    );

    // Test 18: SubscriptionPayment status updated to PAID with gateway metadata
    const verifiedPaymentRecord = await prisma.subscriptionPayment.findUnique({
      where: { id: validCheckoutA.paymentId },
    });
    assert(
      verifiedPaymentRecord?.status === PaymentStatus.PAID &&
        verifiedPaymentRecord.gatewayPaymentId === legitimatePaymentIdA &&
        verifiedPaymentRecord.gatewaySignature === legitimateSigA &&
        verifiedPaymentRecord.paidAt !== null,
      "SubscriptionPayment record correctly persisted as PAID with gateway reference"
    );

    // Test 19: SubscriptionInvoice status updated to PAID with amountPaid equal to amountDue
    const verifiedInvoiceRecord = await prisma.subscriptionInvoice.findUnique({
      where: { id: validCheckoutA.invoiceId },
    });
    assert(
      verifiedInvoiceRecord?.status === InvoiceStatus.PAID &&
        Number(verifiedInvoiceRecord.amountPaid) === Number(verifiedInvoiceRecord.amountDue) &&
        verifiedInvoiceRecord.paidAt !== null,
      "SubscriptionInvoice record correctly persisted as PAID with full amountPaid"
    );

    // Test 20: Subscription status updated to ACTIVE with 30-day period for monthly plan
    const verifiedSubA = await prisma.subscription.findUnique({
      where: { labId: labA.id },
    });
    const periodDurationDaysA = Math.round(
      (verifiedSubA!.currentPeriodEnd.getTime() - verifiedSubA!.currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    assert(
      verifiedSubA?.status === SubscriptionStatus.ACTIVE &&
        periodDurationDaysA >= 29 &&
        periodDurationDaysA <= 31 &&
        verifiedSubA.trialEndsAt === null &&
        verifiedSubA.gracePeriodEndsAt === null,
      "Subscription updated to ACTIVE, trial cleared, and 30-day period configured for monthly plan"
    );

    // Test 21: Idempotency of verifyAndConfirmSubscriptionPayment (same payment ID)
    const idempotentVerifyA = await verifyAndConfirmSubscriptionPayment({
      invoiceId: validCheckoutA.invoiceId,
      gatewayOrderId: validCheckoutA.gatewayOrderId,
      gatewayPaymentId: legitimatePaymentIdA,
      gatewaySignature: legitimateSigA,
      labId: labA.id,
    });
    assert(
      idempotentVerifyA.success === true && idempotentVerifyA.alreadyProcessed === true,
      "Repeated verification with identical payment ID is idempotent and returns alreadyProcessed"
    );

    // Test 22: Rejection of already paid invoice with a different payment ID
    let tamperedPaymentIdError: any = null;
    try {
      await verifyAndConfirmSubscriptionPayment({
        invoiceId: validCheckoutA.invoiceId,
        gatewayOrderId: validCheckoutA.gatewayOrderId,
        gatewayPaymentId: "pay_different_fraudulent_id",
        gatewaySignature: "dummy_sig",
        labId: labA.id,
      });
    } catch (e: any) {
      tamperedPaymentIdError = e;
    }
    assert(
      tamperedPaymentIdError !== null &&
        tamperedPaymentIdError.message.includes("already been paid with a different"),
      "Verification rejects already paid invoice if called with a different payment reference"
    );

    console.log("\n--- PART 4: PLATFORM WEBHOOK RAW BODY & CRYPTOGRAPHIC VERIFICATION ---");

    // Test 23: Missing x-razorpay-signature header throws 400 WebhookError
    let missingSigErr: any = null;
    try {
      await handleSubscriptionWebhook(JSON.stringify({ event: "subscription.charged" }), "");
    } catch (e: any) {
      missingSigErr = e;
    }
    assert(
      missingSigErr instanceof WebhookError && missingSigErr.statusCode === 400,
      "Missing x-razorpay-signature throws WebhookError with status 400"
    );

    // Test 24: Missing raw body throws 400 WebhookError
    let missingBodyErr: any = null;
    try {
      await handleSubscriptionWebhook("", "dummy_sig");
    } catch (e: any) {
      missingBodyErr = e;
    }
    assert(
      missingBodyErr instanceof WebhookError && missingBodyErr.statusCode === 400,
      "Missing webhook request body throws WebhookError with status 400"
    );

    // Test 25: Malformed JSON raw body throws 400 WebhookError
    let malformedJsonErr: any = null;
    try {
      await handleSubscriptionWebhook("{ bad json...", "dummy_sig");
    } catch (e: any) {
      malformedJsonErr = e;
    }
    assert(
      malformedJsonErr instanceof WebhookError && malformedJsonErr.statusCode === 400,
      "Malformed JSON payload throws WebhookError with status 400"
    );

    // Test 26: Payload without event field throws 400 WebhookError
    let missingEventErr: any = null;
    try {
      await handleSubscriptionWebhook(JSON.stringify({ id: 123 }), "dummy_sig");
    } catch (e: any) {
      missingEventErr = e;
    }
    assert(
      missingEventErr instanceof WebhookError && missingEventErr.statusCode === 400,
      "Payload missing event identifier throws WebhookError with status 400"
    );

    // Test 27: Invalid webhook signature throws 401 WebhookError
    const invalidSigWebhook = createSignedPlatformWebhook(
      { event: "subscription.charged" },
      "wrong_secret_123"
    );
    let invalidWebhookSigErr: any = null;
    try {
      await handleSubscriptionWebhook(invalidSigWebhook.rawBody, invalidSigWebhook.signature);
    } catch (e: any) {
      invalidWebhookSigErr = e;
    }
    assert(
      invalidWebhookSigErr instanceof WebhookError && invalidWebhookSigErr.statusCode === 401,
      "Invalid webhook signature throws WebhookError with status 401"
    );

    // Test 28: Invalid webhook signature logs SECURITY_ALERT audit log
    const invalidSigAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: "SUBSCRIPTION_WEBHOOK",
        action: AuditAction.SECURITY_ALERT,
      },
    });
    assert(
      invalidSigAudit !== null,
      "SECURITY_ALERT audit log recorded on invalid platform webhook signature"
    );

    console.log("\n--- PART 5: WEBHOOK SUBSCRIPTION RESOLUTION & EVENT PROCESSING ---");

    // Test 29: Unsupported platform event is safely acknowledged without error
    const ignoredWebhook = createSignedPlatformWebhook({
      event: "order.paid", // patient event sent to platform endpoint
      payload: {},
    });
    const ignoredResult = await handleSubscriptionWebhook(
      ignoredWebhook.rawBody,
      ignoredWebhook.signature
    );
    assert(
      ignoredResult.handled === false && ignoredResult.event === "order.paid",
      "Unsupported platform event safely ignored and acknowledged"
    );

    // Test 30: Webhook fails with 404 if provider reference does not match any subscription
    const unknownSubWebhook = createSignedPlatformWebhook({
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: "sub_unknown_9999999",
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          },
        },
      },
    });
    let unknownSubErr: any = null;
    try {
      await handleSubscriptionWebhook(unknownSubWebhook.rawBody, unknownSubWebhook.signature);
    } catch (e: any) {
      unknownSubErr = e;
    }
    assert(
      unknownSubErr instanceof WebhookError && unknownSubErr.statusCode === 404,
      "Webhook throws 404 WebhookError when provider reference cannot be resolved"
    );

    // Test 31: Webhook fails with 400 if currency is not INR
    const nonInrWebhook = createSignedPlatformWebhook({
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: "sub_test_provider_id_a",
            notes: { labId: labA.id },
          },
        },
        payment: {
          entity: {
            id: `pay_non_inr_${Date.now()}`,
            currency: "USD",
            amount: 5000,
          },
        },
      },
    });
    let nonInrErr: any = null;
    try {
      await handleSubscriptionWebhook(nonInrWebhook.rawBody, nonInrWebhook.signature);
    } catch (e: any) {
      nonInrErr = e;
    }
    assert(
      nonInrErr instanceof WebhookError &&
        nonInrErr.statusCode === 400 &&
        nonInrErr.message.includes("INR"),
      "Webhook rejects non-INR currency with status 400"
    );

    // Test 32: Resolve subscription via providerSubscriptionId
    const providerSubIdA = `sub_rzp_provider_${timestamp}`;
    await prisma.subscription.update({
      where: { labId: labA.id },
      data: { providerSubscriptionId: providerSubIdA },
    });

    const chargedEndA = Math.floor(Date.now() / 1000) + 35 * 86400; // 35 days in future
    const chargedWebhookA = createSignedPlatformWebhook({
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: providerSubIdA,
            current_start: Math.floor(Date.now() / 1000),
            current_end: chargedEndA,
          },
        },
        payment: {
          entity: {
            id: `pay_wh_chg_${Date.now()}`,
            amount: 499900,
            currency: "INR",
          },
        },
      },
    });

    const chargedResultA = await handleSubscriptionWebhook(
      chargedWebhookA.rawBody,
      chargedWebhookA.signature
    );
    assert(
      chargedResultA.handled === true && chargedResultA.event === "subscription.charged",
      "subscription.charged webhook handled successfully via providerSubscriptionId"
    );

    // Test 33: subscription.charged created invoice and payment records
    const chargedSubA = await prisma.subscription.findUnique({
      where: { labId: labA.id },
      include: { invoices: { include: { payments: true } } },
    });
    assert(
      chargedSubA?.status === SubscriptionStatus.ACTIVE &&
        chargedSubA.invoices.length >= 2,
      "subscription.charged verified subscription ACTIVE and invoice created"
    );

    // Test 34: Duplicate subscription.charged event is idempotent
    const duplicateChargedResult = await handleSubscriptionWebhook(
      chargedWebhookA.rawBody,
      chargedWebhookA.signature
    );
    assert(
      duplicateChargedResult.handled === true &&
        duplicateChargedResult.message.includes("idempotent"),
      "Duplicate subscription.charged webhook handled idempotently"
    );

    // Test 35: Stale-event protection in subscription.charged (older current_end does not roll back period)
    const activeSubBeforeStale = await prisma.subscription.findUnique({
      where: { labId: labA.id },
    });
    const originalPeriodEnd = activeSubBeforeStale!.currentPeriodEnd;

    const staleChargedWebhook = createSignedPlatformWebhook({
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: providerSubIdA,
            current_start: Math.floor(Date.now() / 1000) - 60 * 86400,
            current_end: Math.floor(Date.now() / 1000) - 30 * 86400, // Older period!
          },
        },
        payment: {
          entity: {
            id: `pay_wh_stale_${Date.now()}`,
            amount: 499900,
            currency: "INR",
          },
        },
      },
    });

    await handleSubscriptionWebhook(staleChargedWebhook.rawBody, staleChargedWebhook.signature);
    const subAfterStale = await prisma.subscription.findUnique({
      where: { labId: labA.id },
    });
    assert(
      subAfterStale!.currentPeriodEnd >= originalPeriodEnd,
      "Stale subscription.charged webhook does not roll back newer currentPeriodEnd"
    );

    // Test 36: Event subscription.halted transitions subscription to PAST_DUE
    const haltedWebhook = createSignedPlatformWebhook({
      event: "subscription.halted",
      payload: {
        subscription: {
          entity: {
            id: providerSubIdA,
          },
        },
      },
    });
    const haltedResult = await handleSubscriptionWebhook(
      haltedWebhook.rawBody,
      haltedWebhook.signature
    );
    assert(
      haltedResult.handled === true && haltedResult.event === "subscription.halted",
      "subscription.halted event handled successfully"
    );

    // Test 37: Subscription marked PAST_DUE with 7-day grace period
    const haltedSub = await prisma.subscription.findUnique({
      where: { labId: labA.id },
    });
    const graceRemainingDays = Math.round(
      (haltedSub!.gracePeriodEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    assert(
      haltedSub?.status === SubscriptionStatus.PAST_DUE &&
        graceRemainingDays >= 6 &&
        graceRemainingDays <= 8,
      "Subscription marked PAST_DUE with 7-day grace period configured"
    );

    // Test 38: Duplicate subscription.halted is idempotent
    const duplicateHaltedResult = await handleSubscriptionWebhook(
      haltedWebhook.rawBody,
      haltedWebhook.signature
    );
    assert(
      duplicateHaltedResult.handled === true &&
        duplicateHaltedResult.message.includes("idempotent"),
      "Duplicate subscription.halted handled idempotently"
    );

    // Test 39: Event payment.captured resolves subscription via paymentEntity.order_id
    // Prepare fresh checkout for Lab B
    const checkoutB2 = await createSubscriptionCheckout({ labId: labB.id });
    const capturedWebhookB = createSignedPlatformWebhook({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_cap_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            order_id: checkoutB2.gatewayOrderId,
            amount: expectedPaiseYearly,
            currency: "INR",
          },
        },
      },
    });

    const capturedResult = await handleSubscriptionWebhook(
      capturedWebhookB.rawBody,
      capturedWebhookB.signature
    );
    assert(
      capturedResult.handled === true && capturedResult.event === "payment.captured",
      "payment.captured webhook resolves subscription via gatewayOrderId and succeeds"
    );

    // Test 40: SubscriptionPayment and SubscriptionInvoice marked PAID following payment.captured
    const capturedPayment = await prisma.subscriptionPayment.findUnique({
      where: { id: checkoutB2.paymentId },
    });
    const capturedInvoice = await prisma.subscriptionInvoice.findUnique({
      where: { id: checkoutB2.invoiceId },
    });
    assert(
      capturedPayment?.status === PaymentStatus.PAID &&
        capturedInvoice?.status === InvoiceStatus.PAID,
      "SubscriptionPayment and SubscriptionInvoice transitioned to PAID by payment.captured"
    );

    // Test 41: Yearly subscription configured with 365-day period by payment.captured
    const capturedSubB = await prisma.subscription.findUnique({
      where: { labId: labB.id },
    });
    const periodDurationDaysB = Math.round(
      (capturedSubB!.currentPeriodEnd.getTime() - capturedSubB!.currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    assert(
      capturedSubB?.status === SubscriptionStatus.ACTIVE &&
        periodDurationDaysB >= 364 &&
        periodDurationDaysB <= 366,
      "Yearly subscription updated to ACTIVE with 365-day period duration"
    );

    // Test 42: Duplicate payment.captured is idempotent
    const duplicateCapturedResult = await handleSubscriptionWebhook(
      capturedWebhookB.rawBody,
      capturedWebhookB.signature
    );
    assert(
      duplicateCapturedResult.handled === true &&
        duplicateCapturedResult.message.includes("idempotent"),
      "Duplicate payment.captured event acknowledged idempotently"
    );

    // Test 43: Event payment.failed on pending checkout updates SubscriptionPayment to FAILED
    // Create new checkout for Lab B
    const failedCheckoutB = await createSubscriptionCheckout({ labId: labB.id });
    const failedWebhook = createSignedPlatformWebhook({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: failedCheckoutB.gatewayOrderId,
            currency: "INR",
            error_description: "Insufficient funds in bank account",
          },
        },
      },
    });

    const failedResult = await handleSubscriptionWebhook(
      failedWebhook.rawBody,
      failedWebhook.signature
    );
    assert(
      failedResult.handled === true && failedResult.event === "payment.failed",
      "payment.failed event processed successfully"
    );

    const failedPaymentRecord = await prisma.subscriptionPayment.findUnique({
      where: { id: failedCheckoutB.paymentId },
    });
    assert(
      failedPaymentRecord?.status === PaymentStatus.FAILED,
      "SubscriptionPayment marked as FAILED following payment.failed webhook"
    );

    // Test 44: Terminal state protection: payment.failed event NEVER downgrades already ACTIVE subscription
    const subActiveBeforeFail = await prisma.subscription.findUnique({
      where: { labId: labB.id },
    });
    assert(
      subActiveBeforeFail?.status === SubscriptionStatus.ACTIVE,
      "Lab B subscription is verified ACTIVE before terminal state protection test"
    );

    const outOfOrderFailWebhook = createSignedPlatformWebhook({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: `pay_ooo_fail_${Date.now()}`,
            order_id: checkoutB2.gatewayOrderId, // Order that is already PAID
            currency: "INR",
          },
        },
      },
    });

    const oooFailResult = await handleSubscriptionWebhook(
      outOfOrderFailWebhook.rawBody,
      outOfOrderFailWebhook.signature
    );
    const subActiveAfterFail = await prisma.subscription.findUnique({
      where: { labId: labB.id },
    });
    assert(
      oooFailResult.handled === true &&
        oooFailResult.message.includes("Terminal state preserved") &&
        subActiveAfterFail?.status === SubscriptionStatus.ACTIVE,
      "Terminal state preserved: out-of-order payment.failed cannot downgrade ACTIVE subscription"
    );

    // Test 45: Terminal state protection: already PAID SubscriptionPayment cannot be downgraded to FAILED
    const paymentPaidAfterFail = await prisma.subscriptionPayment.findUnique({
      where: { id: checkoutB2.paymentId },
    });
    assert(
      paymentPaidAfterFail?.status === PaymentStatus.PAID,
      "Terminal state preserved: already PAID SubscriptionPayment cannot be changed to FAILED"
    );

    console.log("\n--- PART 6: RACE CONDITIONS, CONCURRENCY & STRICT DOMAIN SEPARATION ---");

    // Test 46: Race Condition: Client verify succeeds first, followed by webhook payment.captured
    const raceCheckout = await createSubscriptionCheckout({ labId: labA.id });
    const racePaymentId = `pay_race_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const raceSig = generateSignature(
      raceCheckout.gatewayOrderId,
      racePaymentId,
      PLATFORM_KEY_SECRET
    );

    // Step 1: Client verification arrives
    const clientVerifyRaceRes = await verifyAndConfirmSubscriptionPayment({
      invoiceId: raceCheckout.invoiceId,
      gatewayOrderId: raceCheckout.gatewayOrderId,
      gatewayPaymentId: racePaymentId,
      gatewaySignature: raceSig,
      labId: labA.id,
    });
    assert(
      clientVerifyRaceRes.success === true,
      "Race condition step 1: client verification completes successfully"
    );

    // Step 2: Webhook payment.captured arrives next for same order
    const webhookRaceCapture = createSignedPlatformWebhook({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: racePaymentId,
            order_id: raceCheckout.gatewayOrderId,
            amount: expectedPaiseMonthly,
            currency: "INR",
          },
        },
      },
    });
    const webhookRaceRes = await handleSubscriptionWebhook(
      webhookRaceCapture.rawBody,
      webhookRaceCapture.signature
    );
    assert(
      webhookRaceRes.handled === true && webhookRaceRes.message.includes("idempotent"),
      "Race condition step 2: delayed webhook acknowledges already verified payment idempotently"
    );

    // Test 47: Race Condition: Webhook payment.captured arrives first, followed by client verify
    const raceCheckout2 = await createSubscriptionCheckout({ labId: labA.id });
    const racePaymentId2 = `pay_race2_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const raceSig2 = generateSignature(
      raceCheckout2.gatewayOrderId,
      racePaymentId2,
      PLATFORM_KEY_SECRET
    );

    // Step 1: Webhook arrives first
    const webhookRaceCapture2 = createSignedPlatformWebhook({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: racePaymentId2,
            order_id: raceCheckout2.gatewayOrderId,
            amount: expectedPaiseMonthly,
            currency: "INR",
          },
        },
      },
    });
    const webhookRaceRes2 = await handleSubscriptionWebhook(
      webhookRaceCapture2.rawBody,
      webhookRaceCapture2.signature
    );
    assert(
      webhookRaceRes2.handled === true && !webhookRaceRes2.message.includes("idempotent"),
      "Race condition reverse step 1: webhook captures payment first"
    );

    // Step 2: Client verify arrives next
    const clientVerifyRaceRes2 = await verifyAndConfirmSubscriptionPayment({
      invoiceId: raceCheckout2.invoiceId,
      gatewayOrderId: raceCheckout2.gatewayOrderId,
      gatewayPaymentId: racePaymentId2,
      gatewaySignature: raceSig2,
      labId: labA.id,
    });
    assert(
      clientVerifyRaceRes2.success === true && clientVerifyRaceRes2.alreadyProcessed === true,
      "Race condition reverse step 2: client verify returns alreadyProcessed cleanly"
    );

    // Test 48: Audit Trail: AuditLog records exist for subscription lifecycle events
    const subAuditLogs = await prisma.auditLog.findMany({
      where: {
        labId: labA.id,
        action: AuditAction.SUBSCRIPTION_CHANGED,
      },
    });
    assert(
      subAuditLogs.length >= 2,
      "SUBSCRIPTION_CHANGED audit logs consistently recorded for subscription activations"
    );

    // Test 49: Strict Financial Separation: PatientPayment count remains 100% unchanged
    const finalPatientPaymentCount = await prisma.patientPayment.count();
    assert(
      finalPatientPaymentCount === initialPatientPaymentCount,
      `Strict financial separation: zero PatientPayment records created (${finalPatientPaymentCount} === ${initialPatientPaymentCount})`
    );

    // Test 50: Strict Order Separation: Patient Order count remains 100% unchanged
    const finalOrderCount = await prisma.order.count();
    assert(
      finalOrderCount === initialOrderCount,
      `Strict order separation: zero patient Order records created or modified (${finalOrderCount} === ${initialOrderCount})`
    );

    // Test 51: Non-interference: Test master and lab test catalogue remains 100% unchanged
    const finalTestCount = await prisma.testMaster.count();
    assert(
      finalTestCount === initialTestCount,
      `Catalogue non-interference: Test count remains identical (${finalTestCount} === ${initialTestCount})`
    );

    // Test 52: Non-interference: Health checkup packages remain 100% unchanged
    const finalPackageCount = await prisma.package.count();
    assert(
      finalPackageCount === initialPackageCount,
      `Package non-interference: Package count remains identical (${finalPackageCount} === ${initialPackageCount})`
    );

    // Test 53: Non-interference: LabPaymentSettings remain 100% untouched
    const finalLabAPaymentSettings = await prisma.labPaymentSettings.findUnique({
      where: { labId: labA.id },
    });
    const finalLabBPaymentSettings = await prisma.labPaymentSettings.findUnique({
      where: { labId: labB.id },
    });
    assert(
      finalLabAPaymentSettings === null && finalLabBPaymentSettings === null,
      "LabPaymentSettings remained untouched across all Phase 5C-2 subscription operations"
    );

    // Test 54: Webhook resolution via notes.subscriptionId
    const notesSubWebhook = createSignedPlatformWebhook({
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            notes: { subscriptionId: subB.id },
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 365 * 86400,
          },
        },
        payment: {
          entity: {
            id: `pay_notes_sub_${Date.now()}`,
            amount: expectedPaiseYearly,
            currency: "INR",
          },
        },
      },
    });
    const notesSubResult = await handleSubscriptionWebhook(
      notesSubWebhook.rawBody,
      notesSubWebhook.signature
    );
    assert(
      notesSubResult.handled === true && notesSubResult.entityId === subB.id,
      "Webhook successfully resolves subscription via notes.subscriptionId"
    );

    // Test 55: Webhook resolution via notes.labId
    const notesLabWebhook = createSignedPlatformWebhook({
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            notes: { labId: labB.id },
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 365 * 86400,
          },
        },
        payment: {
          entity: {
            id: `pay_notes_lab_${Date.now()}`,
            amount: expectedPaiseYearly,
            currency: "INR",
          },
        },
      },
    });
    const notesLabResult = await handleSubscriptionWebhook(
      notesLabWebhook.rawBody,
      notesLabWebhook.signature
    );
    assert(
      notesLabResult.handled === true,
      "Webhook successfully resolves subscription via notes.labId"
    );

  } catch (err) {
    console.error("Critical test execution error:", err);
    failedTests++;
  } finally {
    // CLEANUP TEST FIXTURES
    console.log("\n--- CLEANING UP TEST FIXTURES ---");
    try {
      if (labA) {
        await prisma.subscriptionPayment.deleteMany({ where: { labId: labA.id } });
        await prisma.subscriptionInvoice.deleteMany({ where: { labId: labA.id } });
        await prisma.subscription.deleteMany({ where: { labId: labA.id } });
        await prisma.auditLog.deleteMany({ where: { labId: labA.id } });
        await prisma.lab.deleteMany({ where: { id: labA.id } });
      }
      if (labB) {
        await prisma.subscriptionPayment.deleteMany({ where: { labId: labB.id } });
        await prisma.subscriptionInvoice.deleteMany({ where: { labId: labB.id } });
        await prisma.subscription.deleteMany({ where: { labId: labB.id } });
        await prisma.auditLog.deleteMany({ where: { labId: labB.id } });
        await prisma.lab.deleteMany({ where: { id: labB.id } });
      }
      if (planMonthly) {
        await prisma.subscriptionPlan.deleteMany({ where: { id: planMonthly.id } });
      }
      if (planYearly) {
        await prisma.subscriptionPlan.deleteMany({ where: { id: planYearly.id } });
      }
      if (inactivePlan) {
        await prisma.subscriptionPlan.deleteMany({ where: { id: inactivePlan.id } });
      }
      console.log("Cleanup completed successfully.");
    } catch (cleanupErr) {
      console.warn("Cleanup encountered non-fatal error:", cleanupErr);
    }
  }

  console.log("\n==================================================");
  console.log(`PHASE 5C-2 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
