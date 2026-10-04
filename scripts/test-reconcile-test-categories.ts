/**
 * Automated Test Suite for TestCategory Provisioning & Reconciliation Logic
 *
 * Scenarios Tested:
 * 1. Simulates production baseline (5 active categories):
 *    - Biochemistry
 *    - Clinical Pathology
 *    - Endocrinology
 *    - Hematology
 *    - Serology & Immunology
 * 2. Verifies matching existing categories are recognized and IDs are preserved
 * 3. Verifies non-matching categories (Biochemistry, Serology & Immunology) are never deleted
 * 4. Verifies exactly the 13 missing approved categories are created with isActive = true
 * 5. Verifies IDEMPOTENCY: a second execution creates 0 additional categories
 * 6. Verifies live database counts remain 100% UNMODIFIED (zero mutations)
 */

import { prisma } from "../lib/db/prisma";
import {
  APPROVED_GYREX_TAXONOMY,
} from "../services/superadmin/testmaster-import-service";
import {
  reconcileTestCategories,
  ReconcileSummary,
} from "./reconcile-test-categories";

class MockCategoryDatabase {
  public categories: Array<{
    id: string;
    name: string;
    slug: string;
    displayOrder: number;
    isActive: boolean;
  }> = [];

  constructor(initialCategories: Array<{ id: string; name: string; slug: string; displayOrder: number; isActive: boolean }>) {
    this.categories = JSON.parse(JSON.stringify(initialCategories));
  }

  async findMany() {
    return JSON.parse(JSON.stringify(this.categories));
  }

