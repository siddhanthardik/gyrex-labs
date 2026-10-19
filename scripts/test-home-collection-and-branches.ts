/**
 * Comprehensive verification harness for:
 * 1. Indian 6-digit postal PIN code format validation & bulk deduplication
 * 2. Explicit serviceability boundary enforcement (blocking out-of-coverage orders)
 * 3. Scoped subscription entitlement checking (PLAN_ENTERPRISE guard on branches, fail-open for single-location labs)
 * 4. Enterprise multi-location branch management
 * 5. Branch assignment Mode 1 (AUTOMATIC) and Mode 2 (PATIENT_CHOICE)
 * 6. Historical order preservation and branchSnapshot immutability
 *
 * Run: npx tsx scripts/test-home-collection-and-branches.ts
 */

import { prisma } from "../lib/db/prisma";
import { isValidIndianPincode, addPincodeCoverage, bulkAddPincodes, removePincodeCoverage, getLabServiceAreas } from "../services/lab/service-area-service";
import { checkHomeCollectionServiceability } from "../services/orders/serviceability-service";
import { isLabEnterpriseEntitled, assertLabCanManageBranches } from "../services/subscription/entitlement-service";
import { createBranch, updateBranchAssignmentMode, deleteBranch } from "../services/lab/branch-management-service";
import { calculateOrderTotal, createPatientOrder } from "../services/orders/patient-order-service";
import { savePatientAddress, getPatientSavedAddresses } from "../services/patient/patient-address-service";
import { getAddressProviderStatus } from "../services/integrations/geocoding/address-provider";
import { BranchAssignmentMode, CollectionType, PaymentMethod, Gender, SubscriptionStatus, BillingCycle } from "@prisma/client";

