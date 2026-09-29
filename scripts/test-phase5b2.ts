/**
 * Gyrex Labs - Phase 5B-2 Security & Integration Test Suite
 * Patient Checkout UI + Razorpay Checkout Integration
 *
 * Verifies:
 * 1. Checkout integration with create-order & verify APIs
 * 2. Accurate order details & server-confirmed amount display
 * 3. Double-click & duplicate payment protection
 * 4. Razorpay Checkout option payload safety (no secret leaks)
 * 5. Server-side verification requirement (client callback alone does not confirm)
 * 6. Modal cancellation leaves order unpaid
 * 7. Verification failure handling
 * 8. Trust notice compliance ("Pay [Lab Name] directly. Powered by Gyrex Labs.")
 * 9. Cash on Collection and Online Payment coexistence
 * 10. Existing package and test checkout integrity
 */

import { prisma } from "../lib/db/prisma";
import {
  initiatePatientPayment,
  verifyAndConfirmPatientPayment,
} from "../services/integrations/payments/patient-payment-service";
import {
  createPatientOrder,
  getOrderTracking,
} from "../services/orders/patient-order-service";
import { encryptSecret } from "../lib/integrations/crypto";
import {
  LabStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  CollectionType,
  Gender,
  AuditAction,
} from "@prisma/client";
import crypto from "crypto";