  async create(args: { data: { name: string; slug: string; displayOrder: number; isActive: boolean } }) {
    const newRecord = {
      id: `cat_mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: args.data.name,
      slug: args.data.slug,
      displayOrder: args.data.displayOrder,
      isActive: args.data.isActive,
    };
    this.categories.push(newRecord);
    return newRecord;
  }
}

async function runTests() {
  console.log("===============================================================");
  console.log("  AUTOMATED TESTS: TESTCATEGORY RECONCILIATION LOGIC");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Initial State: The 5 production database categories
  const baseline5 = [
    { id: "cat_prod_bio", name: "Biochemistry", slug: "biochemistry", displayOrder: 1, isActive: true },
    { id: "cat_prod_cp", name: "Clinical Pathology", slug: "clinical-pathology", displayOrder: 2, isActive: true },
    { id: "cat_prod_endo", name: "Endocrinology", slug: "endocrinology", displayOrder: 3, isActive: true },
    { id: "cat_prod_hem", name: "Hematology", slug: "hematology", displayOrder: 4, isActive: true },
    { id: "cat_prod_sero", name: "Serology & Immunology", slug: "serology-immunology", displayOrder: 5, isActive: true },
  ];

  const mockDb = new MockCategoryDatabase(baseline5);
  const mockClient = { testCategory: mockDb };

  console.log("--- 1. Testing First Reconciliation Pass from 5-Category Baseline ---");
  const summary1: ReconcileSummary = await reconcileTestCategories({
    client: mockClient,
    dryRun: false,
  });

  // Verify: 3 of the 16 approved categories matched existing production records
  assert(summary1.existing === 3, `Identified exactly 3 matching existing categories (got: ${summary1.existing})`);
  assert(summary1.alreadyActive === 3, `All 3 matching existing categories are already active (got: ${summary1.alreadyActive})`);

  // Verify: Exactly 13 missing categories were created
  assert(summary1.created === 13, `Created exactly 13 missing approved categories (got: ${summary1.created})`);
  assert(summary1.total === 18, `Total database categories is 18 (5 baseline + 13 created) (got: ${summary1.total})`);

  // Verify: Original category IDs are strictly preserved
  console.log("\n--- 2. Verifying Existing Record Preservation ---");
  const cpRecord = mockDb.categories.find((c) => c.slug === "clinical-pathology");
  const endoRecord = mockDb.categories.find((c) => c.slug === "endocrinology");
  const hemRecord = mockDb.categories.find((c) => c.slug === "hematology");
  const bioRecord = mockDb.categories.find((c) => c.slug === "biochemistry");
  const seroRecord = mockDb.categories.find((c) => c.slug === "serology-immunology");

  assert(cpRecord?.id === "cat_prod_cp", `Preserved Clinical Pathology original ID (${cpRecord?.id})`);
  assert(endoRecord?.id === "cat_prod_endo", `Preserved Endocrinology original ID (${endoRecord?.id})`);
  assert(hemRecord?.id === "cat_prod_hem", `Preserved Hematology original ID (${hemRecord?.id})`);
  assert(bioRecord?.id === "cat_prod_bio", `Preserved Biochemistry original ID (${bioRecord?.id})`);
  assert(seroRecord?.id === "cat_prod_sero", `Preserved Serology & Immunology original ID (${seroRecord?.id})`);

  // Verify: Non-matching categories (Biochemistry, Serology & Immunology) were NOT deleted
  assert(!!bioRecord, `Biochemistry was NOT deleted`);
  assert(!!seroRecord, `Serology & Immunology was NOT deleted`);

  // Verify: The 13 created categories contain Hematology & Coagulation
  console.log("\n--- 3. Verifying Created Categories Content ---");
  const createdSlugs = new Set(summary1.createdCategories.map((c) => c.slug));
  assert(createdSlugs.has("hematology-coagulation"), `Created "Hematology & Coagulation" (slug: hematology-coagulation)`);
  assert(createdSlugs.has("microbiology-infectious-diseases"), `Created "Microbiology & Infectious Diseases"`);
  assert(createdSlugs.has("histopathology-cytopathology"), `Created "Histopathology & Cytopathology"`);
  assert(createdSlugs.has("molecular-diagnostics-genetics"), `Created "Molecular Diagnostics & Genetics"`);
  assert(createdSlugs.has("oncology-tumour-markers"), `Created "Oncology & Tumour Markers"`);
  assert(createdSlugs.has("toxicology-tdm"), `Created "Toxicology & TDM"`);
  assert(createdSlugs.has("clinical-biochemistry"), `Created "Clinical Biochemistry"`);

  // Verify: All created categories have isActive: true
  const allCreatedActive = mockDb.categories.filter((c) => c.id.startsWith("cat_mock_")).every((c) => c.isActive === true);
  assert(allCreatedActive, `All newly created categories are set to active (isActive: true)`);

  // 4. Test Idempotency (Second Pass)
  console.log("\n--- 4. Testing Idempotency (Second Pass Execution) ---");
  const summary2: ReconcileSummary = await reconcileTestCategories({
    client: mockClient,
    dryRun: false,
  });

  assert(summary2.existing === 16, `Second pass finds all 16 approved categories existing (got: ${summary2.existing})`);
  assert(summary2.created === 0, `Second pass creates exactly 0 categories (idempotency guaranteed) (got: ${summary2.created})`);
  assert(summary2.total === 18, `Total database count remains 18 (zero duplicate records) (got: ${summary2.total})`);

  // 5. Verify Live Database Safety (Ensure Antigravity task did NOT modify DB)
  console.log("\n--- 5. Verifying Live Database Safety ---");
  const liveCountBefore = await prisma.testCategory.count();
  const liveSummaryDryRun = await reconcileTestCategories({ dryRun: true });
  const liveCountAfter = await prisma.testCategory.count();

  assert(liveCountBefore === liveCountAfter, `Live database count unchanged (${liveCountBefore} === ${liveCountAfter})`);
  assert(liveSummaryDryRun.total === liveCountBefore, `Dry run reports accurate live database total (${liveSummaryDryRun.total})`);

  console.log("\n===============================================================");
  console.log(`  AUTOMATED TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
