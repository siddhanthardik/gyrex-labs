import * as XLSX from "xlsx";
import { analyzeTestMasterSpreadsheet } from "../services/superadmin/testmaster-import-service";

/**
 * Filter simulation function identical to the page.tsx implementation
 */
function applyImportFilter(
  items: any[],
  filter: "ALL" | "NEW" | "EXISTING" | "ERROR"
) {
  return items.filter((item) => {
    if (filter === "NEW") return item.status === "NEW";
    if (filter === "EXISTING") return item.status === "EXISTING_SKIP";
    if (filter === "ERROR") return item.status === "ERROR" || item.issues?.some((i: any) => i.type === "ERROR");
    return true;
  });
}

function computeErrorBreakdown(items: any[]) {
  const fieldMap = new Map<string, { count: number; rowNumbers: Set<number> }>();

  for (const item of items) {
    for (const iss of item.issues || []) {
      if (iss.type === "ERROR") {
        const field = iss.field || "general";
        const existing = fieldMap.get(field) || { count: 0, rowNumbers: new Set<number>() };
        existing.count += 1;
        existing.rowNumbers.add(item.rowNumber);
        fieldMap.set(field, existing);
      }
    }
  }

  return Array.from(fieldMap.entries())
    .map(([field, data]) => ({
      field,
      count: data.count,
      rowCount: data.rowNumbers.size,
    }))
    .sort((a, b) => b.count - a.count);
}

