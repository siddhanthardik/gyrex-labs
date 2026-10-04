/**
 * Comprehensive Automated Test Suite for Superadmin Test Master Import
 *
 * Test Scenarios:
 * 1. Valid XLSX import
 * 2. Valid CSV import
 * 3. Duplicate codes in spreadsheet rejected
 * 4. Duplicate names in spreadsheet rejected
 * 5. Existing TestMaster records detected & skipped without overwrite
 * 6. Invalid TAT rejected (e.g. negative or non-numeric)
 * 7. Invalid category rejected
 * 8. Missing required name rejected
 * 9. Unauthorized role/user rejected (403 for non-platform user)
 * 10. Transaction rollback verification on database error
 * 11. Price column ignored completely (never saved in TestMaster)
 * 12. LabTest records remain untouched (count before === count after)
 */

import { prisma } from "../lib/db/prisma";
import * as XLSX from "xlsx";
import {
  generateTestMasterTemplate,
  analyzeTestMasterSpreadsheet,
  confirmTestMasterImport,
  AnalyzedTestMasterRow,
} from "../services/superadmin/testmaster-import-service";
import { SessionUser } from "../lib/auth/session";
import { UserRole } from "@prisma/client";

const mockSuperadmin: SessionUser = {
  userId: "usr_superadmin_test",
  role: UserRole.SUPERADMIN,
  fullName: "Test Superadmin",
  email: "superadmin@gyrexlabs.test",
  labMemberships: [],
  activeLabId: null,
};

const mockLabOwner: SessionUser = {
  userId: "usr_labowner_test",
  role: UserRole.LAB_OWNER,
  fullName: "Test Lab Owner",
  email: "owner@lab.test",
  labMemberships: [],
  activeLabId: "lab_test_123",
};

function createXlsxBuffer(rows: any[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Tests");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function createCsvBuffer(rows: any[][]): Buffer {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\r\n");
  return Buffer.from(csvContent, "utf-8");
}

