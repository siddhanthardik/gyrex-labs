import * as fs from "fs";
import { prisma } from "../lib/db/prisma";
import {
  APPROVED_CATEGORY_ALIASES,
  CLINICAL_REVIEW_CATEGORIES,
  TEST_SPECIFIC_CATEGORY_OVERRIDES,
  resolveCategory,
  analyzeTestMasterSpreadsheet,
} from "../services/superadmin/testmaster-import-service";

async function runTests() {
  console.log("===============================================================");
  console.log("  CATEGORY RECONCILIATION & ALIAS RESOLUTION VERIFICATION");
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

  // Pre-fetch DB categories
  const categories = await prisma.testCategory.findMany();
  const categoryMapByName = new Map<string, string>();
  const categoryMapBySlug = new Map<string, string>();
  const categoryDisplayNames = new Map<string, string>();

  for (const cat of categories) {
    categoryMapByName.set(cat.name.trim().toLowerCase(), cat.id);
    categoryMapBySlug.set(cat.slug.trim().toLowerCase(), cat.id);
    categoryDisplayNames.set(cat.id, cat.name);
  }

  // 1. Test that DB has exactly 13 categories
  assert(categories.length === 13, `TestCategory count is 13 (found: ${categories.length})`);

  // 2. Test exact category matches for all 13 categories
  console.log("\n--- Testing Exact Category Matches (All 13) ---");
  let exactAllMatch = true;
  for (const cat of categories) {
    const resByName = resolveCategory(cat.name, categoryMapByName, categoryMapBySlug, categoryDisplayNames);
    const resBySlug = resolveCategory(cat.slug, categoryMapByName, categoryMapBySlug, categoryDisplayNames);
    if (!resByName.categoryId || (resByName.source !== "EXACT_NAME" && resByName.source !== "APPROVED_ALIAS")) {
      exactAllMatch = false;
      console.error(`Failed exact name match for: ${cat.name}`);
    }
    if (
      !resBySlug.categoryId ||
      (resBySlug.source !== "EXACT_SLUG" && resBySlug.source !== "EXACT_NAME" && resBySlug.source !== "APPROVED_ALIAS")
    ) {
      exactAllMatch = false;
      console.error(`Failed exact slug match for: ${cat.slug}`);
    }
  }
  assert(exactAllMatch, "All 13 DB categories resolve accurately by exact name and slug");

  // 3. Test that all approved aliases resolve to existing DB categories
  console.log("\n--- Testing All Approved Aliases ---");
  let aliasesAllResolve = true;
  const aliasEntries = Object.entries(APPROVED_CATEGORY_ALIASES);
  for (const [alias, canonicalTarget] of aliasEntries) {
    const res = resolveCategory(alias, categoryMapByName, categoryMapBySlug, categoryDisplayNames);
    if (!res.categoryId) {
      aliasesAllResolve = false;
      console.error(`Alias "${alias}" failed to resolve!`);
    } else if (res.canonicalCategoryName.toLowerCase() !== canonicalTarget.toLowerCase()) {
      aliasesAllResolve = false;
      console.error(`Alias "${alias}" resolved to "${res.canonicalCategoryName}" instead of "${canonicalTarget}"`);
    }
  }
  assert(
    aliasesAllResolve,
    `All ${aliasEntries.length} approved category aliases resolve to their canonical active DB category`
  );

  // 4. Test unknown category rejection
  console.log("\n--- Testing Unknown Category Rejection ---");
  const unknownRes = resolveCategory(
    "NonExistentDepartment_XYZ_999",
    categoryMapByName,
    categoryMapBySlug,
    categoryDisplayNames
  );
  assert(
    unknownRes.categoryId === null && unknownRes.source === "UNRESOLVED",
    "Unknown category is rejected with UNRESOLVED status and null categoryId"
  );

  // 5. Test test-specific overrides
  console.log("\n--- Testing Test-Specific Overrides ---");
  const overrideRes1 = resolveCategory(
    "Flow Cytometry",
    categoryMapByName,
    categoryMapBySlug,
    categoryDisplayNames,
    "GYX-00400",
    "Crossmatch - Flow Cytometry"
  );
  assert(
    overrideRes1.canonicalCategoryName === "Histocompatibility & Immunogenetics",
    "GYX-00400 (Crossmatch - Flow Cytometry) correctly resolves to Histocompatibility & Immunogenetics"
  );

  const overrideRes2 = resolveCategory(
    "Hematologic Malignancy & Cytogenetics",
    categoryMapByName,
    categoryMapBySlug,
    categoryDisplayNames,
    "GYX-00508",
    "ADAMTS13 Activity"
  );
  assert(
    overrideRes2.canonicalCategoryName === "Hematology",
    "GYX-00508 (ADAMTS13 Activity) correctly resolves to Hematology"
  );

  const overrideRes3 = resolveCategory(
    "Hematologic Malignancy & Cytogenetics",
    categoryMapByName,
    categoryMapBySlug,
    categoryDisplayNames,
    "GYX-00510",
    "ALK Fusion FISH"
  );
  assert(
    overrideRes3.canonicalCategoryName === "Molecular Diagnostics & Genetics",
    "GYX-00510 (ALK Fusion FISH) correctly resolves to Molecular Diagnostics & Genetics"
  );

  // 6. Test that LabTest count remains unchanged
  const labTestCount = await prisma.labTest.count();
  assert(labTestCount === 12, `LabTest count is 12 (untouched)`);

  // 7. Run analyzeTestMasterSpreadsheet on 699-row production seed
  console.log("\n--- Testing Production Seed Analysis (Preview Mode - Zero Writes) ---");
  const seedPath = "C:\\Users\\hp\\Downloads\\Gyrex_Labs_TestMaster_PRODUCTION_SEED_v1.xlsx";
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found at ${seedPath}`);
    failed++;
  } else {
    const seedBuffer = fs.readFileSync(seedPath);
    const analysis = await analyzeTestMasterSpreadsheet(seedBuffer, "Gyrex_Labs_TestMaster_PRODUCTION_SEED_v1.xlsx");

    console.log(`\n  Analysis Summary on 699-row Production Seed:`);
    console.log(`  - Total Rows: ${analysis.totalRows}`);
    console.log(`  - Valid Rows (NEW): ${analysis.validRows}`);
    console.log(`  - Existing in DB (SKIP): ${analysis.existingCount}`);
    console.log(`  - Duplicates in File: ${analysis.duplicateCount}`);
    console.log(`  - Blocking Errors: ${analysis.errorCount}`);

    assert(analysis.totalRows === 699, "Analyzed exactly 699 total rows");
    assert(analysis.validRows === 697, `Valid rows (NEW) = 697 (found: ${analysis.validRows})`);
    assert(analysis.existingCount === 2, `Existing in DB (SKIP) = 2 (found: ${analysis.existingCount})`);
    assert(analysis.duplicateCount === 0, `Duplicates in file = 0 (found: ${analysis.duplicateCount})`);
    assert(analysis.errorCount === 0, `Zero blocking errors across all 699 rows (errorCount = ${analysis.errorCount})`);

    const clinicalAdvisories = analysis.items.filter((item) =>
      item.issues.some((iss) => iss.message.includes("[CLINICAL REVIEW REQUIRED]"))
    );
    console.log(`  - Remaining Clinical Advisories: ${clinicalAdvisories.length}`);
  }

  console.log("\n===============================================================");
  console.log(`  RECONCILIATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