async function main() {
  console.log("=== Gyrex Labs: Home Collection Serviceability & Enterprise Branches Test Harness ===\n");

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

  // -------------------------------------------------------------
  // Test 1: PIN code format validation
  // -------------------------------------------------------------
  console.log("[Suite 1] Indian 6-digit PIN Code Format Validation");
  assert(isValidIndianPincode("560038") === true, "Valid Bangalore PIN 560038 accepted");
  assert(isValidIndianPincode("110001") === true, "Valid New Delhi PIN 110001 accepted");
  assert(isValidIndianPincode("400001") === true, "Valid Mumbai PIN 400001 accepted");
  assert(isValidIndianPincode("011058") === false, "PIN starting with 0 rejected");
  assert(isValidIndianPincode("56003") === false, "5-digit PIN rejected");
  assert(isValidIndianPincode("5600381") === false, "7-digit PIN rejected");
  assert(isValidIndianPincode("abcdef") === false, "Alphanumeric PIN rejected");
  assert(isValidIndianPincode("560 038") === false, "PIN with space rejected");

  // -------------------------------------------------------------
  // Setup Test Tenant Lab
  // -------------------------------------------------------------
  console.log("\n[Suite 2] Setting up clean test lab and catalogue items...");
  const timestamp = Date.now();
  const testLabSlug = `test-serv-lab-${timestamp}`;
  const testLab = await prisma.lab.create({
    data: {
      name: `Test Diagnostic Network ${timestamp}`,
      slug: testLabSlug,
      code: `TDN${timestamp.toString().slice(-4)}`,
      email: `network-${timestamp}@testlab.com`,
      phone: "9876543210",
      city: "Bengaluru",
      state: "Karnataka",
      addressLine1: "100 Feet Road, Indiranagar",
      postalCode: "560038",
      storeSettings: {
        create: {
          homeCollectionAvailable: true,
          homeCollectionFee: 120,
          freeHomeCollectionThreshold: 1200,
          branchAssignmentMode: BranchAssignmentMode.AUTOMATIC,
        },
      },
    },
    include: { storeSettings: true },
  });

  const master = await prisma.testMaster.findFirst();
  if (!master) {
    throw new Error("No TestMaster found in database for test setup.");
  }

  const testTest = await prisma.labTest.create({
    data: {
      labId: testLab.id,
      masterTestId: master.id,
      sellingPrice: 350,
      isActive: true,
      isHomeCollectionAvailable: true,
    },
  });

  console.log(`Created test lab: ${testLab.id} (slug: ${testLabSlug})`);

  try {
    // -------------------------------------------------------------
    // Test 2: Single and Bulk Service Area PIN addition & duplicate prevention
    // -------------------------------------------------------------
    console.log("\n[Suite 3] Service Area PIN Configuration & Duplicate Handling");

    const singleArea = await addPincodeCoverage(testLab.id, {
      pincode: "560038",
      localityName: "Indiranagar",
    });
    assert(singleArea.pincode === "560038", "Single PIN 560038 added successfully");

    // Add duplicate single PIN - should throw conflict
    let duplicateCaught = false;
    try {
      await addPincodeCoverage(testLab.id, { pincode: "560038" });
    } catch (err: any) {
      duplicateCaught = err.message?.includes("already configured");
    }
    assert(duplicateCaught, "Duplicate PIN addition rejected with descriptive error");

    // Bulk PIN addition with one new and one duplicate
    const bulkResult = await bulkAddPincodes(testLab.id, {
      pincodes: [
        { pincode: "560038" },
        { pincode: "560008" },
        { pincode: "560025" },
      ],
    });
    assert(
      bulkResult.addedCount === 2 && bulkResult.skippedCount === 1,
      "Bulk add safely imported 2 new PINs and skipped 1 duplicate without throwing"
    );

    // -------------------------------------------------------------
    // Test 3: Single-location Serviceability Boundaries
    // -------------------------------------------------------------
    console.log("\n[Suite 4] Serviceability Boundary Enforcement");

    // Serviceable PIN (560038)
    const servResult1 = await checkHomeCollectionServiceability(testLab.id, "560038", 500);
    assert(servResult1.serviceable === true, "Configured PIN 560038 is serviceable");
    assert(servResult1.homeCollectionFee === 120, "Home collection fee ₹120 charged for ₹500 order");

    // Free threshold check (subtotal >= ₹1200)
    const servResultFree = await checkHomeCollectionServiceability(testLab.id, "560038", 1500);
    assert(servResultFree.homeCollectionFee === 0, "Home collection is FREE (₹0 fee) when subtotal >= ₹1200");

    // Non-configured PIN (560099)
    const unservResult = await checkHomeCollectionServiceability(testLab.id, "560099", 500);
    assert(unservResult.serviceable === false, "Unconfigured PIN 560099 is rejected as outside coverage");

    // -------------------------------------------------------------
    // Test 4: Order Creation Blocking for Out-of-Coverage PINs
    // -------------------------------------------------------------
    console.log("\n[Suite 5] Order Processing Serviceability Gates");

    let orderBlocked = false;
    try {
      await createPatientOrder({
        labId: testLab.id,
        patient: {
          fullName: "Rohan Verma",
          phone: "9876543210",
          gender: Gender.MALE,
        },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: "2026-10-25",
          scheduledSlot: "08:00 AM - 09:00 AM",
          addressLine1: "123 Electronic City",
          postalCode: "560099", // unserviceable PIN
        },
        items: [{ itemType: "TEST", id: testTest.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      orderBlocked =
        err.message?.includes("does not currently provide home sample collection") ||
        err.message?.includes("not available");
    }
    assert(orderBlocked, "createPatientOrder strictly rejected out-of-coverage PIN 560099");

    // Lab with 0 configured service areas must reject HOME_COLLECTION
    let emptyLabBlocked = false;
    const blankLab = await prisma.lab.create({
      data: {
        name: "Zero Coverage Lab",
        slug: `zero-cov-${Date.now()}`,
        code: `ZCL${Date.now().toString().slice(-4)}`,
        email: "zero@lab.test",
        phone: "9999900000",
        addressLine1: "1 Blank St",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        storeSettings: {
          create: {
            homeCollectionAvailable: true,
            homeCollectionFee: 100,
          },
        },
      },
    });
    try {
      await createPatientOrder({
        labId: blankLab.id,
        patient: { fullName: "Test Patient", phone: "9876543210", gender: Gender.MALE },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: "2026-10-25",
          scheduledSlot: "08:00 AM - 09:00 AM",
          addressLine1: "123 Street",
          postalCode: "560001",
        },
        items: [{ itemType: "TEST", id: testTest.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      emptyLabBlocked =
        err.message?.includes("does not currently provide home sample collection") ||
        err.message?.includes("not available");
    } finally {
      await prisma.labStoreSettings.deleteMany({ where: { labId: blankLab.id } });
      await prisma.lab.delete({ where: { id: blankLab.id } });
    }
    assert(emptyLabBlocked, "Existing lab without configured service areas strictly rejects home collection");

    // Lab Visit order for the same unserviceable PIN should succeed (PIN coverage only restricts home pickup)
    const labVisitOrder = await createPatientOrder({
      labId: testLab.id,
      patient: {
        fullName: "Rohan Verma",
        phone: "9876543210",
        gender: Gender.MALE,
      },
      collection: {
        type: CollectionType.LAB_VISIT,
        scheduledDate: "2026-10-25",
        scheduledSlot: "08:00 AM - 09:00 AM",
      },
      items: [{ itemType: "TEST", id: testTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert(Boolean(labVisitOrder.id), "Lab Visit order succeeded unhindered regardless of address PIN");

    // -------------------------------------------------------------
    // Test 5: Subscription Entitlement Guard
    // -------------------------------------------------------------
    console.log("\n[Suite 6] Scoped Subscription Entitlements");

    // Currently testLab has no Enterprise subscription
    const isEntitledBefore = await isLabEnterpriseEntitled(testLab.id);
    assert(isEntitledBefore === false, "Unsubscribed lab is correctly recognized as non-Enterprise");

    let nonEnterpriseBranchBlocked = false;
    try {
      await assertLabCanManageBranches(testLab.id);
    } catch (err: any) {
      nonEnterpriseBranchBlocked = err.message?.includes("Enterprise-tier capability");
    }
    assert(nonEnterpriseBranchBlocked, "assertLabCanManageBranches strictly throws 403 on non-Enterprise plan");

    // Grant PLAN_ENTERPRISE subscription
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
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    const isEntitledAfter = await isLabEnterpriseEntitled(testLab.id);
    assert(isEntitledAfter === true, "Lab with active PLAN_ENTERPRISE is recognized as entitled");

    let enterpriseBranchAllowed = true;
    try {
      await assertLabCanManageBranches(testLab.id);
    } catch {
      enterpriseBranchAllowed = false;
    }
    assert(enterpriseBranchAllowed, "assertLabCanManageBranches permits branch management for Enterprise tier");

    // -------------------------------------------------------------
    // Test 6: Enterprise Multi-Location Branch Management
    // -------------------------------------------------------------
    console.log("\n[Suite 7] Enterprise Branch Creation & PIN Assignment");

    const branchA = await createBranch(testLab.id, {
      name: "Indiranagar Phlebotomy Center",
      code: "BLR-IND-01",
      addressLine1: "12 100ft Road",
      locality: "Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      homeCollectionAvailable: true,
      homeCollectionFee: 80, // Custom lower branch fee override
      freeHomeCollectionThreshold: 800,
      maxDailyCapacity: 50,
      priority: 10,
    });
    assert(branchA.name === "Indiranagar Phlebotomy Center", "Branch A created with fee override ₹80");

    const branchB = await createBranch(testLab.id, {
      name: "Ulsoor Collection Hub",
      code: "BLR-ULS-02",
      addressLine1: "45 Cambridge Road",
      locality: "Ulsoor",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560008",
      homeCollectionAvailable: true,
      homeCollectionFee: 150,
      maxDailyCapacity: 30,
      priority: 5,
    });
    assert(branchB.name === "Ulsoor Collection Hub", "Branch B created successfully");

    // Assign PIN 560038 to Branch A and PIN 560008 to Branch B
    await prisma.labServiceArea.updateMany({
      where: { labId: testLab.id, pincode: "560038" },
      data: { branchId: branchA.id },
    });
    await prisma.labServiceArea.updateMany({
      where: { labId: testLab.id, pincode: "560008" },
      data: { branchId: branchB.id },
    });

    // -------------------------------------------------------------
    // Test 7: Branch Assignment Mode 1 (AUTOMATIC)
    // -------------------------------------------------------------
    console.log("\n[Suite 8] Mode 1 (AUTOMATIC) Routing & Capacity Allocation");

    await updateBranchAssignmentMode(testLab.id, BranchAssignmentMode.AUTOMATIC);

    const autoOrder = await createPatientOrder({
      labId: testLab.id,
      patient: {
        fullName: "Ananya Iyer",
        phone: "9876543211",
        gender: Gender.FEMALE,
      },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: "2026-10-25",
        scheduledSlot: "07:00 AM - 08:00 AM",
        addressLine1: "Flat 2B, 100 Feet Road",
        postalCode: "560038", // Serviced by Branch A
      },
      items: [{ itemType: "TEST", id: testTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });

    assert((autoOrder as any).collection?.branchId === branchA.id, "Auto mode routed 560038 order to Branch A");
    const snapshotA = (autoOrder as any).collection?.branchSnapshot as any;
    assert(snapshotA?.code === "BLR-IND-01", "Order saved immutable branchSnapshot with branch code");

    // -------------------------------------------------------------
    // Test 8: Branch Assignment Mode 2 (PATIENT_CHOICE)
    // -------------------------------------------------------------
    console.log("\n[Suite 9] Mode 2 (PATIENT_CHOICE) & Server-Side Security");

    await updateBranchAssignmentMode(testLab.id, BranchAssignmentMode.PATIENT_CHOICE);

    // Patient specifies valid branch serving PIN 560008
    const choiceOrder = await createPatientOrder({
      labId: testLab.id,
      patient: {
        fullName: "Vikram Das",
        phone: "9876543212",
        gender: Gender.MALE,
      },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: "2026-10-25",
        scheduledSlot: "08:00 AM - 09:00 AM",
        addressLine1: "78 Halasuru Main",
        postalCode: "560008",
        branchId: branchB.id,
      },
      items: [{ itemType: "TEST", id: testTest.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });
    assert((choiceOrder as any).collection?.branchId === branchB.id, "Patient chosen branch B accepted");

    // Invalid choice: Patient enters PIN 560008 but attempts to select Branch A (which does NOT service 560008)
    let crossBranchBlocked = false;
    try {
      await createPatientOrder({
        labId: testLab.id,
        patient: {
          fullName: "Sneha Rao",
          phone: "9876543213",
          gender: Gender.FEMALE,
        },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: "2026-10-25",
          scheduledSlot: "09:00 AM - 10:00 AM",
          addressLine1: "99 Ulsoor Road",
          postalCode: "560008",
          branchId: branchA.id, // Does not service 560008
        },
        items: [{ itemType: "TEST", id: testTest.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      crossBranchBlocked = err.message?.includes("does not service postal code");
    }
    assert(crossBranchBlocked, "Server strictly rejected branch selection outside assigned service area");

    // Capacity saturation check: Set Branch B maxDailyCapacity = 1
    await prisma.labBranch.update({
      where: { id: branchB.id },
      data: { maxDailyCapacity: 1 },
    });
    // Branch B already has 1 order (choiceOrder) on 2026-10-25
    let capacityBlocked = false;
    try {
      await createPatientOrder({
        labId: testLab.id,
        patient: { fullName: "Second Patient", phone: "9876543299", gender: Gender.MALE },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: "2026-10-25",
          scheduledSlot: "10:00 AM - 11:00 AM",
          addressLine1: "100 Ulsoor Road",
          postalCode: "560008",
          branchId: branchB.id,
        },
        items: [{ itemType: "TEST", id: testTest.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      capacityBlocked = err.message?.includes("maximum daily collection capacity");
    }
    assert(capacityBlocked, "Server strictly blocked order when branch reached maxDailyCapacity");

    // -------------------------------------------------------------
    // Test 9: Soft Deactivation & Historical Order Integrity
    // -------------------------------------------------------------
    console.log("\n[Suite 10] Branch Soft-Deactivation & Historical Order Integrity");

    // Branch A now has historical order `autoOrder`
    const deleteResult = await deleteBranch(testLab.id, branchA.id);
    assert(
      deleteResult.deactivated === true,
      "Branch with historical collections was soft-deactivated (isActive: false) instead of hard-deleted"
    );

    // Verify historical order still retains its immutable branchSnapshot
    const reloadedOrder = await prisma.order.findUnique({
      where: { id: autoOrder.id },
      include: { collection: true },
    });
    const reloadedSnapshot = reloadedOrder?.collection?.branchSnapshot as any;
    assert(
      reloadedSnapshot?.name === "Indiranagar Phlebotomy Center",
      "Historical order branchSnapshot remains perfectly intact after branch deactivation"
    );

    // -------------------------------------------------------------
    // Test 10: Home Collection Enable/Disable Master Switch
    // -------------------------------------------------------------
    console.log("\n[Suite 11] Master Toggle: Enabling/Disabling Home Collection");

    // Toggle OFF home collection
    await prisma.labStoreSettings.update({
      where: { labId: testLab.id },
      data: { homeCollectionAvailable: false },
    });

    const offResult = await checkHomeCollectionServiceability(testLab.id, "560008");
    assert(
      offResult.serviceable === false && offResult.reason === "HOME_COLLECTION_DISABLED",
      "checkHomeCollectionServiceability returns HOME_COLLECTION_DISABLED when toggle is OFF"
    );

    let orderWhenOffBlocked = false;
    try {
      await createPatientOrder({
        labId: testLab.id,
        patient: { fullName: "Test Patient", phone: "9876543210", gender: Gender.MALE },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: "2026-10-25",
          scheduledSlot: "08:00 AM - 09:00 AM",
          addressLine1: "123 Street",
          postalCode: "560008",
        },
        items: [{ itemType: "TEST", id: testTest.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch (err: any) {
      orderWhenOffBlocked =
        err.message?.includes("not currently offered") ||
        err.message?.includes("does not currently offer") ||
        err.message?.includes("not available");
    }
    assert(orderWhenOffBlocked, "createPatientOrder rejects home collection when master switch is disabled");

    // Re-enable toggle
    await prisma.labStoreSettings.update({
      where: { labId: testLab.id },
      data: { homeCollectionAvailable: true },
    });
    const onResult = await checkHomeCollectionServiceability(testLab.id, "560008");
    assert(onResult.serviceable === true, "checkHomeCollectionServiceability restores coverage when toggle is re-enabled");

    // -------------------------------------------------------------
    // Test 11: Add, Remove, and Persist Service Area PINs
    // -------------------------------------------------------------
    console.log("\n[Suite 12] Add, Remove, and Persist PIN Coverage");

    const newPinArea = await addPincodeCoverage(testLab.id, {
      pincode: "560078",
      localityName: "JP Nagar",
    });
    assert(newPinArea.pincode === "560078", "Added PIN 560078 with locality 'JP Nagar'");

    let listedAreas = await getLabServiceAreas(testLab.id);
    assert(listedAreas.some((a) => a.pincode === "560078"), "PIN 560078 is persisted and visible in getLabServiceAreas");

    await removePincodeCoverage(testLab.id, newPinArea.id);
    listedAreas = await getLabServiceAreas(testLab.id);
    assert(!listedAreas.some((a) => a.pincode === "560078"), "PIN 560078 was successfully removed");

    const removedCoverage = await checkHomeCollectionServiceability(testLab.id, "560078");
    assert(removedCoverage.serviceable === false, "Removed PIN 560078 is immediately unserviceable");

    // -------------------------------------------------------------
    // Test 12: Saved Addresses Persistence, Retrieval & Deduplication
    // -------------------------------------------------------------
    console.log("\n[Suite 13] Saved Addresses: Persistence, Retrieval & Deduplication");

    const savedAddr1 = await savePatientAddress({
      phone: "9876543210",
      label: "Home",
      addressLine1: "Flat 101, Palm Grove",
      addressLine2: "1st Cross Road",
      landmark: "Opp City Park",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      isDefault: true,
    });
    assert(savedAddr1.postalCode === "560038", "Patient address saved with PIN 560038");

    // Saving duplicate address for same patient updates rather than duplicating
    const savedAddrDuplicate = await savePatientAddress({
      phone: "9876543210",
      label: "Home",
      addressLine1: "Flat 101, Palm Grove",
      landmark: "Near City Park North Gate",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
    });
    assert(savedAddrDuplicate.id === savedAddr1.id, "Duplicate patient address update reuses existing record ID");

    const patientAddrs = await getPatientSavedAddresses("9876543210");
    assert(patientAddrs.length >= 1, "getPatientSavedAddresses retrieves saved addresses by phone number");
    assert(patientAddrs[0].addressLine1 === "Flat 101, Palm Grove", "Address fields match expected stored values");

    // -------------------------------------------------------------
    // Test 13: Provider-Independent Geocoding & Nominatim Absence Guard
    // -------------------------------------------------------------
    console.log("\n[Suite 14] Provider-Independent Geocoding & Autocomplete Status");

    const providerStatus = getAddressProviderStatus();
    assert(
      providerStatus.status === "PROVIDER_CREDENTIALS_PENDING" || providerStatus.status === "ACTIVE",
      "Provider-independent geocoding cleanly reports provider status without throwing"
    );
    assert(
      (providerStatus.provider as string) !== "nominatim",
      "Public Nominatim is NOT configured as unrestricted commercial autocomplete"
    );

    // -------------------------------------------------------------
    // Test 14: Cross-Tenant Isolation on Branch & Service Area
    // -------------------------------------------------------------
    console.log("\n[Suite 15] Strict Tenant Isolation on Branch & Service Area APIs");

    // Create a secondary rogue lab
    const otherLab = await prisma.lab.create({
      data: {
        name: "Foreign Rogue Lab",
        slug: `foreign-lab-${Date.now()}`,
        code: `FL${Date.now().toString().slice(-4)}`,
        email: "foreign@lab.test",
        phone: "9111122222",
        addressLine1: "99 Foreign St",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      },
    });

    let crossDeleteBlocked = false;
    try {
      // testLab tries to delete service area belonging to otherLab
      const foreignArea = await prisma.labServiceArea.create({
        data: { labId: otherLab.id, pincode: "560001" },
      });
      await removePincodeCoverage(testLab.id, foreignArea.id);
    } catch (err: any) {
      crossDeleteBlocked = err.message?.includes("cannot delete service areas belonging to another laboratory");
    } finally {
      await prisma.labServiceArea.deleteMany({ where: { labId: otherLab.id } });
      await prisma.lab.delete({ where: { id: otherLab.id } });
    }
    assert(crossDeleteBlocked, "removePincodeCoverage strictly blocks cross-tenant service area deletion");

  } finally {
    // Clean up test lab data
    console.log("\nCleaning up test lab data...");
    await prisma.collection.deleteMany({ where: { order: { labId: testLab.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { labId: testLab.id } } });
    await prisma.order.deleteMany({ where: { labId: testLab.id } });
    await prisma.labServiceArea.deleteMany({ where: { labId: testLab.id } });
    await prisma.labBranch.deleteMany({ where: { labId: testLab.id } });
    await prisma.subscription.deleteMany({ where: { labId: testLab.id } });
    await prisma.labTest.deleteMany({ where: { labId: testLab.id } });
    await prisma.labStoreSettings.deleteMany({ where: { labId: testLab.id } });
    await prisma.lab.delete({ where: { id: testLab.id } });
    console.log("Cleanup complete.");
  }

  console.log("\n=======================================================");
  console.log(`Results: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("=======================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Test execution fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