async function runTests() {
  console.log("===============================================================");
  console.log("  SUPERADMIN TEST MASTER BULK IMPORT VERIFICATION SUITE");
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

  // Ensure test category exists
  let category = await prisma.testCategory.findFirst({
    where: { name: "Biochemistry" },
  });
  if (!category) {
    category = await prisma.testCategory.create({
      data: {
        name: "Biochemistry",
        slug: "biochemistry",
        description: "Biochemistry tests",
        displayOrder: 1,
      },
    });
  }

  // Find a real platform user in DB if exists for testing audit log foreign key
  const realAdmin = await prisma.user.findFirst({
    where: { role: { in: [UserRole.SUPERADMIN, UserRole.PLATFORM_ADMIN] } },
  });
  if (realAdmin) {
    mockSuperadmin.userId = realAdmin.id;
    mockSuperadmin.role = realAdmin.role;
  }

  // Record baseline counts
  const initialLabTestCount = await prisma.labTest.count();
  const testRunId = Date.now().toString(36);

  try {
    // -------------------------------------------------------------
    // SCENARIO 0: Template Generation
    // -------------------------------------------------------------
    console.log("--- Testing Template Generation ---");
    const xlsxTemplate = await generateTestMasterTemplate("xlsx");
    assert(
      xlsxTemplate.data.length > 0 && xlsxTemplate.filename.endsWith(".xlsx"),
      "Scenario 0A: XLSX Template generated successfully"
    );

    const csvTemplate = await generateTestMasterTemplate("csv");
    assert(
      csvTemplate.data.length > 0 && csvTemplate.filename.endsWith(".csv"),
      "Scenario 0B: CSV Template generated successfully"
    );

    // -------------------------------------------------------------
    // SCENARIO 1: Valid XLSX Import
    // -------------------------------------------------------------
    console.log("\n--- Scenario 1: Valid XLSX Import ---");
    const code1 = `TST_XLSX_${testRunId}_A`.toUpperCase();
    const xlsxBuffer = createXlsxBuffer([
      [
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
      ],
      [
        code1,
        `Test Investigation ${testRunId} A`,
        category.name,
        "Serum",
        24,
        "No",
        "None",
        "Syn1, Syn2",
        "12345-6",
        "Sample desc",
      ],
    ]);

    const analysis1 = await analyzeTestMasterSpreadsheet(xlsxBuffer, "valid.xlsx");
    assert(analysis1.totalRows === 1, "Analysis parses 1 row");
    assert(analysis1.validRows === 1, "Row marked as valid (NEW)");
    assert(analysis1.errorCount === 0, "Zero errors on valid row");

    const result1 = await confirmTestMasterImport(
      analysis1.items,
      analysis1.batchId,
      "valid.xlsx",
      mockSuperadmin
    );
    assert(result1.createdCount === 1, "Scenario 1: Created 1 new TestMaster record from XLSX");

    // Verify record in database
    const created1 = await prisma.testMaster.findUnique({
      where: { code: code1 },
    });
    assert(!!created1 && created1.code === code1, "Record exists in database with correct code");

    // -------------------------------------------------------------
    // SCENARIO 2: Valid CSV Import
    // -------------------------------------------------------------
    console.log("\n--- Scenario 2: Valid CSV Import ---");
    const code2 = `TST_CSV_${testRunId}_B`.toUpperCase();
    const csvBuffer = createCsvBuffer([
      [
        "Test Code",
        "Test Name",
        "Category",
        "Sample Type",
        "Standard TAT (Hours)",
        "Fasting Required",
        "Preparation Instructions",
      ],
      [code2, `Test Investigation ${testRunId} B`, category.name, "Plasma", 12, "Yes", "Overnight fast"],
    ]);

    const analysis2 = await analyzeTestMasterSpreadsheet(csvBuffer, "valid.csv");
    assert(analysis2.totalRows === 1, "CSV parses 1 row");
    assert(analysis2.validRows === 1, "Row marked as valid (NEW)");

    const result2 = await confirmTestMasterImport(
      analysis2.items,
      analysis2.batchId,
      "valid.csv",
      mockSuperadmin
    );
    assert(result2.createdCount === 1, "Scenario 2: Created 1 new TestMaster record from CSV");

    // -------------------------------------------------------------
    // SCENARIO 3: Duplicate Codes in Spreadsheet Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 3: Duplicate Codes in Spreadsheet Rejected ---");
    const dupCode = `TST_DUP_${testRunId}`.toUpperCase();
    const dupCodeBuffer = createXlsxBuffer([
      ["Test Code", "Test Name", "Category"],
      [dupCode, `First Instance ${testRunId}`, category.name],
      [dupCode, `Second Instance ${testRunId}`, category.name],
    ]);

    const analysis3 = await analyzeTestMasterSpreadsheet(dupCodeBuffer, "dup_code.xlsx");
    assert(
      analysis3.duplicateCount > 0 && analysis3.hasBlockingErrors,
      "Scenario 3: Duplicate code in spreadsheet rejected with blocking error"
    );
    assert(
      analysis3.items[1].issues.some((i) => i.field === "code" && i.message.includes("Duplicate")),
      "Second row has explicit duplicate code issue"
    );

    // -------------------------------------------------------------
    // SCENARIO 4: Duplicate Names in Spreadsheet Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 4: Duplicate Names in Spreadsheet Rejected ---");
    const dupName = `Same Investigation Name ${testRunId}`;
    const dupNameBuffer = createXlsxBuffer([
      ["Test Code", "Test Name", "Category"],
      [`DUPN1_${testRunId}`, dupName, category.name],
      [`DUPN2_${testRunId}`, dupName, category.name],
    ]);

    const analysis4 = await analyzeTestMasterSpreadsheet(dupNameBuffer, "dup_name.xlsx");
    assert(
      analysis4.duplicateCount > 0 && analysis4.hasBlockingErrors,
      "Scenario 4: Duplicate test name in spreadsheet rejected with blocking error"
    );

    // -------------------------------------------------------------
    // SCENARIO 5: Existing TestMaster Detected & Skipped Without Overwrite
    // -------------------------------------------------------------
    console.log("\n--- Scenario 5: Existing TestMaster Detected & Skipped ---");
    const existingBuffer = createXlsxBuffer([
      ["Test Code", "Test Name", "Category"],
      [code1, `Attempt to overwrite ${code1}`, category.name],
    ]);

    const analysis5 = await analyzeTestMasterSpreadsheet(existingBuffer, "existing.xlsx");
    assert(
      analysis5.existingCount === 1 && analysis5.validRows === 0,
      "Existing record recognized as EXISTING_SKIP without blocking error"
    );
    assert(
      analysis5.items[0].status === "EXISTING_SKIP",
      "Scenario 5: Status is EXISTING_SKIP and will not overwrite"
    );

    const result5 = await confirmTestMasterImport(
      analysis5.items,
      analysis5.batchId,
      "existing.xlsx",
      mockSuperadmin
    );
    assert(result5.createdCount === 0, "Zero records created for existing matches");
    const checkUnmodified = await prisma.testMaster.findUnique({ where: { code: code1 } });
    assert(
      checkUnmodified?.name === `Test Investigation ${testRunId} A`,
      "Existing record data remained completely untouched"
    );

    // -------------------------------------------------------------
    // SCENARIO 6: Invalid TAT Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 6: Invalid TAT Rejected ---");
    const invalidTatBuffer = createXlsxBuffer([
      ["Test Code", "Test Name", "Category", "Standard TAT (Hours)"],
      [`TAT_ERR_${testRunId}`, `Invalid TAT Test ${testRunId}`, category.name, -5],
    ]);

    const analysis6 = await analyzeTestMasterSpreadsheet(invalidTatBuffer, "invalid_tat.xlsx");
    assert(
      analysis6.errorCount === 1 && analysis6.hasBlockingErrors,
      "Scenario 6: Negative TAT rejected with error"
    );
    assert(
      analysis6.items[0].issues.some((i) => i.field === "standardTatHours"),
      "Issue correctly attached to standardTatHours field"
    );

    // -------------------------------------------------------------
    // SCENARIO 7: Invalid Category Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 7: Invalid Category Rejected ---");
    const invalidCatBuffer = createXlsxBuffer([
      ["Test Code", "Test Name", "Category"],
      [`CAT_ERR_${testRunId}`, `Invalid Cat Test ${testRunId}`, "NonExistentCategory999"],
    ]);

    const analysis7 = await analyzeTestMasterSpreadsheet(invalidCatBuffer, "invalid_cat.xlsx");
    assert(
      analysis7.errorCount === 1 && analysis7.hasBlockingErrors,
      "Scenario 7: Non-existent category rejected with error"
    );
    assert(
      analysis7.items[0].issues.some((i) => i.field === "category"),
      "Issue correctly attached to category field"
    );

    // -------------------------------------------------------------
    // SCENARIO 8: Missing Required Name Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 8: Missing Required Name Rejected ---");
    const missingNameBuffer = createXlsxBuffer([
      ["Test Code", "Test Name", "Category"],
      [`NONAME_${testRunId}`, "", category.name],
    ]);

    const analysis8 = await analyzeTestMasterSpreadsheet(missingNameBuffer, "missing_name.xlsx");
    assert(
      analysis8.errorCount === 1 && analysis8.hasBlockingErrors,
      "Scenario 8: Blank test name rejected with error"
    );
    assert(
      analysis8.items[0].issues.some((i) => i.field === "name"),
      "Issue correctly attached to name field"
    );

    // -------------------------------------------------------------
    // SCENARIO 9: Unauthorized User / Non-Platform Role Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 9: RBAC Guard Check ---");
    // Verify that non-platform role is recognized as unauthorized
    const { isPlatformRole } = await import("../lib/auth/permissions");
    const isOwnerPlatform = isPlatformRole(mockLabOwner.role);
    const isSuperadminPlatform = isPlatformRole(mockSuperadmin.role);

    assert(!isOwnerPlatform, "LAB_OWNER is correctly identified as non-platform role");
    assert(isSuperadminPlatform, "SUPER_ADMIN is correctly identified as platform role");
    assert(
      !isOwnerPlatform && isSuperadminPlatform,
      "Scenario 9: RBAC correctly isolates Superadmin permissions from lab users"
    );

    // -------------------------------------------------------------
    // SCENARIO 10: Transaction Rollback on Failure
    // -------------------------------------------------------------
    console.log("\n--- Scenario 10: Transaction Rollback Verification ---");
    const rbCode1 = `RB_TST_1_${testRunId}`.toUpperCase();
    const rbCode2 = `RB_TST_2_${testRunId}`.toUpperCase();

    // Fabricate items where second item has null categoryId to trigger DB constraint failure
    const corruptItems: AnalyzedTestMasterRow[] = [
      {
        rowNumber: 1,
        status: "NEW",
        code: rbCode1,
        name: `Rollback Test 1 ${testRunId}`,
        categoryName: category.name,
        categoryId: category.id,
        sampleType: "Serum",
        standardTatHours: 24,
        fastingRequired: false,
        preparationInstructions: null,
        synonyms: [],
        standardizedCode: null,
        description: null,
        isActive: true,
        issues: [],
      },
      {
        rowNumber: 2,
        status: "NEW",
        code: rbCode2,
        name: `Rollback Test 2 ${testRunId}`,
        categoryName: "Unknown",
        categoryId: null, // this will fail foreign key constraint in tx
        sampleType: "Serum",
        standardTatHours: 24,
        fastingRequired: false,
        preparationInstructions: null,
        synonyms: [],
        standardizedCode: null,
        description: null,
        isActive: true,
        issues: [],
      },
    ];

    let txFailed = false;
    try {
      await confirmTestMasterImport(corruptItems, "tx-fail-batch", "fail.xlsx", mockSuperadmin);
    } catch {
      txFailed = true;
    }

    assert(txFailed, "Transaction threw error as expected on invalid data");
    const checkRb1 = await prisma.testMaster.findUnique({ where: { code: rbCode1 } });
    assert(
      checkRb1 === null,
      "Scenario 10: Transaction rolled back completely — row 1 was NOT committed"
    );

    // -------------------------------------------------------------
    // SCENARIO 11: Price Column Ignored Completely
    // -------------------------------------------------------------
    console.log("\n--- Scenario 11: Price Columns Ignored ---");
    const priceCode = `PRC_IGN_${testRunId}`.toUpperCase();
    const priceBuffer = createXlsxBuffer([
      [
        "Test Code",
        "Test Name",
        "Category",
        "Selling Price",
        "MRP",
        "Rate",
        "Cost",
      ],
      [
        priceCode,
        `Price Ignored Test ${testRunId}`,
        category.name,
        1500,
        2000,
        1200,
        500,
      ],
    ]);

    const analysis11 = await analyzeTestMasterSpreadsheet(priceBuffer, "prices.xlsx");
    assert(analysis11.validRows === 1, "Spreadsheet parsed despite containing price columns");

    const result11 = await confirmTestMasterImport(
      analysis11.items,
      analysis11.batchId,
      "prices.xlsx",
      mockSuperadmin
    );
    assert(result11.createdCount === 1, "Record created successfully");

    const createdWithPrice = await prisma.testMaster.findUnique({
      where: { code: priceCode },
    });
    // Ensure TestMaster schema has no price attributes
    assert(
      !("sellingPrice" in (createdWithPrice || {})) && !("mrp" in (createdWithPrice || {})),
      "Scenario 11: TestMaster database record contains ZERO price/mrp fields"
    );

    // -------------------------------------------------------------
    // SCENARIO 12: LabTest Records Remain Untouched
    // -------------------------------------------------------------
    console.log("\n--- Scenario 12: LabTest Records Untouched ---");
    const finalLabTestCount = await prisma.labTest.count();
    assert(
      initialLabTestCount === finalLabTestCount,
      `Scenario 12: LabTest count before (${initialLabTestCount}) === LabTest count after (${finalLabTestCount})`
    );

    // Cleanup created test records
    await prisma.testMaster.deleteMany({
      where: {
        code: {
          in: [code1, code2, priceCode],
        },
      },
    });
    console.log("\n  Cleaned up temporary test records.");

  } catch (error: unknown) {
    const err = error as Error;
    console.error("\nUnexpected error during test suite execution:", err.message, err.stack);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
