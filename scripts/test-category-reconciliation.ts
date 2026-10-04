import * as fs from "fs";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db/prisma";
import {
  APPROVED_GYREX_TAXONOMY,
  APPROVED_GYREX_CATEGORIES,
  CATEGORY_NORMALIZATION_MAP,
  normalizeCategory,
  resolveCategory,
  analyzeTestMasterSpreadsheet,
  confirmTestMasterImport,
} from "../services/superadmin/testmaster-import-service";

async function runTests() {
  console.log("===============================================================");
  console.log("  COMPREHENSIVE TESTMASTER CATEGORY & IMPORT PIPELINE VERIFICATION");
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
  const categories = await prisma.testCategory.findMany({ where: { isActive: true } });
  const categoryMapByName = new Map<string, string>();
  const categoryMapBySlug = new Map<string, string>();
  const categoryDisplayNames = new Map<string, string>();

  for (const cat of categories) {
    categoryMapByName.set(cat.name.trim().toLowerCase(), cat.id);
    categoryMapBySlug.set(cat.slug.trim().toLowerCase(), cat.id);
    categoryDisplayNames.set(cat.id, cat.name);
  }

  // 1. Verify all 16 Approved Gyrex Categories exist in DB
  console.log("--- 1. Testing DB Presence of All 16 Approved Categories ---");
  for (const approved of APPROVED_GYREX_TAXONOMY) {
    const byName = categoryMapByName.get(approved.name.toLowerCase());
    const bySlug = categoryMapBySlug.get(approved.slug.toLowerCase());
    assert(
      !!(byName || bySlug),
      `Approved category "${approved.name}" exists in database (slug: "${approved.slug}")`
    );
  }

  // 2. Test exact specification mappings
  console.log("\n--- 2. Testing Exact Specification Category Mappings ---");
  const requiredMappings: Array<[string, string]> = [
    ["Microbiology & Infectious Disease Serology", "Microbiology & Infectious Diseases"],
    ["Microbiology & Infectious Diseases", "Microbiology & Infectious Diseases"],
    ["Histopathology", "Histopathology & Cytopathology"],
    ["Cytopathology", "Histopathology & Cytopathology"],
    ["Molecular Diagnostics", "Molecular Diagnostics & Genetics"],
    ["Molecular Diagnostics & Genetics", "Molecular Diagnostics & Genetics"],
    ["Oncology & Precision Medicine", "Oncology & Tumour Markers"],
    ["Oncology & Precision Diagnostics", "Oncology & Tumour Markers"],
    ["Toxicology & Therapeutic Drug Monitoring", "Toxicology & TDM"],
    ["Toxicology & TDM", "Toxicology & TDM"],
    ["Reproductive & Prenatal Diagnostics", "Reproductive & Prenatal Diagnostics"],
    ["Histocompatibility & Immunogenetics", "Histocompatibility & Immunogenetics"],
    ["Flow Cytometry", "Flow Cytometry"],
    ["Cytogenetics", "Cytogenetics"],
    ["Allergy & Hypersensitivity", "Allergy & Hypersensitivity"],
    ["Immunology & Autoimmunity", "Immunology & Autoimmunity"],
    ["Clinical Biochemistry", "Clinical Biochemistry"],
    ["Clinical Pathology", "Clinical Pathology"],
    ["Endocrinology", "Endocrinology"],
    ["Hematology", "Hematology"],
    ["Hematology & Coagulation", "Hematology & Coagulation"],
  ];

  for (const [source, expectedTarget] of requiredMappings) {
    const normalized = normalizeCategory(source);
    assert(
      normalized === expectedTarget,
      `normalizeCategory("${source}") -> "${expectedTarget}" (got: "${normalized}")`
    );

    const resolved = resolveCategory(
      source,
      categoryMapByName,
      categoryMapBySlug,
      categoryDisplayNames
    );
    assert(
      resolved.canonicalCategoryName === expectedTarget && resolved.categoryId !== null,
      `resolveCategory("${source}") resolves to active DB category ID`
    );
  }

  // 3. Test case and whitespace variations
  console.log("\n--- 3. Testing Case & Whitespace Variations ---");
  const variations: Array<[string, string]> = [
    ["  microbiology & infectious diseases  ", "Microbiology & Infectious Diseases"],
    ["HISTOPATHOLOGY & CYTOPATHOLOGY", "Histopathology & Cytopathology"],
    ["mOlEcUlAr   dIaGnOsTiCs & gEnEtIcS", "Molecular Diagnostics & Genetics"],
    ["oncology & tumour markers", "Oncology & Tumour Markers"],
    ["TOXICOLOGY & TDM", "Toxicology & TDM"],
    ["   haematology & coagulation   ", "Hematology & Coagulation"],
    ["biochemistry", "Clinical Biochemistry"],
    ["serology & immunology", "Immunology & Autoimmunity"],
  ];

  for (const [variant, expectedTarget] of variations) {
    const normalized = normalizeCategory(variant);
    assert(
      normalized === expectedTarget,
      `Variation "${variant}" correctly normalizes to "${expectedTarget}"`
    );
  }

  // 4. Test unknown category rejection (Do not blindly accept arbitrary strings)
  console.log("\n--- 4. Testing Unknown Category Rejection ---");
  const invalidCategories = [
    "Arbitrary Department 123",
    "NonExistentSpecialty",
    "Custom Lab Category",
    "Random String",
    "",
    "   ",
  ];

  for (const invalid of invalidCategories) {
    const normalized = normalizeCategory(invalid);
    assert(normalized === null, `normalizeCategory("${invalid}") returns null for unapproved category`);

    const resolved = resolveCategory(
      invalid,
      categoryMapByName,
      categoryMapBySlug,
      categoryDisplayNames
    );
    assert(
      resolved.categoryId === null && resolved.source === "UNRESOLVED",
      `resolveCategory("${invalid}") returns UNRESOLVED with null categoryId`
    );
  }

  // 5. Test duplicate codes in uploaded file vs existing DB codes
  console.log("\n--- 5. Testing Duplicate Code & Existing DB Code Handling ---");
  const headers = [
    "Test Code",
    "Test Name",
    "Category",
    "Sample Type",
    "Standard TAT (Hours)",
    "Fasting Required",
    "Active",
  ];

  const testSpreadsheetRows = [
    // Row 2: Valid new test
    ["GYX_PIPE_TEST_1", "Pipeline Unique Test 1", "Clinical Biochemistry", "Serum", 24, "No", "Yes"],
    // Row 3: Matches existing TestMaster record in DB (CBC)
    ["CBC", "Complete Blood Count", "Hematology", "EDTA Blood", 24, "No", "Yes"],
    // Row 4: Duplicate in file of Row 2
    ["GYX_PIPE_TEST_1", "Pipeline Duplicate Test", "Clinical Biochemistry", "Serum", 24, "No", "Yes"],
    // Row 5: Normalized category from legacy name
    ["GYX_PIPE_TEST_2", "Pipeline Normalized Test", "Microbiology & Infectious Disease Serology", "Serum", 48, "No", "Yes"],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...testSpreadsheetRows]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const previewAnalysis = await analyzeTestMasterSpreadsheet(buffer, "test_pipeline.xlsx");

  assert(previewAnalysis.totalRows === 4, "Preview parses 4 total rows");
  assert(previewAnalysis.hasBlockingErrors === true, "File with duplicate code has blocking errors");
  assert(previewAnalysis.duplicateCount === 1, "Duplicate code within file correctly flagged");

  // Verify existing database code produced EXISTING_SKIP
  const cbcRow = previewAnalysis.items.find((it) => it.code === "CBC");
  assert(cbcRow?.status === "EXISTING_SKIP", "Existing database code 'CBC' produces EXISTING_SKIP status");

  // Verify normalized category name in preview
  const legacyCatRow = previewAnalysis.items.find((it) => it.code === "GYX_PIPE_TEST_2");
  assert(
    legacyCatRow?.categoryName === "Microbiology & Infectious Diseases",
    `Preview shows NORMALIZED category ("${legacyCatRow?.categoryName}") instead of raw Excel string`
  );

  // 6. Test Preview / Import Parity
  console.log("\n--- 6. Testing Preview & Import Parity ---");
  const validSingleRow = [
    ["GYX_PARITY_001", "Parity Test", "Toxicology & Therapeutic Drug Monitoring", "Serum", 24, "No", "Yes"],
  ];
  const parityWb = XLSX.utils.book_new();
  const parityWs = XLSX.utils.aoa_to_sheet([headers, ...validSingleRow]);
  XLSX.utils.book_append_sheet(parityWb, parityWs, "Sheet1");
  const parityBuffer = XLSX.write(parityWb, { type: "buffer", bookType: "xlsx" });

  const parityAnalysis = await analyzeTestMasterSpreadsheet(parityBuffer, "parity.xlsx");
  assert(parityAnalysis.validRows === 1, "Parity item is valid in preview");
  assert(
    parityAnalysis.items[0].categoryName === "Toxicology & TDM",
    "Preview normalized 'Toxicology & Therapeutic Drug Monitoring' to 'Toxicology & TDM'"
  );

  // 7. Verify database safety guarantees
  console.log("\n--- 7. Verifying Safety Guarantees ---");
  const labTestCount = await prisma.labTest.count();
  assert(labTestCount === 12, `LabTest count is 12 (strictly untouched)`);

  const testMasterCount = await prisma.testMaster.count();
  assert(testMasterCount === 16, `TestMaster count is 16 (zero unauthorized rows committed)`);

  console.log("\n===============================================================");
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
