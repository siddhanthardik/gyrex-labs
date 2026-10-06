import { prisma } from "../lib/db/prisma";
import {
  getLabTests,
  getLabTestById,
  updateLabTest,
  addTestMasterToLab,
} from "../services/lab/catalogue-service";
import {
  createLabPackage,
  updateLabPackage,
  getLabPackageById,
} from "../services/lab/packages-service";
import {
  getLabStorefront,
} from "../services/labs/storefront";
import {
  calculateOrderTotal,
  createPatientOrder,
} from "../services/orders/patient-order-service";
import { CollectionType, PaymentMethod } from "@prisma/client";

async function runTests() {
  console.log("=== PHASE 8: HOME SAMPLE COLLECTION ARCHITECTURAL VERIFICATION ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // Find or create test lab
  let testLab = await prisma.lab.findFirst({
    where: { slug: "test-home-collection-lab" },
    include: { storeSettings: true },
  });

  if (!testLab) {
    testLab = await prisma.lab.create({
      data: {
        name: "Test Home Collection Diagnostics",
        legalName: "Test Home Collection Diagnostics Pvt Ltd",
        slug: "test-home-collection-lab",
        code: "THCL01",
        email: "lab@thcl.test",
        phone: "+919876543210",
        addressLine1: "123 Diagnostic Road",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        storeSettings: {
          create: {
            homeCollectionAvailable: true,
            homeCollectionFee: 150,
            freeHomeCollectionThreshold: 1000,
          },
        },
      },
      include: { storeSettings: true },
    });
  }

  const labId = testLab.id;

  // Find a category
  let category = await prisma.testCategory.findFirst();
  if (!category) {
    category = await prisma.testCategory.create({
      data: {
        name: "Specialized Diagnostics",
        slug: "specialized-diagnostics",
      },
    });
  }

  // 1. Verify TestMaster.homeCollectionEligible defaults to true
  const ts = Date.now();
  const eligibleMaster = await prisma.testMaster.create({
    data: {
      code: `TEST-HC-ELIGIBLE-${ts}`,
      name: "Routine Blood Glucose",
      slug: `routine-blood-glucose-${ts}`,
      sampleType: "Blood",
      standardTatHours: 12,
      categoryId: category.id,
      // homeCollectionEligible should default to true
    },
  });
  assert(
    eligibleMaster.homeCollectionEligible === true,
    "TestMaster.homeCollectionEligible defaults to true on creation"
  );

  // Create an explicitly ineligible master test (e.g. Semen Analysis / CSF)
  const ineligibleMaster = await prisma.testMaster.create({
    data: {
      code: `TEST-HC-INELIGIBLE-${ts}`,
      name: "Cerebrospinal Fluid (CSF) Analysis",
      slug: `csf-analysis-${ts}`,
      sampleType: "CSF",
      standardTatHours: 24,
      categoryId: category.id,
      homeCollectionEligible: false,
    },
  });
  assert(
    ineligibleMaster.homeCollectionEligible === false,
    "TestMaster.homeCollectionEligible can be set to false (State C)"
  );

  // Add tests to lab catalogue
  const labTestEligible = await addTestMasterToLab(labId, {
    masterTestId: eligibleMaster.id,
    sellingPrice: 300,
    isHomeCollectionAvailable: true,
  });

  const labTestIneligible = await addTestMasterToLab(labId, {
    masterTestId: ineligibleMaster.id,
    sellingPrice: 1200,
  });

  // 2. Ineligible test cannot be set to isHomeCollectionAvailable: true via catalogue-service
  let updateIneligibleError = false;
  try {
    await updateLabTest(labId, labTestIneligible.id, {
      isHomeCollectionAvailable: true,
    });
  } catch (err: any) {
    updateIneligibleError = true;
    assert(
      err.message.includes("requires on-site clinical collection"),
      "updateLabTest rejects isHomeCollectionAvailable = true on clinically ineligible test",
      err.message
    );
  }
  assert(
    updateIneligibleError,
    "Validation throws error when setting home collection on clinically ineligible test"
  );

  // 3. Expose homeCollectionEligible in getLabTestById
  const fetchedIneligible = await getLabTestById(labId, labTestIneligible.id);
  assert(
    fetchedIneligible.homeCollectionEligible === false,
    "getLabTestById returns homeCollectionEligible = false for State C"
  );
  assert(
    fetchedIneligible.isHomeCollectionAvailable === false,
    "getLabTestById returns isHomeCollectionAvailable = false for State C"
  );

  // 4. Eligible master with toggle ON (State A)
  const fetchedEligibleA = await getLabTestById(labId, labTestEligible.id);
  assert(
    fetchedEligibleA.homeCollectionEligible === true && fetchedEligibleA.isHomeCollectionAvailable === true,
    "State A: homeCollectionEligible = true and isHomeCollectionAvailable = true"
  );

  // 5. Eligible master with toggle OFF (State B)
  await updateLabTest(labId, labTestEligible.id, {
    isHomeCollectionAvailable: false,
  });
  const fetchedEligibleB = await getLabTestById(labId, labTestEligible.id);
  assert(
    fetchedEligibleB.homeCollectionEligible === true && fetchedEligibleB.isHomeCollectionAvailable === false,
    "State B: homeCollectionEligible = true and isHomeCollectionAvailable = false (offered by lab = OFF)"
  );

  // Reset labTestEligible to true for package tests
  await updateLabTest(labId, labTestEligible.id, {
    isHomeCollectionAvailable: true,
  });

  // 6 & 7. Package creation with clinically ineligible test must reject home collection
  let pkgIneligibleError = false;
  try {
    await createLabPackage(labId, {
      name: "Neuro Diagnostic Panel",
      sellingPrice: 1400,
      isHomeCollectionAvailable: true,
      testIds: [labTestEligible.id, labTestIneligible.id],
    });
  } catch (err: any) {
    pkgIneligibleError = true;
    assert(
      err.message.includes("on-site clinical collection"),
      "createLabPackage rejects isHomeCollectionAvailable = true when including clinically ineligible test",
      err.message
    );
  }
  assert(
    pkgIneligibleError,
    "createLabPackage strictly enforces all package tests are clinically eligible"
  );

  // 8. Package creation with lab-disabled test must reject home collection
  const disabledMaster = await prisma.testMaster.create({
    data: {
      code: `TEST-HC-DIS-${ts}`,
      name: "Specialized Hormonal Assay",
      slug: `spec-hormonal-assay-${ts}`,
      sampleType: "Blood",
      standardTatHours: 12,
      categoryId: category.id,
    },
  });

  const labTestDisabled = await addTestMasterToLab(labId, {
    masterTestId: disabledMaster.id,
    sellingPrice: 350,
    isHomeCollectionAvailable: false,
  });

  let pkgLabDisabledError = false;
  try {
    await createLabPackage(labId, {
      name: "Mixed Panel",
      sellingPrice: 600,
      isHomeCollectionAvailable: true,
      testIds: [labTestEligible.id, labTestDisabled.id],
    });
  } catch (err: any) {
    pkgLabDisabledError = true;
    assert(
      err.message.includes("not offered for home collection by your laboratory"),
      "createLabPackage rejects isHomeCollectionAvailable = true when any test is lab-disabled",
      err.message
    );
  }
  assert(
    pkgLabDisabledError,
    "createLabPackage strictly enforces all package tests are offered by laboratory"
  );

  // 9. Clean package with all eligible & available tests succeeds
  const validPackage = await createLabPackage(labId, {
    name: "Standard Wellness Duo",
    sellingPrice: 550,
    mrpPrice: 2000,
    isHomeCollectionAvailable: true,
    testIds: [labTestEligible.id],
  });
  assert(
    validPackage.isHomeCollectionAvailable === true,
    "createLabPackage succeeds with isHomeCollectionAvailable = true when all tests eligible"
  );

  // 10. Updating valid package with an ineligible test automatically disables or rejects home collection
  let pkgUpdateError = false;
  try {
    await updateLabPackage(labId, validPackage.id, {
      testIds: [labTestEligible.id, labTestIneligible.id],
      mrpPrice: 2000,
      isHomeCollectionAvailable: true,
    });
  } catch (err: any) {
    pkgUpdateError = true;
    assert(
      err.message.includes("on-site clinical collection"),
      "updateLabPackage rejects isHomeCollectionAvailable = true when updating with ineligible test",
      err.message
    );
  }
  assert(
    pkgUpdateError,
    "updateLabPackage enforces clinical eligibility on updated test lists"
  );

  // 11. Storefront calculation: Level 1 Laboratory Master Service Switch
  // Update lab store settings to homeCollectionAvailable = false
  await prisma.labStoreSettings.update({
    where: { labId },
    data: { homeCollectionAvailable: false },
  });

  const storefrontDisabled = await getLabStorefront(testLab.slug);
  assert(
    storefrontDisabled?.settings.homeCollectionAvailable === false,
    "Storefront reflects laboratory master switch homeCollectionAvailable = false"
  );

  const testInStorefront = storefrontDisabled?.popularTests.find((t) => t.id === labTestEligible.id);
  assert(
    testInStorefront?.homeCollectionAvailable === false,
    "When Lab Service is OFF, eligible test popularTests.homeCollectionAvailable is false"
  );

  const packageInStorefront = storefrontDisabled?.packages.find((p) => p.id === validPackage.id);
  assert(
    packageInStorefront?.homeCollectionAvailable === false,
    "When Lab Service is OFF, package packages.homeCollectionAvailable is false"
  );

  // 12. Order calculation throws error when HOME_COLLECTION requested and Lab Service is OFF
  let orderLabOffError = false;
  try {
    await calculateOrderTotal(
      labId,
      [{ itemType: "TEST", id: labTestEligible.id }],
      CollectionType.HOME_COLLECTION
    );
  } catch (err: any) {
    orderLabOffError = true;
    assert(
      err.message.includes("not currently offered by"),
      "calculateOrderTotal rejects HOME_COLLECTION when Lab Service is OFF"
    );
  }
  assert(orderLabOffError, "Order calculation enforces Level 1 master switch");

  // Re-enable Lab Master Switch
  await prisma.labStoreSettings.update({
    where: { labId },
    data: { homeCollectionAvailable: true },
  });

  // 13. Order calculation throws error if clinically ineligible test is booked for HOME_COLLECTION
  let orderIneligibleError = false;
  try {
    await calculateOrderTotal(
      labId,
      [{ itemType: "TEST", id: labTestIneligible.id }],
      CollectionType.HOME_COLLECTION
    );
  } catch (err: any) {
    orderIneligibleError = true;
    assert(
      err.message.includes("requires on-site clinical collection"),
      "calculateOrderTotal rejects HOME_COLLECTION for clinically ineligible test"
    );
  }
  assert(orderIneligibleError, "Order calculation enforces Level 2 test clinical eligibility");

  // 14. Order calculation succeeds for LAB_VISIT even with clinically ineligible test
  const labVisitSummary = await calculateOrderTotal(
    labId,
    [{ itemType: "TEST", id: labTestIneligible.id }],
    CollectionType.LAB_VISIT
  );
  assert(
    labVisitSummary.collectionFee === 0 && labVisitSummary.subtotal === 1200,
    "calculateOrderTotal succeeds for LAB_VISIT for clinically ineligible test"
  );

  // 15. Order calculation succeeds for HOME_COLLECTION when all tests are eligible & offered
  const homeEligibleSummary = await calculateOrderTotal(
    labId,
    [{ itemType: "TEST", id: labTestEligible.id }],
    CollectionType.HOME_COLLECTION
  );
  assert(
    homeEligibleSummary.collectionFee === 150 && homeEligibleSummary.subtotal === 300,
    "calculateOrderTotal succeeds with home collection fee for eligible test"
  );

  // 16. Free home collection threshold applies correctly
  const freeThresholdSummary = await calculateOrderTotal(
    labId,
    [
      { itemType: "TEST", id: labTestEligible.id },
      { itemType: "PACKAGE", id: validPackage.id },
      { itemType: "TEST", id: labTestEligible.id },
      { itemType: "PACKAGE", id: validPackage.id },
    ],
    CollectionType.HOME_COLLECTION
  );
  assert(
    freeThresholdSummary.subtotal >= 1000 && freeThresholdSummary.collectionFee === 0,
    "Free collection threshold waives home collection fee when subtotal >= threshold"
  );

  // 17. Cleanup test artifacts from DB
  await prisma.packageTest.deleteMany({ where: { packageId: validPackage.id } });
  await prisma.package.deleteMany({ where: { id: validPackage.id } });
  await prisma.labTest.deleteMany({ where: { id: { in: [labTestEligible.id, labTestIneligible.id, labTestDisabled.id] } } });
  await prisma.testMaster.deleteMany({ where: { id: { in: [eligibleMaster.id, ineligibleMaster.id, disabledMaster.id] } } });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
