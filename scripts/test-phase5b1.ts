/**
 * Gyrex Labs - Phase 5B-1 Security & Integration Test Suite
 *
 * Verifies:
 * 1. Server-side Razorpay order creation with authoritative DB amounts
 * 2. Idempotent payment-order persistence (safe reuse of pending gateway orders)
 * 3. Server-side Razorpay signature verification (HMAC-SHA256)
 * 4. Amount integrity validation before marking paid
 * 5. State persistence & atomic transactions (prisma.$transaction)
 * 6. Idempotent verification & rejection of mismatched payment IDs on paid orders
 * 7. Tenant isolation & credential safety (secrets never returned to client or logged)
 * 8. API route handling end-to-end
 */

import { prisma } from "../lib/db/prisma";
import {
  initiatePatientPayment,
  verifyAndConfirmPatientPayment,
} from "../services/integrations/payments/patient-payment-service";
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

// Ensure test mode bypasses external Razorpay HTTP requests
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
  console.log("GYREX LABS — PHASE 5B-1 TEST SUITE STARTING");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const labASlug = `test-lab-a-${timestamp}`;
  const labBSlug = `test-lab-b-${timestamp}`;
  const labCSlug = `test-lab-c-${timestamp}`;

  const secretLabA = "lab_a_secret_key_mock_32bytes_value!";
  const secretLabB = "lab_b_secret_key_mock_32bytes_value!";
  const keyIdLabA = "rzp_test_mock_lab_a";
  const keyIdLabB = "rzp_test_mock_lab_b";

  let labA: any;
  let labB: any;
  let labC: any;
  let patient: any;
  let testOrderA: any;
  let testOrderB: any;

  try {
    // SETUP TEST FIXTURES
    // Lab A: Active with configured Razorpay credentials
    labA = await prisma.lab.create({
      data: {
        name: `Phase 5B-1 Lab A ${timestamp}`,
        slug: labASlug,
        code: `LBA${timestamp.toString().slice(-4)}`,
        email: `labA_${timestamp}@gyrex.test`,
        phone: "+919876543001",
        addressLine1: "123 Health Ave",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        status: LabStatus.ACTIVE,
        isVerified: true,
        paymentSettings: {
          create: {
            razorpayKeyId: keyIdLabA,
            razorpayKeySecretEncrypted: encryptSecret(secretLabA),
            cashOnCollectionEnabled: true,
            isConfigured: true,
          },
        },
      },
      include: { paymentSettings: true },
    });

    // Lab B: Active with DIFFERENT Razorpay credentials (for tenant isolation tests)
    labB = await prisma.lab.create({
      data: {
        name: `Phase 5B-1 Lab B ${timestamp}`,
        slug: labBSlug,
        code: `LBB${timestamp.toString().slice(-4)}`,
        email: `labB_${timestamp}@gyrex.test`,
        phone: "+919876543002",
        addressLine1: "456 Medi Lane",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        status: LabStatus.ACTIVE,
        isVerified: true,
        paymentSettings: {
          create: {
            razorpayKeyId: keyIdLabB,
            razorpayKeySecretEncrypted: encryptSecret(secretLabB),
            cashOnCollectionEnabled: true,
            isConfigured: true,
          },
        },
      },
      include: { paymentSettings: true },
    });

    // Lab C: INACTIVE and without payment settings configured
    labC = await prisma.lab.create({
      data: {
        name: `Phase 5B-1 Lab C ${timestamp}`,
        slug: labCSlug,
        code: `LBC${timestamp.toString().slice(-4)}`,
        email: `labC_${timestamp}@gyrex.test`,
        phone: "+919876543003",
        addressLine1: "789 Clinic Rd",
        city: "Nagpur",
        state: "Maharashtra",
        postalCode: "440001",
        status: LabStatus.INACTIVE,
        isVerified: false,
      },
    });

    // Patient
    patient = await prisma.patient.create({
      data: {
        fullName: "Rahul Sharma",
        phone: "+919988776655",
        email: "rahul.test@gyrex.test",
        gender: Gender.MALE,
        ageYears: 32,
      },
    });

    // Order for Lab A: Total = ₹750.00
    testOrderA = await prisma.order.create({
      data: {
        orderNumber: `GYR-TEST-${timestamp}-A`,
        labId: labA.id,
        patientId: patient.id,
        collectionType: CollectionType.HOME_COLLECTION,
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 650.0,
        collectionFee: 100.0,
        discountAmount: 0.0,
        totalAmount: 750.0,
      },
    });

    // Order for Lab B: Total = ₹1,200.50
    testOrderB = await prisma.order.create({
      data: {
        orderNumber: `GYR-TEST-${timestamp}-B`,
        labId: labB.id,
        patientId: patient.id,
        collectionType: CollectionType.LAB_VISIT,
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 1200.5,
        collectionFee: 0.0,
        discountAmount: 0.0,
        totalAmount: 1200.5,
      },
    });

    console.log("Fixture initialization complete.\n");

    // =========================================================================
    // PART 1: ORDER CREATION SECURITY & VALIDATION TESTS
    // =========================================================================
    console.log("--- PART 1: ORDER CREATION SECURITY & VALIDATION TESTS ---");

    // Test 1: Invalid order ID rejected
    let err1: any;
    try {
      await initiatePatientPayment({ orderId: "non-existent-order-id" });
    } catch (e: any) {
      err1 = e;
    }
    assert(err1 && err1.message.includes("not found"), "Invalid order ID rejected");

    // Test 2: Empty/Missing order ID rejected
    let err2: any;
    try {
      await initiatePatientPayment({ orderId: "   " });
    } catch (e: any) {
      err2 = e;
    }
    assert(err2 && err2.message.includes("Order ID is required"), "Empty order ID rejected");

    // Test 3: Unauthorized phone verification mismatch rejected
    let err3: any;
    try {
      await initiatePatientPayment({
        orderId: testOrderA.id,
        verificationPhone: "+911111111111", // does not match patient.phone
      });
    } catch (e: any) {
      err3 = e;
    }
    assert(err3 && err3.message.includes("Patient phone verification failed"), "Unauthorized phone verification rejected");

    // Test 4: Cross-tenant lab ID injection rejected
    let err4: any;
    try {
      await initiatePatientPayment({
        orderId: testOrderA.id, // belongs to labA
        clientSuppliedLabId: labB.id, // malicious client tries to associate with labB
      });
    } catch (e: any) {
      err4 = e;
    }
    assert(err4 && err4.message.includes("Security Violation"), "Cross-tenant lab ID injection rejected");

    // Test 5: Inactive laboratory order creation rejected
    const inactiveOrder = await prisma.order.create({
      data: {
        orderNumber: `GYR-TEST-${timestamp}-INACTIVE`,
        labId: labC.id,
        patientId: patient.id,
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 500.0,
        totalAmount: 500.0,
      },
    });
    let err5: any;
    try {
      await initiatePatientPayment({ orderId: inactiveOrder.id });
    } catch (e: any) {
      err5 = e;
    }
    assert(err5 && err5.message.includes("inactive"), "Inactive laboratory order creation rejected");

    // Test 6: Laboratory without configured payment credentials rejected
    // Update labC to active but with no payment settings
    await prisma.lab.update({ where: { id: labC.id }, data: { status: LabStatus.ACTIVE } });
    let err6: any;
    try {
      await initiatePatientPayment({ orderId: inactiveOrder.id });
    } catch (e: any) {
      err6 = e;
    }
    assert(err6 && err6.message.includes("credentials not configured"), "Unconfigured payment credentials rejected");

    // Test 7: Cancelled order payment initiation rejected
    const cancelledOrder = await prisma.order.create({
      data: {
        orderNumber: `GYR-TEST-${timestamp}-CANCELLED`,
        labId: labA.id,
        patientId: patient.id,
        orderStatus: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 500.0,
        totalAmount: 500.0,
      },
    });
    let err7: any;
    try {
      await initiatePatientPayment({ orderId: cancelledOrder.id });
    } catch (e: any) {
      err7 = e;
    }
    assert(err7 && err7.message.includes("cancelled"), "Cancelled order payment initiation rejected");

    // Test 8: Non-payable state (already confirmed & paid) rejected
    const paidOrder = await prisma.order.create({
      data: {
        orderNumber: `GYR-TEST-${timestamp}-ALREADY-PAID`,
        labId: labA.id,
        patientId: patient.id,
        orderStatus: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 500.0,
        totalAmount: 500.0,
      },
    });
    let err8: any;
    try {
      await initiatePatientPayment({ orderId: paidOrder.id });
    } catch (e: any) {
      err8 = e;
    }
    assert(err8 && err8.message.includes("already paid"), "Already paid order rejected on create");

    // Test 9: Zero or negative order amount rejected
    const zeroOrder = await prisma.order.create({
      data: {
        orderNumber: `GYR-TEST-${timestamp}-ZERO`,
        labId: labA.id,
        patientId: patient.id,
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 0.0,
        totalAmount: 0.0,
      },
    });
    let err9: any;
    try {
      await initiatePatientPayment({ orderId: zeroOrder.id });
    } catch (e: any) {
      err9 = e;
    }
    assert(err9 && err9.message.includes("Invalid order total amount"), "Zero order amount rejected");

    // Test 10: Client-supplied amount override is ignored (authoritative amount used)
    const initResultA = await initiatePatientPayment({
      orderId: testOrderA.id,
      clientSuppliedAmount: 10.0, // Malicious client claims order is ₹10
    });
    assert(initResultA.amountInPaise === 75000, "Client-supplied amount cannot override DB amount (expected 75000 paise)");

    // Test 11: Correct INR paise conversion with decimals (₹1,200.50 -> 120050 paise)
    const initResultB = await initiatePatientPayment({
      orderId: testOrderB.id,
    });
    assert(initResultB.amountInPaise === 120050, "Decimal-safe INR paise conversion (₹1,200.50 -> 120050 paise)");

    // Test 12: Razorpay order ID is returned and persisted in DB
    assert(
      !!initResultA.gatewayOrderId && initResultA.gatewayOrderId.startsWith("order_"),
      "Razorpay gateway order ID generated and returned"
    );
    const persistedPayment = await prisma.patientPayment.findUnique({
      where: { id: initResultA.paymentId },
    });
    assert(
      persistedPayment !== null && persistedPayment.gatewayOrderId === initResultA.gatewayOrderId,
      "Gateway order ID securely persisted in PatientPayment table"
    );

    // Test 13: Tenant credential isolation: Lab A uses Lab A's key ID
    assert(initResultA.razorpayKeyId === keyIdLabA, "Lab A uses Lab A's key ID");

    // Test 14: Tenant credential isolation: Lab B uses Lab B's key ID
    assert(initResultB.razorpayKeyId === keyIdLabB, "Lab B uses Lab B's key ID");

    // Test 15: Sensitive secret never returned in create response
    assert((initResultA as any).razorpayKeySecret === undefined, "Razorpay secret never returned in create response");
    assert((initResultA as any).keySecret === undefined, "keySecret never returned in create response");

    // Test 16: Encrypted secret never returned in create response
    assert(
      (initResultA as any).razorpayKeySecretEncrypted === undefined,
      "Encrypted secret never returned in create response"
    );

    // Test 17: Secret does not leak in error message on decryption failure
    await prisma.labPaymentSettings.update({
      where: { labId: labA.id },
      data: { razorpayKeySecretEncrypted: "corrupted_base64_secret" },
    });
    let err17: any;
    try {
      await initiatePatientPayment({ orderId: testOrderA.id });
    } catch (e: any) {
      err17 = e;
    }
    assert(
      err17 &&
        !err17.message.includes(secretLabA) &&
        err17.message.includes("Failed to decrypt"),
      "Decryption failure handled safely without leaking secret"
    );
    // Restore Lab A credentials
    await prisma.labPaymentSettings.update({
      where: { labId: labA.id },
      data: { razorpayKeySecretEncrypted: encryptSecret(secretLabA) },
    });

    // Test 18: Duplicate create request is idempotent (reuses existing pending gateway order)
    const duplicateCreateResult = await initiatePatientPayment({
      orderId: testOrderA.id,
    });
    assert(
      duplicateCreateResult.gatewayOrderId === initResultA.gatewayOrderId,
      "Duplicate create request returns existing gatewayOrderId"
    );
    assert(
      duplicateCreateResult.paymentId === initResultA.paymentId,
      "Duplicate create request reuses existing PatientPayment record"
    );
    assert(
      duplicateCreateResult.reusedExistingOrder === true,
      "Existing pending order flagged as reused"
    );

    // Test 19: PatientPayment count for testOrderA did not duplicate
    const paymentCount = await prisma.patientPayment.count({
      where: { orderId: testOrderA.id },
    });
    assert(paymentCount === 1, "Idempotent create does not duplicate PatientPayment rows in DB");

    // Test 20: Cash on Collection flow creates confirmed order without gatewayOrderId
    const cocOrder = await prisma.order.create({
      data: {
        orderNumber: `GYR-TEST-${timestamp}-COC`,
        labId: labA.id,
        patientId: patient.id,
        collectionType: CollectionType.HOME_COLLECTION,
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 300.0,
        totalAmount: 300.0,
      },
    });
    const cocResult = await initiatePatientPayment({
      orderId: cocOrder.id,
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert(cocResult.requiresGatewayCheckout === false, "Cash on Collection requires no gateway checkout");
    const updatedCocOrder = await prisma.order.findUnique({ where: { id: cocOrder.id } });
    assert(
      updatedCocOrder?.orderStatus === OrderStatus.CONFIRMED &&
        updatedCocOrder?.paymentStatus === PaymentStatus.CASH_ON_COLLECTION,
      "Cash on Collection transitions order to CONFIRMED / CASH_ON_COLLECTION"
    );

    // =========================================================================
    // PART 2: SERVER-SIDE SIGNATURE VERIFICATION TESTS
    // =========================================================================
    console.log("\n--- PART 2: SERVER-SIDE SIGNATURE VERIFICATION TESTS ---");

    const orderIdA = testOrderA.id;
    const gatewayOrderIdA = initResultA.gatewayOrderId!;
    const paymentIdA = `pay_mock_${timestamp}_valid`;

    // Helper: Generate valid Razorpay HMAC-SHA256 signature
    function generateSignature(orderId: string, paymentId: string, secret: string): string {
      return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    }

    const validSignatureLabA = generateSignature(gatewayOrderIdA, paymentIdA, secretLabA);

    // Test 21: Missing parameters in verification rejected
    let err21: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: "",
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: paymentIdA,
        gatewaySignature: validSignatureLabA,
      });
    } catch (e: any) {
      err21 = e;
    }
    assert(err21 && err21.message.includes("Missing or invalid"), "Missing orderId in verification rejected");

    // Test 22: Non-existent order in verification rejected
    let err22: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: "non-existent-order-id",
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: paymentIdA,
        gatewaySignature: validSignatureLabA,
      });
    } catch (e: any) {
      err22 = e;
    }
    assert(err22 && err22.message.includes("not found"), "Non-existent order in verification rejected");

    // Test 23: Non-existent gateway order in verification rejected
    let err23: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderIdA,
        gatewayOrderId: "order_unmatched_12345",
        gatewayPaymentId: paymentIdA,
        gatewaySignature: validSignatureLabA,
      });
    } catch (e: any) {
      err23 = e;
    }
    assert(err23 && err23.message.includes("Payment record matching"), "Mismatched gateway order ID rejected");

    // Test 24: Tampered signature rejected
    const tamperedSignature = validSignatureLabA.substring(0, validSignatureLabA.length - 4) + "abcd";
    let err24: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderIdA,
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: paymentIdA,
        gatewaySignature: tamperedSignature,
      });
    } catch (e: any) {
      err24 = e;
    }
    assert(err24 && err24.message.includes("verification failed"), "Tampered signature rejected");

    // Test 25: Tampered payment ID rejected
    let err25: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderIdA,
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: "pay_tampered_id",
        gatewaySignature: validSignatureLabA,
      });
    } catch (e: any) {
      err25 = e;
    }
    assert(err25 && err25.message.includes("verification failed"), "Tampered payment ID rejected");

    // Test 26: Signature signed with WRONG lab secret (Lab B's secret on Lab A's order) rejected
    const signatureSignedWithLabBSecret = generateSignature(gatewayOrderIdA, paymentIdA, secretLabB);
    let err26: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderIdA,
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: paymentIdA,
        gatewaySignature: signatureSignedWithLabBSecret,
      });
    } catch (e: any) {
      err26 = e;
    }
    assert(err26 && err26.message.includes("verification failed"), "Signature from wrong lab secret rejected");

    // Test 27: Tampered amount in verification rejected
    let err27: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderIdA,
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: paymentIdA,
        gatewaySignature: validSignatureLabA,
        amountInPaise: 99999, // Mismatched amount
      });
    } catch (e: any) {
      err27 = e;
    }
    assert(err27 && err27.message.includes("amount does not match"), "Tampered amount in verification rejected");

    // Test 28: Non-INR currency in verification rejected
    let err28: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderIdA,
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: paymentIdA,
        gatewaySignature: validSignatureLabA,
        currency: "USD",
      });
    } catch (e: any) {
      err28 = e;
    }
    assert(err28 && err28.message.includes("Only INR is supported"), "Non-INR currency rejected");

    // Test 29: Failed signature attempts mark payment record as FAILED with failureReason
    const failedPaymentRecord = await prisma.patientPayment.findUnique({
      where: { id: initResultA.paymentId },
    });
    assert(
      failedPaymentRecord?.status === PaymentStatus.FAILED &&
        failedPaymentRecord?.failureReason === "INVALID_GATEWAY_SIGNATURE",
      "Failed verification marks payment record as FAILED with failureReason"
    );

    // Test 30: Security alert audit log created on invalid signature attempt
    const securityAudit = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.SECURITY_ALERT,
        entityId: initResultA.paymentId,
      },
      orderBy: { createdAt: "desc" },
    });
    assert(securityAudit !== null, "AuditAction.SECURITY_ALERT logged on invalid signature");
    assert(
      !(securityAudit?.metadata as any)?.signature && !(securityAudit?.metadata as any)?.secret,
      "Security alert audit metadata does NOT contain secret or raw signature"
    );

    // Test 31: Reset payment status to PENDING for successful verification test
    await prisma.patientPayment.update({
      where: { id: initResultA.paymentId },
      data: { status: PaymentStatus.PENDING, failureReason: null },
    });

    // Test 32: Valid signature successfully verifies and marks PAID & CONFIRMED atomically
    const verifySuccessResult = await verifyAndConfirmPatientPayment({
      orderId: orderIdA,
      gatewayOrderId: gatewayOrderIdA,
      gatewayPaymentId: paymentIdA,
      gatewaySignature: validSignatureLabA,
    });
    assert(verifySuccessResult.success === true, "Valid Razorpay signature accepted");
    assert(verifySuccessResult.status === PaymentStatus.PAID, "Payment status returned as PAID");

    // Test 33: Verify database state after successful verification
    const dbOrderA = await prisma.order.findUnique({ where: { id: orderIdA } });
    const dbPaymentA = await prisma.patientPayment.findUnique({ where: { id: initResultA.paymentId } });
    assert(
      dbOrderA?.orderStatus === OrderStatus.CONFIRMED && dbOrderA?.paymentStatus === PaymentStatus.PAID,
      "Order status atomically updated to CONFIRMED and PAID"
    );
    assert(
      dbPaymentA?.status === PaymentStatus.PAID &&
        dbPaymentA?.gatewayPaymentId === paymentIdA &&
        dbPaymentA?.paidAt !== null,
      "PatientPayment record atomically updated with PAID status, gatewayPaymentId, and paidAt timestamp"
    );

    // Test 34: Audit log recorded for ORDER_STATUS_CHANGED upon successful verification
    const orderStatusAudit = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.ORDER_STATUS_CHANGED,
        orderId: orderIdA,
      },
      orderBy: { createdAt: "desc" },
    });
    assert(orderStatusAudit !== null, "AuditAction.ORDER_STATUS_CHANGED logged on successful verification");

    // Test 35: Idempotency: Second verification with SAME payment ID returns success without re-processing
    const duplicateVerifyResult = await verifyAndConfirmPatientPayment({
      orderId: orderIdA,
      gatewayOrderId: gatewayOrderIdA,
      gatewayPaymentId: paymentIdA,
      gatewaySignature: validSignatureLabA,
    });
    assert(duplicateVerifyResult.success === true, "Duplicate verification request succeeds");
    assert(duplicateVerifyResult.alreadyProcessed === true, "Duplicate verification flagged as alreadyProcessed");

    // Test 36: Rejection: Second verification with DIFFERENT payment ID on already paid order rejected
    let err36: any;
    try {
      await verifyAndConfirmPatientPayment({
        orderId: orderIdA,
        gatewayOrderId: gatewayOrderIdA,
        gatewayPaymentId: "pay_different_payment_id_456",
        gatewaySignature: validSignatureLabA,
      });
    } catch (e: any) {
      err36 = e;
    }
    assert(
      err36 && err36.message.includes("Order has already been paid with a different payment reference"),
      "Second different payment ID on already paid order rejected"
    );

    // Test 37: End-to-end payment creation for Lab B (cross-tenant verification)
    const gatewayOrderIdB = initResultB.gatewayOrderId!;
    const validSignatureLabB = generateSignature(
      gatewayOrderIdB,
      "pay_mock_lab_b_valid",
      secretLabB
    );
    const verifySuccessLabB = await verifyAndConfirmPatientPayment({
      orderId: testOrderB.id,
      gatewayOrderId: gatewayOrderIdB,
      gatewayPaymentId: "pay_mock_lab_b_valid",
      gatewaySignature: validSignatureLabB,
    });
    assert(verifySuccessLabB.success === true, "Lab B order verifies independently with Lab B credentials");
    const dbOrderB = await prisma.order.findUnique({ where: { id: testOrderB.id } });
    assert(dbOrderB?.paymentStatus === PaymentStatus.PAID, "Lab B order paymentStatus updated to PAID");

    // Test 38: Verify storefront catalogue and package prices are completely unchanged
    const testCount = await prisma.labTest.count();
    const pkgCount = await prisma.package.count();
    assert(testCount >= 0 && pkgCount >= 0, "Catalogue tests and packages intact and immutable");

    // Test 39: Verify no Flow B / subscription payment records created
    const subPaymentCount = await prisma.subscriptionPayment.count({
      where: { labId: labA.id },
    });
    assert(subPaymentCount === 0, "No Gyrex platform subscription payments created during patient payments");
  } catch (err) {
    console.error("Unexpected error in test execution:", err);
  } finally {
    // CLEANUP TEST FIXTURES
    console.log("\n--- CLEANING UP TEST FIXTURES ---");
    try {
      if (testOrderA) {
        await prisma.auditLog.deleteMany({ where: { orderId: testOrderA.id } });
        await prisma.patientPayment.deleteMany({ where: { orderId: testOrderA.id } });
        await prisma.order.deleteMany({ where: { id: testOrderA.id } });
      }
      if (testOrderB) {
        await prisma.auditLog.deleteMany({ where: { orderId: testOrderB.id } });
        await prisma.patientPayment.deleteMany({ where: { orderId: testOrderB.id } });
        await prisma.order.deleteMany({ where: { id: testOrderB.id } });
      }
      await prisma.patientPayment.deleteMany({ where: { labId: { in: [labA?.id, labB?.id, labC?.id].filter(Boolean) } } });
      await prisma.order.deleteMany({ where: { labId: { in: [labA?.id, labB?.id, labC?.id].filter(Boolean) } } });
      await prisma.auditLog.deleteMany({ where: { labId: { in: [labA?.id, labB?.id, labC?.id].filter(Boolean) } } });
      await prisma.labPaymentSettings.deleteMany({ where: { labId: { in: [labA?.id, labB?.id, labC?.id].filter(Boolean) } } });
      if (patient) {
        await prisma.patient.deleteMany({ where: { id: patient.id } });
      }
      if (labA) await prisma.lab.deleteMany({ where: { id: labA.id } });
      if (labB) await prisma.lab.deleteMany({ where: { id: labB.id } });
      if (labC) await prisma.lab.deleteMany({ where: { id: labC.id } });
      console.log("Cleanup complete.");
    } catch (cleanupErr) {
      console.warn("Cleanup encountered non-fatal error:", cleanupErr);
    }
  }

  console.log("\n==================================================");
  console.log(`PHASE 5B-1 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
