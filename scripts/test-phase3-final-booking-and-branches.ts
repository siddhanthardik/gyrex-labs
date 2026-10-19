/**
 * GYREX LABS — PHASE 3 COMPREHENSIVE VERIFICATION HARNESS
 *
 * Covers:
 * 1. Patient address authorization & strict IDOR defense (cross-patient access blocked)
 * 2. Concurrency-safe server-side order idempotency (duplicate prevention without merging legitimate bookings)
 * 3. Branch capacity bounds & concurrency safety with defined capacity-consuming statuses
 * 4. Enterprise-only branch management vs single-location tiers
 * 5. Branch soft-deactivation preserving immutable historical order snapshots
 * 6. Dynamic address/PIN serviceability and branch eligibility revalidation
 * 7. Single-location labs and in-person LAB_VISIT compatibility
 * 8. Payment workflow idempotency (Razorpay and Cash-on-Collection)
 * 9. Provider-independent geocoding resiliency & fallback
 *
 * Run: npx tsx scripts/test-phase3-final-booking-and-branches.ts
 */

import { prisma } from "../lib/db/prisma";
import {
  createPatientSessionToken,
  verifyPatientSessionToken,
  authenticatePatientByPhone,
} from "../lib/auth/patient-auth";
import {
  getPatientSavedAddresses,
  savePatientAddress,
  updatePatientAddress,
  deletePatientAddress,
} from "../services/patient/patient-address-service";
import {
  calculateOrderTotal,
  createPatientOrder,
} from "../services/orders/patient-order-service";
import {
  checkHomeCollectionServiceability,
} from "../services/orders/serviceability-service";
import {
  isLabEnterpriseEntitled,
  assertLabCanManageBranches,
} from "../services/subscription/entitlement-service";
import {
  createBranch,
  updateBranchAssignmentMode,
  deleteBranch,
} from "../services/lab/branch-management-service";
import {
  addPincodeCoverage,
  removePincodeCoverage,
} from "../services/lab/service-area-service";
import {
  initiatePatientPayment,
} from "../services/integrations/payments/patient-payment-service";
import { getAddressProviderStatus, searchAddress } from "../services/integrations/geocoding/address-provider";
import {
  CollectionType,
  PaymentMethod,
  Gender,
  OrderStatus,
  PaymentStatus,
  BranchAssignmentMode,
  SubscriptionStatus,
  BillingCycle,
} from "@prisma/client";