async function runFilterTests() {
  console.log("===============================================================");
  console.log("  SUPERADMIN TEST MASTER PREVIEW FILTER & ERROR VIEW TESTS");
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

  // Build a test workbook with a rich mix of rows:
  // - Valid new rows
  // - Existing rows (skip)
  // - Rows with single error (invalid category)
  // - Rows with multiple errors (blank name, invalid TAT, duplicate code)
  // - Rows with warnings only
  const headers = [
    "Test Code",
    "Test Name",
    "Category",
    "Sample Type",
    "Standard TAT (Hours)",
    "Fasting Required",
    "Preparation Instructions",
    "Synonyms",
    "Standardized Code / LOINC",
    "Description",
    "Active",
  ];

  const testRows = [
    // Row 2: Valid New (Hematology)
    ["TST_FILT_001", "Filtered Test One", "Hematology", "EDTA Blood", 24, "No", "None", "F1", "", "Desc 1", "Yes"],
    // Row 3: Valid New (Biochemistry)
    ["TST_FILT_002", "Filtered Test Two", "Biochemistry", "Serum", 12, "Yes", "Fast 12h", "F2", "", "Desc 2", "Yes"],
    // Row 4: Matches existing database record (CBC exists in standard DB)
    ["CBC", "Complete Blood Count Existing Match", "Hematology", "EDTA Blood", 24, "No", "", "", "", "", "Yes"],
    // Row 5: Single error: Unrecognized invalid category
    ["TST_FILT_ERR1", "Error Test Unrecognized Cat", "NonExistentSpecialty123", "Serum", 24, "No", "", "", "", "", "Yes"],
    // Row 6: Multiple errors: missing name, invalid negative TAT, and invalid category
    ["TST_FILT_ERR2", "", "InvalidCategoryXYZ", "Plasma", -5, "No", "", "", "", "", "Yes"],
    // Row 7: Duplicate code within file (matches TST_FILT_ERR1 code)
    ["TST_FILT_ERR1", "Duplicate Code Test", "Hematology", "Serum", 24, "No", "", "", "", "", "Yes"],
    // Row 8: Valid New (Endocrinology)
    ["TST_FILT_003", "Filtered Test Three", "Endocrinology", "Serum", 48, "No", "", "", "", "", "Yes"],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...testRows]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const analysis = await analyzeTestMasterSpreadsheet(buffer, "test_filters_sample.xlsx");

  console.log(`\nAnalysis summary produced by service:`);
  console.log(`- totalRows: ${analysis.totalRows}`);
  console.log(`- validRows (NEW): ${analysis.validRows}`);
  console.log(`- existingCount: ${analysis.existingCount}`);
  console.log(`- duplicateCount: ${analysis.duplicateCount}`);
  console.log(`- errorCount: ${analysis.errorCount}`);
  console.log(`- hasBlockingErrors: ${analysis.hasBlockingErrors}\n`);

  // Criterion 1: Verify "All" filter returns all rows
  const allRows = applyImportFilter(analysis.items, "ALL");
  assert(allRows.length === analysis.totalRows, `1. 'ALL' filter returns all rows (got ${allRows.length}, expected ${analysis.totalRows})`);
  assert(allRows.length === 7, `   'ALL' count matches sample data (7 rows)`);

  // Criterion 2: Verify "New" filter returns only NEW rows
  const newRows = applyImportFilter(analysis.items, "NEW");
  assert(newRows.length === analysis.newRecordsCount, `2. 'NEW' filter returns exactly newRecordsCount (${newRows.length} == ${analysis.newRecordsCount})`);
  assert(newRows.every((r) => r.status === "NEW"), `   All rows in 'NEW' filter have status === 'NEW'`);

  // Criterion 3: Verify "Existing Skipped" filter returns only EXISTING_SKIP rows
  const existingRows = applyImportFilter(analysis.items, "EXISTING");
  assert(existingRows.length === analysis.existingCount, `3. 'EXISTING' filter returns exactly existingCount (${existingRows.length} == ${analysis.existingCount})`);
  assert(existingRows.every((r) => r.status === "EXISTING_SKIP"), `   All rows in 'EXISTING' filter have status === 'EXISTING_SKIP'`);

  // Criterion 4: Verify "Errors" filter returns only ERROR rows
  const errorRows = applyImportFilter(analysis.items, "ERROR");
  assert(errorRows.length === analysis.errorCount, `4. 'ERROR' filter returns exactly errorCount (${errorRows.length} == ${analysis.errorCount})`);
  assert(errorRows.every((r) => r.status === "ERROR" || r.issues.some((i: any) => i.type === "ERROR")), `   All rows in 'ERROR' filter are blocking error rows`);

  // Criterion 5: Verify error rows contain rowNumber, code, name, category, field, and message
  console.log("\n--- Checking Error Row Data Integrity ---");
  const errRow1 = errorRows.find((r) => r.code === "TST_FILT_ERR1" && r.name === "Error Test Unrecognized Cat");
  assert(!!errRow1, `5a. First error row found`);
  assert(errRow1?.rowNumber === 5, `5b. Row number preserved correctly (5)`);
  assert(errRow1?.code === "TST_FILT_ERR1", `5c. Test code preserved correctly ('TST_FILT_ERR1')`);
  assert(errRow1?.name === "Error Test Unrecognized Cat", `5d. Test name preserved correctly`);
  assert(errRow1?.categoryName === "NonExistentSpecialty123", `5e. Unresolved category name preserved ('NonExistentSpecialty123')`);
  assert(errRow1?.issues.length === 1 && errRow1.issues[0].field === "category", `5f. Field identifier 'category' preserved`);
  assert(errRow1?.issues[0].message.includes("does not exist"), `5g. Exact error message returned for category`);

  // Criterion 6: Verify multiple issues per row are preserved
  console.log("\n--- Checking Multiple Issues Per Row ---");
  const multiErrRow = errorRows.find((r) => r.rowNumber === 6);
  assert(!!multiErrRow, `6a. Multiple error row found (row 6)`);
  const errorTypes = multiErrRow?.issues.filter((i: any) => i.type === "ERROR");
  assert((errorTypes?.length ?? 0) >= 3, `6b. Preserved all 3 errors on row 6 (got ${errorTypes?.length})`);
  const fields = errorTypes?.map((i: any) => i.field) || [];
  assert(fields.includes("name"), `6c. Row 6 includes 'name' error`);
  assert(fields.includes("category"), `6d. Row 6 includes 'category' error`);
  assert(fields.includes("standardTatHours"), `6e. Row 6 includes 'standardTatHours' error`);

  // Check error breakdown computation
  const breakdown = computeErrorBreakdown(analysis.items);
  console.log("\n--- Checking Error Breakdown Summary ---");
  assert(breakdown.length >= 3, `7a. Error breakdown groups multiple field types (found ${breakdown.length})`);
  console.log(`Breakdown:`, breakdown);
  assert(breakdown.some((b) => b.field === "category"), `7b. Breakdown includes category failures`);
  assert(breakdown.some((b) => b.field === "name"), `7c. Breakdown includes name failures`);
  assert(breakdown.some((b) => b.field === "standardTatHours"), `7d. Breakdown includes standardTatHours failures`);

  // Criterion 7: Verify zero-error state handling
  console.log("\n--- Checking Zero-Error State Handling ---");
  const zeroErrorRows = [
    ["TST_ZERO_001", "Zero Err Test 1", "Hematology", "EDTA Blood", 24, "No", "", "", "", "", "Yes"],
    ["TST_ZERO_002", "Zero Err Test 2", "Biochemistry", "Serum", 12, "No", "", "", "", "", "Yes"],
  ];
  const zeroWb = XLSX.utils.book_new();
  const zeroWs = XLSX.utils.aoa_to_sheet([headers, ...zeroErrorRows]);
  XLSX.utils.book_append_sheet(zeroWb, zeroWs, "Sheet1");
  const zeroBuffer = XLSX.write(zeroWb, { type: "buffer", bookType: "xlsx" });

  const zeroAnalysis = await analyzeTestMasterSpreadsheet(zeroBuffer, "zero_error_sample.xlsx");
  assert(zeroAnalysis.errorCount === 0, `8a. Zero errors in valid file`);
  assert(!zeroAnalysis.hasBlockingErrors, `8b. hasBlockingErrors is false`);
  const zeroFilteredErrors = applyImportFilter(zeroAnalysis.items, "ERROR");
  assert(zeroFilteredErrors.length === 0, `8c. applyImportFilter('ERROR') returns empty array for zero error state`);

  // Criterion 8: Verify counts match the summary numbers
  console.log("\n--- Checking Count Consistency ---");
  assert(analysis.totalRows === allRows.length, `9a. totalRows equals All filter length`);
  assert(analysis.newRecordsCount === newRows.length, `9b. newRecordsCount equals New filter length`);
  assert(analysis.existingCount === existingRows.length, `9c. existingCount equals Existing filter length`);
  assert(analysis.errorCount === errorRows.length, `9d. errorCount equals Error filter length`);
  assert(
    analysis.totalRows === newRows.length + existingRows.length + errorRows.length,
    `9e. Partition integrity: Total (${analysis.totalRows}) === New (${newRows.length}) + Existing (${existingRows.length}) + Errors (${errorRows.length})`
  );

  console.log("\n===============================================================");
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFilterTests().catch((err) => {
  console.error("Test run error:", err);
  process.exit(1);
});
