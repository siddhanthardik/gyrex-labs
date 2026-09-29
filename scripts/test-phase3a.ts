import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import {
  generateExcelTemplate,
  generateCsvTemplate,
  TEMPLATE_COLUMNS,
} from "@/services/lab/catalogue-template-service";
import {
  parseSpreadsheetBuffer,
  analyzeSpreadsheetImport,
  generateErrorReportCsv,
  executeCatalogueImport,
  RawRowData,
} from "@/services/lab/catalogue-import-service";

async function runTests() {
  console.log("=================================================");
  console.log("GYREX LABS — PHASE 3A COMPREHENSIVE VERIFICATION");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: any, testName: string, detail?: string) {
    totalTests++;
    if (Boolean(condition)) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}${detail ? ` - ${detail}` : ""}`);
      process.exitCode = 1;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: Template Generation (XLSX & CSV)
    // -------------------------------------------------------------
    console.log("--- 1. Testing Template Generation ---");
    const excelBuffer = await generateExcelTemplate();
    assert(excelBuffer instanceof Buffer && excelBuffer.length > 1000, "Excel template generates non-empty Buffer");

    const wb = XLSX.read(excelBuffer, { type: "buffer" });
    assert(wb.SheetNames.includes("Instructions"), "Excel workbook contains 'Instructions' sheet");
    assert(wb.SheetNames.includes("Tests"), "Excel workbook contains 'Tests' sheet");

    const testsSheet = wb.Sheets["Tests"];
    const testsJson: any[][] = XLSX.utils.sheet_to_json(testsSheet, { header: 1 });
    const headerRow = testsJson[0];
    const headersMatch = TEMPLATE_COLUMNS.every((col, idx) => headerRow[idx] === col);
    assert(headersMatch, "Excel 'Tests' sheet headers match TEMPLATE_COLUMNS exactly");
    assert(testsJson.length > 5, `Excel template pre-filled with active TestMaster rows (count: ${testsJson.length - 1})`);

    const csvContent = await generateCsvTemplate();
    assert(typeof csvContent === "string" && csvContent.length > 0, "CSV template generates non-empty string");
    const csvFirstLine = csvContent.split("\r\n")[0];
    assert(csvFirstLine === TEMPLATE_COLUMNS.join(","), "CSV header matches TEMPLATE_COLUMNS");

    // -------------------------------------------------------------
    // TEST SUITE 2: Parser & Header Validation
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Spreadsheet Parser & Validations ---");

    // Valid XLSX parse
    // Modify one row of the generated template with a valid price
    const sampleWorkbook = XLSX.read(excelBuffer, { type: "buffer" });
    const sampleSheet = sampleWorkbook.Sheets["Tests"];
    sampleSheet["E2"] = { t: "n", v: 500 }; // MRP
    sampleSheet["F2"] = { t: "n", v: 350 }; // Selling Price
    const modifiedExcelBuffer = XLSX.write(sampleWorkbook, { type: "buffer", bookType: "xlsx" });

    const parsedRows = parseSpreadsheetBuffer(modifiedExcelBuffer);
    assert(parsedRows.length > 0, `Parsed rows count from valid XLSX: ${parsedRows.length}`);
    const firstRowWithPrice = parsedRows.find((r) => r.sellingPrice !== null);
    assert(firstRowWithPrice?.sellingPrice === 350, "Parsed Selling Price matches entered value (350)");

    // Missing header check
    let threwMissingHeader = false;
    try {
      const badWb = XLSX.utils.book_new();
      const badWs = XLSX.utils.aoa_to_sheet([["Col A", "Col B", "Col C"], ["1", "2", "3"]]);
      XLSX.utils.book_append_sheet(badWb, badWs, "Tests");
      const badBuf = XLSX.write(badWb, { type: "buffer", bookType: "xlsx" });
      parseSpreadsheetBuffer(badBuf);
    } catch (e: any) {
      threwMissingHeader = true;
      assert(e.message.includes("headers"), "Rejects spreadsheet with missing mandatory headers");
    }
    assert(threwMissingHeader, "Missing header error thrown properly");

    // -------------------------------------------------------------
    // TEST SUITE 3: TestMaster Matching & Categorization
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing TestMaster Matching & Status Categorization ---");

    const testLab = await prisma.lab.findFirst();

    if (!testLab) {
      throw new Error("No existing lab found in database for testing.");
    }

    const testLabId = testLab.id;

    const mockRawRows: RawRowData[] = [
      // 1. Exact Code Match -> READY
      {
        rowNumber: 2,
        code: "CBC",
        name: "Complete Blood Count",
        mrp: 500,
        sellingPrice: 350,
        homeCollection: true,
        active: true,
        rawRecord: {},
      },
      // 2. Exact Name Match -> READY
      {
        rowNumber: 3,
        code: "CUSTOM-01",
        name: "Lipid Profile Panel",
        mrp: 900,
        sellingPrice: 700,
        homeCollection: true,
        active: true,
        rawRecord: {},
      },
      // 3. Synonym Match -> READY
      {
        rowNumber: 4,
        name: "Hemogram", // Synonym of CBC
        mrp: 400,
        sellingPrice: 300,
        homeCollection: true,
        active: true,
        rawRecord: {},
      },
      // 4. Fuzzy Match -> NEEDS_REVIEW
      {
        rowNumber: 5,
        name: "Thyroid Blood Serum Profile Fasting",
        mrp: 800,
        sellingPrice: 600,
        homeCollection: true,
        active: true,
        rawRecord: {},
      },
      // 5. Unmatched -> NEEDS_REVIEW
      {
        rowNumber: 6,
        code: "UNKN-999",
        name: "Totally Fictional Exotic Diagnostic Investigation",
        mrp: 5000,
        sellingPrice: 4000,
        homeCollection: false,
        active: true,
        rawRecord: {},
      },
      // 6. Missing Selling Price -> ERROR
      {
        rowNumber: 7,
        code: "LFT",
        name: "Liver Function Test",
        sellingPrice: null, // Error!
        rawRecord: {},
      },
      // 7. Non-positive Selling Price -> ERROR
      {
        rowNumber: 8,
        code: "KFT",
        name: "Kidney Function Test",
        sellingPrice: -50, // Error!
        rawRecord: {},
      },
      // 8. MRP < Selling Price -> WARNING / NEEDS_REVIEW
      {
        rowNumber: 9,
        code: "TSH",
        name: "Thyroid Stimulating Hormone",
        mrp: 200,
        sellingPrice: 350, // MRP lower than selling price
        rawRecord: {},
      },
      // 9. In-file duplicate -> WARNING / NEEDS_REVIEW
      {
        rowNumber: 10,
        code: "CBC",
        name: "Complete Blood Count Dup",
        sellingPrice: 360,
        rawRecord: {},
      },
    ];

    const analysis = await analyzeSpreadsheetImport(testLabId, mockRawRows);

    assert(analysis.totalRows === 9, "Analysis processes all 9 test rows");

    const r1 = analysis.items.find((i) => i.rowNumber === 2);
    assert(r1?.matchType === "EXACT_CODE" && r1.confidence === 1.0, "CBC matches by EXACT_CODE with 1.0 confidence");

    const r2 = analysis.items.find((i) => i.rowNumber === 3);
    assert(r2?.matchType === "EXACT_NAME", "Lipid Profile matches by EXACT_NAME");

    const r3 = analysis.items.find((i) => i.rowNumber === 4);
    assert(r3?.matchType === "SYNONYM", "Hemogram matches by SYNONYM");

    const r4 = analysis.items.find((i) => i.rowNumber === 5);
    assert(r4?.matchType === "FUZZY" && r4.status === "NEEDS_REVIEW", "Thyroid profile matches FUZZY and marked NEEDS_REVIEW");

    const r5 = analysis.items.find((i) => i.rowNumber === 6);
    assert(r5?.matchType === "UNMATCHED" && r5.status === "NEEDS_REVIEW", "Exotic test marked UNMATCHED and NEEDS_REVIEW");

    const r6 = analysis.items.find((i) => i.rowNumber === 7);
    assert(r6?.status === "ERROR", "Missing selling price marked ERROR");

    const r7 = analysis.items.find((i) => i.rowNumber === 8);
    assert(r7?.status === "ERROR", "Negative selling price marked ERROR");

    const r8 = analysis.items.find((i) => i.rowNumber === 9);
    assert(
      r8?.issues.some((iss) => iss.field === "mrp" && iss.type === "WARNING"),
      "MRP < Selling Price produces warning issue"
    );

    const r9 = analysis.items.find((i) => i.rowNumber === 10);
    assert(
      r9?.issues.some((iss) => iss.message.includes("Duplicate")),
      "In-file duplicate identified with warning"
    );

    // -------------------------------------------------------------
    // TEST SUITE 4: Formula Injection Defense
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing CSV Formula Injection Defense ---");

    const injectionTestRows: RawRowData[] = [
      {
        rowNumber: 2,
        name: "=cmd|' /C calc'!A0",
        code: "+HYPERLINK('http://evil.com')",
        sellingPrice: 100,
        rawRecord: {},
      },
      {
        rowNumber: 3,
        name: "-@SUM(1,2)",
        code: "@calc",
        sellingPrice: 200,
        rawRecord: {},
      },
    ];

    const injectionAnalysis = await analyzeSpreadsheetImport(testLabId, injectionTestRows);
    const errorCsv = generateErrorReportCsv(injectionAnalysis.items);

    assert(!errorCsv.includes(",=cmd"), "Formula '=' properly sanitized in CSV export");
    assert(!errorCsv.includes(",+HYPERLINK"), "Formula '+' properly sanitized in CSV export");
    assert(!errorCsv.includes(",-@SUM"), "Formula '-' properly sanitized in CSV export");
    assert(!errorCsv.includes(",@calc"), "Formula '@' properly sanitized in CSV export");
    assert(errorCsv.includes("''=cmd") || errorCsv.includes("'=cmd"), "Prefixed with quote for safe Excel handling");

    // -------------------------------------------------------------
    // TEST SUITE 5: Transactional Import & Audit Logging
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing Transactional Database Import ---");

    const masterCountBefore = await prisma.testMaster.count();

    // Select 2 valid test masters for import
    const masterItems = await prisma.testMaster.findMany({
      where: { isActive: true },
      take: 2,
    });

    const m1 = masterItems[0];
    const m2 = masterItems[1];

    const confirmResult = await executeCatalogueImport(testLabId, [
      {
        masterTestId: m1.id,
        sellingPrice: 299,
        mrpPrice: 400,
        isHomeCollectionAvailable: true,
        isActive: true,
        action: "CREATE",
      },
      {
        masterTestId: m2.id,
        sellingPrice: 599,
        mrpPrice: 700,
        isHomeCollectionAvailable: true,
        isActive: true,
        action: "CREATE",
      },
    ]);

    assert(confirmResult.success, "Transactional import executed successfully");
    assert(confirmResult.totalProcessed === 2, "2 items processed in import");

    // Verify LabTest records exist in DB
    const savedTest1 = await prisma.labTest.findUnique({
      where: { labId_masterTestId: { labId: testLabId, masterTestId: m1.id } },
    });
    assert(Number(savedTest1?.sellingPrice) === 299, `Test 1 selling price saved correctly: ₹${savedTest1?.sellingPrice}`);

    const savedTest2 = await prisma.labTest.findUnique({
      where: { labId_masterTestId: { labId: testLabId, masterTestId: m2.id } },
    });
    assert(Number(savedTest2?.sellingPrice) === 599, `Test 2 selling price saved correctly: ₹${savedTest2?.sellingPrice}`);

    // Test updating an existing price
    const updateResult = await executeCatalogueImport(testLabId, [
      {
        masterTestId: m1.id,
        sellingPrice: 349, // Updated from 299 to 349
        mrpPrice: 450,
        isHomeCollectionAvailable: true,
        isActive: true,
        action: "UPDATE",
      },
    ]);
    assert(updateResult.updatedCount === 1, "Existing LabTest updated successfully");
    const updatedTest1 = await prisma.labTest.findUnique({
      where: { labId_masterTestId: { labId: testLabId, masterTestId: m1.id } },
    });
    assert(Number(updatedTest1?.sellingPrice) === 349, `Updated price persisted: ₹${updatedTest1?.sellingPrice}`);

    // Verify TestMaster count did NOT change
    const masterCountAfter = await prisma.testMaster.count();
    assert(
      masterCountBefore === masterCountAfter,
      `Central TestMaster table remained unmodified (${masterCountBefore} == ${masterCountAfter})`
    );

    // Verify Audit Log was recorded
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        labId: testLabId,
        entityType: "LabCatalogueImport",
      },
      orderBy: { createdAt: "desc" },
    });
    assert(Boolean(auditRecord), "Audit log recorded for catalogue import");

    console.log(`\n=================================================`);
    console.log(`ALL VERIFICATION TESTS COMPLETED: ${passedTests} / ${totalTests} PASSED`);
    console.log(`=================================================`);
  } catch (err: any) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
