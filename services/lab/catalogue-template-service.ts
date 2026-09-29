import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";

/**
 * Standard column headers for the Gyrex Labs test price template.
 * Derived directly from existing TestMaster and LabTest models.
 * Note: CGHS Price is not supported in the existing schema and is deferred.
 */
export const TEMPLATE_COLUMNS = [
  "Test Code",
  "Test Name",
  "Category",
  "Sample Type",
  "MRP",
  "Selling Price",
  "Home Collection",
  "Active",
] as const;

/**
 * Generates the official Gyrex Labs Excel template (XLSX).
 * Contains:
 * - 'Instructions' sheet detailing format requirements.
 * - 'Tests' sheet with standard active tests from Gyrex Test Master.
 */
export async function generateExcelTemplate(): Promise<Buffer> {
  const masters = await prisma.testMaster.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }],
  });

  const instructionsData = [
    ["GYREX LABS — LABORATORY TEST CATALOGUE & PRICING TEMPLATE"],
    ["Version: 1.0 (Phase 3A)"],
    [],
    ["HOW TO USE THIS TEMPLATE:"],
    ["1. Do not alter or rename the column headers in the 'Tests' sheet."],
    ["2. Each row represents a single diagnostic test."],
    ["3. 'Selling Price' is mandatory for every test you wish to list."],
    ["4. Prices must be numeric values only (e.g. 350 or 350.00). Do NOT include currency symbols like '₹' or 'INR'."],
    ["5. 'MRP' is optional. If provided, MRP should be greater than or equal to Selling Price."],
    ["6. 'Home Collection' should be 'Yes' or 'No' (defaults to 'Yes')."],
    ["7. 'Active' should be 'Yes' or 'No' (defaults to 'Yes')."],
    ["8. Standard tests are pre-filled below. Simply enter your laboratory's Selling Price."],
    ["9. You may add custom tests at the bottom of the list."],
    ["10. Save the file and upload it on your Gyrex Labs onboarding portal."],
    [],
    ["COLUMN DEFINITIONS:"],
    ["Test Code", "Standard laboratory test identifier (e.g. CBC, LFT, TSH)."],
    ["Test Name", "Official name of the diagnostic investigation."],
    ["Category", "Clinical diagnostic category (e.g. Hematology, Biochemistry)."],
    ["Sample Type", "Specimen required for testing (e.g. EDTA Whole Blood, Serum)."],
    ["MRP", "Maximum retail price shown to patients (optional)."],
    ["Selling Price", "Mandatory actual price charged to patients at checkout."],
    ["Home Collection", "Whether sample can be drawn at patient's residence (Yes/No)."],
    ["Active", "Whether this test is currently bookable in your store (Yes/No)."],
  ];

  const testsRows: (string | number)[][] = [
    [...TEMPLATE_COLUMNS],
  ];

  // Pre-fill standard tests from master catalogue
  for (const m of masters) {
    testsRows.push([
      m.code,
      m.name,
      m.category.name,
      m.sampleType,
      "", // MRP left blank for lab owner to set
      "", // Selling Price left blank for lab owner to set
      "Yes",
      "Yes",
    ]);
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  // Set column widths for Instructions
  wsInstructions["!cols"] = [{ wch: 24 }, { wch: 70 }];

  const wsTests = XLSX.utils.aoa_to_sheet(testsRows);
  // Set column widths for Tests
  wsTests["!cols"] = [
    { wch: 14 }, // Test Code
    { wch: 38 }, // Test Name
    { wch: 24 }, // Category
    { wch: 28 }, // Sample Type
    { wch: 12 }, // MRP
    { wch: 16 }, // Selling Price
    { wch: 18 }, // Home Collection
    { wch: 10 }, // Active
  ];

  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
  XLSX.utils.book_append_sheet(wb, wsTests, "Tests");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}

/**
 * Generates the official Gyrex Labs CSV template.
 * UTF-8 encoded with standard header and representative sample tests.
 */
export async function generateCsvTemplate(): Promise<string> {
  const masters = await prisma.testMaster.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }],
    take: 15,
  });

  const lines: string[] = [
    TEMPLATE_COLUMNS.join(","),
  ];

  for (const m of masters) {
    const escapedName = m.name.includes(",") ? `"${m.name}"` : m.name;
    const escapedCategory = m.category.name.includes(",") ? `"${m.category.name}"` : m.category.name;
    const escapedSample = m.sampleType.includes(",") ? `"${m.sampleType}"` : m.sampleType;

    lines.push(
      `${m.code},${escapedName},${escapedCategory},${escapedSample},,,Yes,Yes`
    );
  }

  return lines.join("\r\n");
}