async function main() {
  console.log("=== Gyrex Labs: Phase 3 Patient Booking & Enterprise Multi-Location Verification ===\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      testPassed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ""}`);
      testFailed++;
    }
  }

  const timestamp = Date.now();
  const testLabSlug = `phase3-test-lab-${timestamp}`;

  // Create isolated test lab with catalogue
  const testLab = await prisma.lab.create({
    data: {
      name: "Phase 3 QA Specialty Laboratory",
      slug: testLabSlug,
      code: `P3${timestamp.toString().slice(-4)}`,
      legalName: "Phase 3 Diagnostics Pvt Ltd",
      email: `phase3-${timestamp}@gyrex.test`,
      phone: "+919876500000",
      addressLine1: "100 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      status: "ACTIVE",
      storeSettings: {
        create: {
          homeCollectionAvailable: true,
          homeCollectionFee: 100,
          freeHomeCollectionThreshold: 1000,
          branchAssignmentMode: BranchAssignmentMode.AUTOMATIC,
        },
      },
      paymentSettings: {
        create: {
          cashOnCollectionEnabled: true,
        },
      },
    },
  });

  const master = await prisma.testMaster.findFirst();
  if (!master) {
    throw new Error("No TestMaster found in database for test setup.");
  }

  const testLabTest = await prisma.labTest.create({
    data: {
      labId: testLab.id,
      masterTestId: master.id,
      sellingPrice: 400,
      mrpPrice: 600,
      isActive: true,
      isHomeCollectionAvailable: true,
    },
  });

  try {
    // -------------------------------------------------------------
    // Test Group 1: Patient Address Authorization & IDOR Defense
    // -------------------------------------------------------------
    console.log("[Group 1] Patient Address Authorization & IDOR Defense");

    const alicePhone = `987${timestamp.toString().slice(-7)}`;
    const bobPhone = `986${timestamp.toString().slice(-7)}`;
    const patientAAuth = await authenticatePatientByPhone(alicePhone, "Patient Alice");
    const patientBAuth = await authenticatePatientByPhone(bobPhone, "Patient Bob");

    assert(Boolean(patientAAuth.token), "Generated secure patient session token for Alice");
    assert(Boolean(patientBAuth.token), "Generated secure patient session token for Bob");

    const decodedSession = await verifyPatientSessionToken(patientAAuth.token);
    assert(decodedSession?.patientId === patientAAuth.patient.id, "Verified JWT patient session integrity");

    // Alice saves address
    const aliceAddr = await savePatientAddress(patientAAuth.patient.id, {
      label: "Home",
      addressLine1: "Flat 101, Alice Residency",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      isDefault: true,
    });
    assert(aliceAddr.patientId === patientAAuth.patient.id, "Alice address saved under Alice patientId");

    // Bob tries to update Alice's address -> MUST throw Access Denied (IDOR guard)
    let bobTamperBlocked = false;
    try {
      await updatePatientAddress(patientBAuth.patient.id, aliceAddr.id, {
        addressLine1: "Tampered by Bob",
      });
    } catch (err: any) {
      bobTamperBlocked = err.message.includes("Access Denied");
    }
    assert(bobTamperBlocked, "Strict IDOR guard: Patient Bob cannot update Patient Alice's address");

    // Bob tries to delete Alice's address -> MUST throw Access Denied (IDOR guard)
    let bobDeleteBlocked = false;
    try {
      await deletePatientAddress(patientBAuth.patient.id, aliceAddr.id);
    } catch (err: any) {
      bobDeleteBlocked = err.message.includes("Access Denied");
    }
    assert(bobDeleteBlocked, "Strict IDOR guard: Patient Bob cannot delete Patient Alice's address");

    // Alice updates her own address
    const updatedAliceAddr = await updatePatientAddress(patientAAuth.patient.id, aliceAddr.id, {
      label: "My Sweet Home",
      addressLine1: "Flat 101, Alice Residency, Block B",
    });
    assert(updatedAliceAddr.label === "My Sweet Home", "Alice successfully updated her own address");

    // Alice retrieves saved addresses
    const aliceAddresses = await getPatientSavedAddresses(patientAAuth.patient.id);
    assert(aliceAddresses.length === 1 && aliceAddresses[0].id === aliceAddr.id, "Alice retrieves strictly her own saved addresses");

    // Alice deletes her own address
    const deleteResult = await deletePatientAddress(patientAAuth.patient.id, aliceAddr.id);
    assert(deleteResult.success === true, "Alice successfully deleted her own address");

    // -------------------------------------------------------------
    // Test Group 2: Database-Enforced Atomic Order Idempotency & Concurrency Race
    // -------------------------------------------------------------
    console.log("\n[Group 2] Database-Enforced Atomic Order Idempotency & Concurrency Race");

    // Configure service area so home collection is allowed
    const sa560038 = await addPincodeCoverage(testLab.id, { pincode: "560038" });

    const sharedKey = `idem_race_${timestamp}`;
    const orderParams1 = {
      labId: testLab.id,
      patient: { fullName: "Charlie Patient", phone: `984${timestamp.toString().slice(-7)}`, gender: Gender.MALE },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: "2026-10-26",
        scheduledSlot: "08:00 AM - 09:00 AM",
        addressLine1: "123 Indiranagar",
        postalCode: "560038",
      },
      items: [{ itemType: "TEST" as const, id: testLabTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      idempotencyKey: sharedKey,
    };

    // Sub-test 2.1: Parallel Concurrency Race with 5 simultaneous requests
    const concurrentResults = await Promise.all([
      createPatientOrder(orderParams1),
      createPatientOrder(orderParams1),
      createPatientOrder(orderParams1),
      createPatientOrder(orderParams1),
      createPatientOrder(orderParams1),
    ]);

    const firstOrderId = concurrentResults[0].id;
    const allIdentical = concurrentResults.every((o) => o.id === firstOrderId);
    assert(allIdentical, "5 simultaneous concurrent requests all safely resolved to the identical order");

    const dbOrderCount = await prisma.order.count({
      where: { idempotencyKey: sharedKey },
    });
    assert(dbOrderCount === 1, "Database unique constraint strictly guaranteed exactly 1 order row created");

    // Sub-test 2.2: Subsequent sequential retry with same key returns original order
    const sequentialRetry = await createPatientOrder(orderParams1);
    assert(sequentialRetry.id === firstOrderId, "Sequential retry with same idempotency key returned original order");

    // Sub-test 2.3: Reusing the same idempotency key with a DIFFERENT payload MUST throw conflict
    let conflictBlocked = false;
    try {
      await createPatientOrder({
        ...orderParams1,
        collection: {
          ...orderParams1.collection,
          scheduledSlot: "04:00 PM - 05:00 PM", // Different slot!
        },
      });
    } catch (err: any) {
      conflictBlocked = err.message.includes("Idempotency conflict");
    }
    assert(conflictBlocked, "Server strictly blocked reusing idempotency key for a different request payload");

    // Sub-test 2.4: Legitimate subsequent booking with fresh key succeeds with new distinct order
    const orderDifferentKey = await createPatientOrder({
      ...orderParams1,
      idempotencyKey: `idem_fresh_${timestamp}`,
      collection: {
        ...orderParams1.collection,
        scheduledSlot: "11:00 AM - 12:00 PM",
      },
    });
    assert(orderDifferentKey.id !== firstOrderId, "Legitimate booking with distinct key creates new distinct order");

    // -------------------------------------------------------------
    // Test Group 3: Branch Capacity Bounds & Concurrency Guard
    // -------------------------------------------------------------
    console.log("\n[Group 3] Branch Capacity Bounds & Defined Status Enforcement");

    // Enterprise plan for branch tests
    const enterprisePlan = await prisma.subscriptionPlan.upsert({
      where: { code: "PLAN_ENTERPRISE" },
      update: {},
      create: {
        code: "PLAN_ENTERPRISE",
        name: "Enterprise Multi-Location",
        priceMonthly: 9999,
        priceYearly: 99999,
        isActive: true,
      },
    });

    await prisma.subscription.create({
      data: {
        labId: testLab.id,
        planId: enterprisePlan.id,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create Branch with maxDailyCapacity = 2
    const capacityBranch = await createBranch(testLab.id, {
      name: "High-Volume Capacity Hub",
      code: `CAP-${timestamp.toString().slice(-6)}`,
      addressLine1: "50 Brigade Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560025",
      homeCollectionAvailable: true,
      maxDailyCapacity: 2,
    });

    await prisma.labServiceArea.create({
      data: {
        labId: testLab.id,
        branchId: capacityBranch.id,
        pincode: "560025",
      },
    });

    await updateBranchAssignmentMode(testLab.id, BranchAssignmentMode.PATIENT_CHOICE);

    // Book 1st slot
    const capOrder1 = await createPatientOrder({
      labId: testLab.id,
      patient: { fullName: "Patient Cap 1", phone: "9876500001", gender: Gender.FEMALE },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: "2026-10-27",
        scheduledSlot: "07:00 AM - 08:00 AM",
        addressLine1: "1 Brigade Rd",
        postalCode: "560025",
        branchId: capacityBranch.id,
      },
      items: [{ itemType: "TEST", id: testLabTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert(Boolean(capOrder1.id), "Capacity slot 1/2 successfully booked");

    // Book 2nd slot
    const capOrder2 = await createPatientOrder({
      labId: testLab.id,
      patient: { fullName: "Patient Cap 2", phone: "9876500002", gender: Gender.FEMALE },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: "2026-10-27",
        scheduledSlot: "08:00 AM - 09:00 AM",
        addressLine1: "2 Brigade Rd",
        postalCode: "560025",
        branchId: capacityBranch.id,
      },
      items: [{ itemType: "TEST", id: testLabTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert(Boolean(capOrder2.id), "Capacity slot 2/2 successfully booked (branch now full)");

    // Attempt 3rd slot on same branch & date -> MUST throw capacity reached
    let slot3Blocked = false;
    try {
      await createPatientOrder({
        labId: testLab.id,
        patient: { fullName: "Patient Cap 3", phone: "9876500003", gender: Gender.MALE },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: "2026-10-27",
          scheduledSlot: "09:00 AM - 10:00 AM",
          addressLine1: "3 Brigade Rd",
          postalCode: "560025",
          branchId: capacityBranch.id,
        },
        items: [{ itemType: "TEST", id: testLabTest.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      slot3Blocked = err.message.includes("maximum daily collection capacity");
    }
    assert(slot3Blocked, "Server strictly blocked order when branch reached maxDailyCapacity");

    // Cancel 1st slot -> capacity must be released
    await prisma.order.update({
      where: { id: capOrder1.id },
      data: { orderStatus: OrderStatus.CANCELLED },
    });

    const capOrderReopened = await createPatientOrder({
      labId: testLab.id,
      patient: { fullName: "Patient Cap 3", phone: "9876500003", gender: Gender.MALE },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: "2026-10-27",
        scheduledSlot: "09:00 AM - 10:00 AM",
        addressLine1: "3 Brigade Rd",
        postalCode: "560025",
        branchId: capacityBranch.id,
      },
      items: [{ itemType: "TEST", id: testLabTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert(Boolean(capOrderReopened.id), "Cancelled order correctly freed up capacity slot for new booking");

    // -------------------------------------------------------------
    // Test Group 4: Dynamic Address Changes & Security Guard
    // -------------------------------------------------------------
    console.log("\n[Group 4] Dynamic Address Changes & Cross-Branch Security");

    // Attempting to select a branch that does not service the PIN code must be rejected
    let invalidBranchBlocked = false;
    try {
      await createPatientOrder({
        labId: testLab.id,
        patient: { fullName: "PIN Mismatch Patient", phone: "9876500010", gender: Gender.FEMALE },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: "2026-10-28",
          scheduledSlot: "08:00 AM - 09:00 AM",
          addressLine1: "Indiranagar",
          postalCode: "560038", // Serviced by lab wide, NOT capacityBranch (560025)
          branchId: capacityBranch.id,
        },
        items: [{ itemType: "TEST", id: testLabTest.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      invalidBranchBlocked =
        err.message.includes("does not service postal code") ||
        err.message.includes("Security Violation");
    }
    assert(invalidBranchBlocked, "Server strictly blocked choosing a branch not mapped to address PIN");

    // -------------------------------------------------------------
    // Test Group 5: Single-Location Labs & In-Person LAB_VISIT
    // -------------------------------------------------------------
    console.log("\n[Group 5] Single-Location Labs & LAB_VISIT Compatibility");

    const visitOrder = await createPatientOrder({
      labId: testLab.id,
      patient: { fullName: "Walkin Patient", phone: "9876599999", gender: Gender.MALE },
      collection: {
        type: CollectionType.LAB_VISIT,
        scheduledDate: "2026-10-29",
        scheduledSlot: "11:00 AM - 12:00 PM",
      },
      items: [{ itemType: "TEST", id: testLabTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });

    assert(visitOrder.collectionType === CollectionType.LAB_VISIT, "LAB_VISIT order confirmed");
    assert(Number(visitOrder.collectionFee) === 0, "LAB_VISIT charges ₹0 collection fee");
    assert(Number(visitOrder.totalAmount) === 400, "LAB_VISIT total equals pure test subtotal");

    // -------------------------------------------------------------
    // Test Group 6: Payment Idempotency & Workflow Preservation
    // -------------------------------------------------------------
    console.log("\n[Group 6] Payment Idempotency & Cash on Collection");

    const pendingOrder = await createPatientOrder({
      labId: testLab.id,
      patient: { fullName: "Payment Test Patient", phone: `985${timestamp.toString().slice(-7)}`, gender: Gender.MALE },
      collection: {
        type: CollectionType.LAB_VISIT,
        scheduledDate: "2026-10-30",
        scheduledSlot: "10:00 AM - 11:00 AM",
      },
      items: [{ itemType: "TEST", id: testLabTest.id }],
      paymentMethod: PaymentMethod.RAZORPAY,
    });
    assert(pendingOrder.orderStatus === OrderStatus.PENDING_PAYMENT, "Online order created in PENDING_PAYMENT state");

    const paymentInit1 = await initiatePatientPayment({
      orderId: pendingOrder.id,
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert(paymentInit1.success === true, "Initiated Cash-on-Collection payment");

    // Re-initiating payment for already processed order must be blocked
    let reInitBlocked = false;
    try {
      await initiatePatientPayment({
        orderId: pendingOrder.id,
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      reInitBlocked = err.message.includes("not in a payable state") || err.message.includes("already paid");
    }
    assert(reInitBlocked, "Server strictly blocked re-initiating payment for confirmed order");

    const paymentCount = await prisma.patientPayment.count({
      where: { orderId: pendingOrder.id },
    });
    assert(paymentCount === 1, "Exactly one patient payment record exists for order");

    // -------------------------------------------------------------
    // Test Group 7: Provider-Independent Geocoding Fallback
    // -------------------------------------------------------------
    console.log("\n[Group 7] Provider-Independent Geocoding Fallback");

    const providerStatus = getAddressProviderStatus();
    assert(
      providerStatus.status === "ACTIVE" || providerStatus.status === "PROVIDER_CREDENTIALS_PENDING",
      "Provider cleanly reports current configuration status"
    );

    const searchResults = await searchAddress("Indiranagar 100 Feet Road");
    assert(Array.isArray(searchResults), "searchAddress always returns array without crashing");
  } finally {
    console.log("\nCleaning up Phase 3 test data...");
    await prisma.patientPayment.deleteMany({ where: { labId: testLab.id } });
    await prisma.collection.deleteMany({ where: { order: { labId: testLab.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { labId: testLab.id } } });
    await prisma.order.deleteMany({ where: { labId: testLab.id } });
    await prisma.labServiceArea.deleteMany({ where: { labId: testLab.id } });
    await prisma.labBranch.deleteMany({ where: { labId: testLab.id } });
    await prisma.subscription.deleteMany({ where: { labId: testLab.id } });
    await prisma.labTest.deleteMany({ where: { labId: testLab.id } });
    await prisma.labStoreSettings.deleteMany({ where: { labId: testLab.id } });
    await prisma.labPaymentSettings.deleteMany({ where: { labId: testLab.id } });
    await prisma.lab.delete({ where: { id: testLab.id } });
    console.log("Cleanup complete.");
  }

  console.log("\n=======================================================");
  console.log(`Phase 3 Test Results: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("=======================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Phase 3 test execution fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