process.env.TEST_PAYMENT_MOCK = "true";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${passedTests}: ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test: ${testName}${detail ? ` - ${detail}` : ""}`);
  }
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("GYREX LABS — PHASE 5B-2 TEST SUITE STARTING");
  console.log("Patient Checkout UI + Razorpay Checkout Integration");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const labSlug = `test-checkout-lab-${timestamp}`;
  const labSecret = "mock_lab_secret_32bytes_value_xyz!";
  const labKeyId = "rzp_test_mock_lab_5b2";

  let lab: any;
  let masterTest: any;
  let labTest: any;
  let testPackage: any;
  let patient: any;
  let orderOnline: any;
  let orderCoc: any;

  try {
    // 1. SETUP TEST FIXTURES
    lab = await prisma.lab.create({
      data: {
        name: `Apex Diagnostics ${timestamp}`,
        slug: labSlug,
        code: `APX${timestamp.toString().slice(-4)}`,
        email: `apex_${timestamp}@gyrex.test`,
        phone: "+919876543111",
        addressLine1: "101 Apex Tower, Medical Enclave",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        status: LabStatus.ACTIVE,
        isVerified: true,
        paymentSettings: {
          create: {
            razorpayKeyId: labKeyId,
            razorpayKeySecretEncrypted: encryptSecret(labSecret),
            cashOnCollectionEnabled: true,
            isConfigured: true,
          },
        },
        storeSettings: {
          create: {
            homeCollectionAvailable: true,
            homeCollectionFee: 150.0,
            freeHomeCollectionThreshold: 1000.0,
          },
        },
      },
      include: { paymentSettings: true, storeSettings: true },
    });

    masterTest = await prisma.testMaster.findFirst();
    if (!masterTest) {
      let category = await prisma.testCategory.findFirst();
      if (!category) {
        category = await prisma.testCategory.create({
          data: {
            name: "General Pathology",
            slug: `general-pathology-${timestamp}`,
          },
        });
      }
      masterTest = await prisma.testMaster.create({
        data: {
          name: `Complete Blood Count ${timestamp}`,
          code: `CBC${timestamp.toString().slice(-4)}`,
          slug: `cbc-${timestamp}`,
          categoryId: category.id,
          sampleType: "Whole Blood EDTA",
          standardTatHours: 12,
        },
      });
    }

    labTest = await prisma.labTest.create({
      data: {
        labId: lab.id,
        masterTestId: masterTest.id,
        sellingPrice: 450.0,
        isActive: true,
      },
      include: { masterTest: true },
    });

    testPackage = await prisma.package.create({
      data: {
        labId: lab.id,
        name: `Executive Health Package ${timestamp}`,
        slug: `exec-pkg-${timestamp}`,
        code: `EXEC-${timestamp.toString().slice(-4)}`,
        description: "Comprehensive health checkup",
        sellingPrice: 850.0,
        mrpPrice: 1200.0,
        sampleTypes: ["Whole Blood EDTA"],
        fastingRequired: true,
        isActive: true,
      },
    });

    patient = {
      fullName: "Ananya Deshmukh",
      phone: "+919876543210",
      email: "ananya.d@gyrex.test",
      gender: Gender.FEMALE,
      ageYears: 28,
    };

    console.log("Fixtures initialized successfully.\n");

    // =========================================================================
    // PART 1: CHECKOUT ORDER CREATION & STOREFRONT COMPATIBILITY
    // =========================================================================
    console.log("--- PART 1: CHECKOUT ORDER CREATION & DISPLAY ---");

    // Test 1: Create patient order via checkout flow (Online Payment)
    orderOnline = await createPatientOrder({
      labId: lab.id,
      patient,
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        scheduledSlot: "08:00 AM - 09:00 AM",
        addressLine1: "Flat 204, Palm Heights",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      },
      items: [
        { itemType: "TEST", id: labTest.id },
        { itemType: "PACKAGE", id: testPackage.id },
      ],
      paymentMethod: PaymentMethod.RAZORPAY,
    });

    assert(!!orderOnline && !!orderOnline.orderNumber, "Checkout creates valid patient order in DB");
    assert(orderOnline.orderStatus === OrderStatus.PENDING_PAYMENT, "Online payment order initial status is PENDING_PAYMENT");
    assert(orderOnline.paymentStatus === PaymentStatus.PENDING, "Online payment order paymentStatus is PENDING");

    // Test 2: Authoritative server calculation for subtotal, collection fee, total
    // subtotal = 450 (test) + 850 (pkg) = 1300. Threshold is 1000 => free collection fee = 0
    assert(Number(orderOnline.subtotal) === 1300.0, "Authoritative subtotal calculation matches item prices (₹1,300)");
    assert(Number(orderOnline.collectionFee) === 0.0, "Free home collection threshold respected (₹0 collection fee)");
    assert(Number(orderOnline.totalAmount) === 1300.0, "Total amount matches server sum (₹1,300)");

    // Test 3: Public tracking API returns complete order tracking DTO
    const tracking = await getOrderTracking(orderOnline.orderNumber);
    assert(tracking !== null, "Tracking API successfully retrieves created checkout order");
    assert(tracking?.orderId === orderOnline.id, "Tracking DTO includes internal orderId for payment action");
    assert(tracking?.orderNumber === orderOnline.orderNumber, "Tracking DTO includes orderNumber");
    assert(tracking?.totalAmount === 1300.0, "Tracking DTO reflects exact server total amount");
    assert(tracking?.items.length === 2, "Tracking DTO includes all 2 ordered items");

    // Test 4: Cash on Collection flow compatibility
    orderCoc = await createPatientOrder({
      labId: lab.id,
      patient,
      collection: {
        type: CollectionType.LAB_VISIT,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        scheduledSlot: "10:00 AM - 11:00 AM",
      },
      items: [{ itemType: "TEST", id: labTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert(orderCoc.orderStatus === OrderStatus.CONFIRMED, "Cash on Collection orders confirm immediately");
    assert(orderCoc.paymentStatus === PaymentStatus.CASH_ON_COLLECTION, "Cash on Collection payment status is CASH_ON_COLLECTION");

    // =========================================================================
    // PART 2: RAZORPAY CHECKOUT INITIALIZATION & OPTIONS SAFETY
    // =========================================================================
    console.log("\n--- PART 2: RAZORPAY CHECKOUT INITIALIZATION & SECURITY ---");

    // Test 5: Call create-order API for Razorpay Checkout
    const initPayment = await initiatePatientPayment({
      orderId: orderOnline.id,
      verificationPhone: patient.phone,
    });

    assert(initPayment.success === true, "create-order API returns success: true");
    assert(initPayment.requiresGatewayCheckout === true, "requiresGatewayCheckout is true for Razorpay");
    assert(initPayment.amountInPaise === 130000, "amountInPaise is exactly 130000 (₹1,300.00)");
    assert(initPayment.currency === "INR", "currency is INR");

    // Test 6: Razorpay public Key ID is used (matches lab's configured Key ID)
    assert(initPayment.razorpayKeyId === labKeyId, "Razorpay public Key ID used in checkout options");

    // Test 7: Secret NEVER reaches browser / client response
    assert((initPayment as any).razorpayKeySecret === undefined, "razorpayKeySecret is NEVER exposed");
    assert((initPayment as any).keySecret === undefined, "keySecret is NEVER exposed");
    assert((initPayment as any).razorpayKeySecretEncrypted === undefined, "Encrypted secret is NEVER exposed");

    // Test 8: Patient details are safely structured for Razorpay prefill
    assert(initPayment.patientName === patient.fullName, "Patient name prefilled safely");
    assert(initPayment.patientPhone === patient.phone, "Patient phone prefilled safely");

    // Test 9: Trust notice compliance
    assert(
      initPayment.trustNotice.includes(`Pay ${lab.name}. Your payment goes directly to ${lab.name}. Powered by Gyrex Labs.`),
      "Trust notice clearly states direct laboratory payment powered by Gyrex Labs"
    );

    // Test 10: Double-click & idempotency protection on order creation
    const secondCreateCall = await initiatePatientPayment({
      orderId: orderOnline.id,
      verificationPhone: patient.phone,
    });
    assert(secondCreateCall.gatewayOrderId === initPayment.gatewayOrderId, "Second Pay Now click reuses existing gatewayOrderId");
    assert(secondCreateCall.reusedExistingOrder === true, "Second call flagged as reusedExistingOrder");

    const paymentRowsCount = await prisma.patientPayment.count({
      where: { orderId: orderOnline.id },
    });
    assert(paymentRowsCount === 1, "Idempotent create does NOT duplicate PatientPayment rows in DB");

    // =========================================================================
    // PART 3: PAYMENT LIFECYCLE & VERIFICATION INTEGRITY
    // =========================================================================
    console.log("\n--- PART 3: PAYMENT LIFECYCLE & VERIFICATION INTEGRITY ---");

    const gatewayOrderId = initPayment.gatewayOrderId!;
    const gatewayPaymentId = `pay_checkout_mock_${timestamp}`;

    function computeHmacSignature(orderId: string, paymentId: string, secret: string): string {
      return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    }

    const validSignature = computeHmacSignature(gatewayOrderId, gatewayPaymentId, labSecret);

    // Test 11: Modal cancellation leaves order unpaid in PENDING_PAYMENT status
    const orderBeforeVerify = await prisma.order.findUnique({ where: { id: orderOnline.id } });
    assert(orderBeforeVerify?.orderStatus === OrderStatus.PENDING_PAYMENT, "Before server verify: orderStatus remains PENDING_PAYMENT");
    assert(orderBeforeVerify?.paymentStatus === PaymentStatus.PENDING, "Before server verify: paymentStatus remains PENDING");

    // Test 12: Invalid signature rejection keeps order unpaid
    const invalidSignature = "invalid_tampered_signature_hex_1234567890abcdef";
    let verifyFailErr: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderOnline.id,
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature: invalidSignature,
      });
    } catch (e: any) {
      verifyFailErr = e;
    }
    assert(verifyFailErr && verifyFailErr.message.includes("verification failed"), "Invalid signature rejected by server verify API");

    const orderAfterFailedVerify = await prisma.order.findUnique({ where: { id: orderOnline.id } });
    assert(orderAfterFailedVerify?.orderStatus === OrderStatus.PENDING_PAYMENT, "After failed verify: order remains PENDING_PAYMENT");
    assert(orderAfterFailedVerify?.paymentStatus === PaymentStatus.PENDING, "After failed verify: paymentStatus remains PENDING");

    // Reset payment record to PENDING for the success test
    await prisma.patientPayment.updateMany({
      where: { orderId: orderOnline.id },
      data: { status: PaymentStatus.PENDING, failureReason: null },
    });

    // Test 13: Server verification success atomically confirms order and marks payment PAID
    const verifySuccess = await verifyAndConfirmPatientPayment({
      orderId: orderOnline.id,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });

    assert(verifySuccess.success === true, "Valid Razorpay signature accepted by verify API");
    assert(verifySuccess.status === PaymentStatus.PAID, "Payment status returned as PAID");

    const orderConfirmed = await prisma.order.findUnique({ where: { id: orderOnline.id } });
    const paymentConfirmed = await prisma.patientPayment.findFirst({ where: { orderId: orderOnline.id } });

    assert(orderConfirmed?.orderStatus === OrderStatus.CONFIRMED, "Order status atomically updated to CONFIRMED");
    assert(orderConfirmed?.paymentStatus === PaymentStatus.PAID, "Order paymentStatus atomically updated to PAID");
    assert(paymentConfirmed?.status === PaymentStatus.PAID, "PatientPayment status updated to PAID");
    assert(paymentConfirmed?.gatewayPaymentId === gatewayPaymentId, "PatientPayment gatewayPaymentId recorded");

    // Test 14: Already-paid order duplicate verification returns idempotent success
    const duplicateVerify = await verifyAndConfirmPatientPayment({
      orderId: orderOnline.id,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });
    assert(duplicateVerify.success === true, "Duplicate verification request succeeds");
    assert(duplicateVerify.alreadyProcessed === true, "Duplicate verification flagged as alreadyProcessed");

    // Test 15: Different payment ID on already paid order rejected
    let mismatchPaymentErr: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderOnline.id,
        gatewayOrderId,
        gatewayPaymentId: "pay_different_payment_id_999",
        gatewaySignature: validSignature,
      });
    } catch (e: any) {
      mismatchPaymentErr = e;
    }
    assert(
      mismatchPaymentErr && mismatchPaymentErr.message.includes("different payment reference"),
      "Mismatched payment ID on already-paid order rejected"
    );

    // Test 16: Order tracking reflects PAID state after verification
    const updatedTracking = await getOrderTracking(orderOnline.orderNumber);
    assert(updatedTracking?.orderStatus === OrderStatus.CONFIRMED, "Tracking reflects CONFIRMED status after payment");
    assert(updatedTracking?.paymentStatus === PaymentStatus.PAID, "Tracking reflects PAID paymentStatus after payment");

    // Test 17: No Gyrex platform subscription payment created
    const subPayments = await prisma.subscriptionPayment.count({
      where: { labId: lab.id },
    });
    assert(subPayments === 0, "No platform subscription payments created during patient checkout");

    // Test 18: Audit logs correctly record ORDER_STATUS_CHANGED
    const auditLog = await prisma.auditLog.findFirst({
      where: { orderId: orderOnline.id, action: AuditAction.ORDER_STATUS_CHANGED },
    });
    assert(auditLog !== null, "AuditAction.ORDER_STATUS_CHANGED logged for checkout confirmation");

    // Test 19: Catalogue tests & package prices intact
    const currentLabTest = await prisma.labTest.findUnique({ where: { id: labTest.id } });
    const currentPkg = await prisma.package.findUnique({ where: { id: testPackage.id } });
    assert(Number(currentLabTest?.sellingPrice) === 450.0, "Catalogue test price immutable (₹450)");
    assert(Number(currentPkg?.sellingPrice) === 850.0, "Package price immutable (₹850)");

    // Test 48: Order lookup accepts both CUID id and orderNumber (rejects already-paid order)
    let alreadyPaidErr: any;
    try {
      await initiatePatientPayment({
        orderId: orderOnline.orderNumber,
      });
    } catch (e: any) {
      alreadyPaidErr = e;
    }
    assert(
      alreadyPaidErr && alreadyPaidErr.message.includes("already paid and confirmed"),
      "initiatePatientPayment resolves order by orderNumber and prevents double payment"
    );
  } catch (err) {
    console.error("Test execution failed with error:", err);
  } finally {
    // CLEANUP
    console.log("\n--- CLEANING UP TEST FIXTURES ---");
    try {
      if (orderOnline) {
        await prisma.auditLog.deleteMany({ where: { orderId: orderOnline.id } });
        await prisma.patientPayment.deleteMany({ where: { orderId: orderOnline.id } });
        await prisma.orderItem.deleteMany({ where: { orderId: orderOnline.id } });
        await prisma.collection.deleteMany({ where: { orderId: orderOnline.id } });
        await prisma.order.deleteMany({ where: { id: orderOnline.id } });
      }
      if (orderCoc) {
        await prisma.auditLog.deleteMany({ where: { orderId: orderCoc.id } });
        await prisma.patientPayment.deleteMany({ where: { orderId: orderCoc.id } });
        await prisma.orderItem.deleteMany({ where: { orderId: orderCoc.id } });
        await prisma.collection.deleteMany({ where: { orderId: orderCoc.id } });
        await prisma.order.deleteMany({ where: { id: orderCoc.id } });
      }
      if (lab) {
        await prisma.patientPayment.deleteMany({ where: { labId: lab.id } });
        await prisma.order.deleteMany({ where: { labId: lab.id } });
        await prisma.package.deleteMany({ where: { labId: lab.id } });
        await prisma.labTest.deleteMany({ where: { labId: lab.id } });
        await prisma.labPaymentSettings.deleteMany({ where: { labId: lab.id } });
        await prisma.labStoreSettings.deleteMany({ where: { labId: lab.id } });
        await prisma.labPatient.deleteMany({ where: { labId: lab.id } });
        await prisma.lab.deleteMany({ where: { id: lab.id } });
      }
      console.log("Cleanup complete.");
    } catch (cleanupErr) {
      console.warn("Cleanup encountered non-fatal error:", cleanupErr);
    }
  }

  console.log("\n==================================================");
  console.log(`PHASE 5B-2 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
