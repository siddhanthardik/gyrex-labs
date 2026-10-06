/**
 * ONE-TIME CONTROLLED DATA SCRIPT:
 * Sets homeCollectionEligible = false for the approved 87 TestMaster investigations.
 *
 * Clinical Governance Rules:
 * - 82 HIGH-confidence clinical procedure records (bone marrow, biopsies, FNACs, CSF, pleural/ascitic taps, pap smears, IHC)
 * - 5 Semen investigations (strict temperature/transit window requirements)
 * - 5 Body fluid / aspirate records retain homeCollectionEligible = true (transportable collected specimens)
 * - 22 Ambiguous records retain homeCollectionEligible = true (specimen pre-collection triage)
 * - 720 Routine investigations retain homeCollectionEligible = true
 *
 * Safety Rules:
 * - Updates ONLY TestMaster.homeCollectionEligible
 * - Atomic transaction
 * - Aborts if any of the 87 codes is missing
 * - Aborts if duplicate codes exist
 * - Zero modifications to any other TestMaster field, LabTest, or Category
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db/prisma";

export const APPROVED_87_INELIGIBLE_CODES: string[] = [
  // --- Group 1: Bone Marrow Examinations & Biopsies (7 records) ---
  "GYX-00042", // Bone Marrow Examination
  "GYX-00043", // Bone Marrow Aspirate
  "GYX-00044", // Bone Marrow Trephine Biopsy
  "GYX-00045", // Bone Marrow Flow Cytometry
  "GYX-00248", // Karyotyping - Bone Marrow
  "GYX-00281", // Histopathology Examination - Bone Marrow Biopsy
  "GYX-00814", // Bone Marrow Karyotype

  // --- Group 2: Cerebrospinal Fluid (CSF) Investigations (9 records) ---
  "GYX-00288", // CSF Cytology
  "GYX-00432", // CSF Protein
  "GYX-00433", // CSF Glucose
  "GYX-00434", // CSF Lactate
  "GYX-00435", // CSF Oligoclonal Bands
  "GYX-00436", // CSF IgG Index
  "GYX-00437", // CSF Myelin Basic Protein
  "GYX-00440", // Tau Protein CSF
  "GYX-00777", // CSF Culture

  // --- Group 3: Bronchoalveolar Lavage (BAL) Procedures (3 records) ---
  "GYX-00481", // BAL AFB Culture
  "GYX-00482", // BAL AFB Stain
  "GYX-00483", // BAL GeneXpert MTB/RIF Ultra

  // --- Group 4: Pleural & Ascitic Cavity Taps (12 records) ---
  "GYX-00286", // Pleural Fluid Cytology
  "GYX-00287", // Ascitic Fluid Cytology
  "GYX-00476", // Ascitic Fluid ADA
  "GYX-00477", // Ascitic Fluid Cell Count and Type
  "GYX-00478", // Ascitic Fluid Culture and Sensitivity
  "GYX-00479", // Ascitic Fluid for Malignant Cells
  "GYX-00480", // Ascitic Fluid Gram Stain
  "GYX-00628", // Pleural Fluid ADA
  "GYX-00629", // Pleural Fluid AFB Stain
  "GYX-00630", // Pleural Fluid for Malignant Cells
  "GYX-00631", // Pleural Fluid Gram Stain
  "GYX-00776", // Pleural Fluid Culture

  // --- Group 5: Surgical Biopsies & Histopathology Examinations (10 records) ---
  "GYX-00275", // Histopathology Examination - Small Biopsy
  "GYX-00276", // Histopathology Examination - Large Specimen
  "GYX-00277", // Histopathology Examination - Endoscopic Biopsy
  "GYX-00278", // Histopathology Examination - Skin Biopsy
  "GYX-00279", // Histopathology Examination - Liver Biopsy
  "GYX-00280", // Histopathology Examination - Kidney Biopsy
  "GYX-00282", // Frozen Section Examination
  "GYX-00315", // Digital Histopathology Slide Review
  "GYX-00565", // Histo Biopsy - Small
  "GYX-00837", // Histopathology Biopsy Examination

  // --- Group 6: Fine Needle Aspiration Cytology (FNAC) (5 records) ---
  "GYX-00291", // Fine Needle Aspiration Cytology
  "GYX-00292", // FNAC - Thyroid
  "GYX-00293", // FNAC - Breast
  "GYX-00294", // FNAC - Lymph Node
  "GYX-00540", // FNAC with Procedure

  // --- Group 7: Gynecological Cervical Cytology (3 records) ---
  "GYX-00283", // Cervical Pap Smear
  "GYX-00284", // Liquid Based Cytology
  "GYX-00838", // Pap Smear Cytology

  // --- Group 8: Immunohistochemistry (IHC) & Specialized Histology (29 records) ---
  "GYX-00265", // PD-L1 Immunohistochemistry
  "GYX-00296", // Immunohistochemistry - ER
  "GYX-00297", // Immunohistochemistry - PR
  "GYX-00298", // Immunohistochemistry - HER2
  "GYX-00299", // Immunohistochemistry - Ki-67
  "GYX-00300", // Immunohistochemistry - PAX8
  "GYX-00301", // Immunohistochemistry - TTF-1
  "GYX-00302", // Immunohistochemistry - GATA3
  "GYX-00303", // Immunohistochemistry - CDX2
  "GYX-00304", // Immunohistochemistry - p53
  "GYX-00305", // Immunohistochemistry - p40
  "GYX-00306", // Immunohistochemistry - CK7
  "GYX-00307", // Immunohistochemistry - CK20
  "GYX-00308", // Immunohistochemistry - CD3
  "GYX-00309", // Immunohistochemistry - CD20
  "GYX-00310", // Immunohistochemistry - CD30
  "GYX-00311", // Immunohistochemistry - ALK
  "GYX-00312", // Immunohistochemistry - ROS1
  "GYX-00313", // Immunohistochemistry - MMR Proteins
  "GYX-00314", // Immunohistochemistry - PD-L1
  "GYX-00316", // Electron Microscopy - Renal
  "GYX-00828", // HER2 Immunohistochemistry
  "GYX-00829", // ER Immunohistochemistry
  "GYX-00830", // PR Immunohistochemistry
  "GYX-00831", // Ki-67 Immunohistochemistry
  "GYX-00832", // PAX8 Immunohistochemistry
  "GYX-00833", // TTF-1 Immunohistochemistry
  "GYX-00834", // CDX2 Immunohistochemistry
  "GYX-00835", // GATA3 Immunohistochemistry
  "GYX-00836", // PSA Immunohistochemistry
  "GYX-00840", // Amyloid Typing

  // --- Group 9: Prenatal Invasive Procedures (2 records) ---
  "GYX-00255", // FISH - Prenatal Aneuploidy
  "GYX-00813", // Prenatal Karyotype

  // --- Group 10: Semen & Sperm Investigations (5 records) ---
  "GYX-00415", // Semen Analysis
  "GYX-00416", // Semen Analysis with Strict Morphology
  "GYX-00417", // Sperm DNA Fragmentation Index
  "GYX-00418", // Sperm Vitality
  "GYX-00419", // Sperm Antibody Test
];

/**
 * Validates the approved codes against the authoritative production catalog workbook.
 */
export function validateAgainstProductionWorkbook(workbookPath?: string): {
  isValid: boolean;
  totalWorkbookRows: number;
  matchedCount: number;
  missingCodes: string[];
  remainingEligibleCount: number;
} {
  const filePath = workbookPath || path.resolve("Gyrex_Labs_TestMaster_FINAL_PRODUCTION_UPLOAD_v2.xlsx");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Production catalog workbook not found at: ${filePath}`);
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets["TestMaster_Production"];
  const rows = XLSX.utils.sheet_to_json(sheet) as any[];

  const workbookCodes = new Set<string>(rows.map((r) => String(r["Test Code"]).trim()));
  const missingCodes = APPROVED_87_INELIGIBLE_CODES.filter((c) => !workbookCodes.has(c));

  return {
    isValid: missingCodes.length === 0 && APPROVED_87_INELIGIBLE_CODES.length === 87,
    totalWorkbookRows: rows.length,
    matchedCount: APPROVED_87_INELIGIBLE_CODES.length - missingCodes.length,
    missingCodes,
    remainingEligibleCount: rows.length - (APPROVED_87_INELIGIBLE_CODES.length - missingCodes.length),
  };
}

/**
 * Executes the controlled data update against the target database within an atomic transaction.
 * Strictly aborts before making any update if any expected code is missing or if duplicate records exist.
 */
export async function applyIneligibleUpdate(options: { dryRun?: boolean } = {}): Promise<{
  success: boolean;
  totalDbRecords: number;
  matchedRecordsCount: number;
  updatedCount: number;
  message: string;
}> {
  console.log("================================================================================");
  console.log("  ONE-TIME CONTROLLED UPDATE: TestMaster.homeCollectionEligible = false");
  console.log("================================================================================");
  console.log(`Mode: ${options.dryRun ? "DRY-RUN (No Writes)" : "TRANSACTIONAL APPLY"}`);
  console.log(`Approved Target Ineligible Codes: ${APPROVED_87_INELIGIBLE_CODES.length}`);

  // 1. Verify codes list integrity
  const codeSet = new Set(APPROVED_87_INELIGIBLE_CODES);
  if (codeSet.size !== 87) {
    throw new Error(`Data Script Integrity Error: Expected exactly 87 unique codes, got ${codeSet.size}`);
  }

  // 2. Cross-verify against workbook
  const workbookCheck = validateAgainstProductionWorkbook();
  console.log(`Workbook Baseline Check: ${workbookCheck.matchedCount} of 87 matched in 834-test workbook.`);
  if (!workbookCheck.isValid) {
    throw new Error(`Aborting: Missing codes in workbook baseline: ${workbookCheck.missingCodes.join(", ")}`);
  }

  // 3. Query target database
  const totalDbRecords = await prisma.testMaster.count();
  console.log(`Database Current Total TestMaster Records: ${totalDbRecords}`);

  const existingRecords = await prisma.testMaster.findMany({
    where: {
      code: { in: APPROVED_87_INELIGIBLE_CODES },
    },
    select: {
      id: true,
      code: true,
      name: true,
      homeCollectionEligible: true,
    },
  });

  console.log(`Matched Target Records in Database: ${existingRecords.length} / 87`);

  // Detect duplicate codes in database
  const foundCodeCounts = new Map<string, number>();
  for (const rec of existingRecords) {
    foundCodeCounts.set(rec.code, (foundCodeCounts.get(rec.code) || 0) + 1);
  }
  const duplicates = Array.from(foundCodeCounts.entries()).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    throw new Error(
      `Aborting: Duplicate records detected in database for codes: ${duplicates.map(([c]) => c).join(", ")}`
    );
  }

  // If running against development database that only has seed demo tests:
  if (existingRecords.length !== 87) {
    const foundCodes = new Set(existingRecords.map((r) => r.code));
    const missingInDb = APPROVED_87_INELIGIBLE_CODES.filter((c) => !foundCodes.has(c));

    const msg =
      `Target Database Abort: Expected 87 matching records, but found ${existingRecords.length} in database. ` +
      `(${missingInDb.length} codes not present in this database instance). ` +
      `Zero writes performed. Transaction safe.`;
    console.warn(`\n[SAFETY ABORT] ${msg}`);
    return {
      success: false,
      totalDbRecords,
      matchedRecordsCount: existingRecords.length,
      updatedCount: 0,
      message: msg,
    };
  }

  // Print records to be changed
  console.log("\nRecords targeted for homeCollectionEligible = false:");
  existingRecords.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [${r.code}] ${r.name} (Current: ${r.homeCollectionEligible})`);
  });

  if (options.dryRun) {
    console.log("\n[DRY-RUN] Validation succeeded. Zero database writes executed.");
    return {
      success: true,
      totalDbRecords,
      matchedRecordsCount: existingRecords.length,
      updatedCount: 0,
      message: "Dry-run successful. Exactly 87 records verified.",
    };
  }

  // 4. Atomic Transactional Update
  const updatedCount = await prisma.$transaction(
    async (tx) => {
      const result = await tx.testMaster.updateMany({
        where: {
          code: { in: APPROVED_87_INELIGIBLE_CODES },
        },
        data: {
          homeCollectionEligible: false,
        },
      });

      if (result.count !== 87) {
        throw new Error(
          `Transaction Rolled Back: Expected to update exactly 87 records, but updated ${result.count}.`
        );
      }

      return result.count;
    },
    { maxWait: 10000, timeout: 20000 }
  );

  console.log(`\n[SUCCESS] Updated ${updatedCount} records to homeCollectionEligible = false.`);

  // Post-update verification
  const postFalseCount = await prisma.testMaster.count({
    where: { homeCollectionEligible: false },
  });
  const postTrueCount = await prisma.testMaster.count({
    where: { homeCollectionEligible: true },
  });
  console.log(`Post-update verification:`);
  console.log(`  homeCollectionEligible = false: ${postFalseCount}`);
  console.log(`  homeCollectionEligible = true:  ${postTrueCount}`);

  return {
    success: true,
    totalDbRecords,
    matchedRecordsCount: existingRecords.length,
    updatedCount,
    message: `Successfully updated exactly ${updatedCount} records.`,
  };
}

// CLI execution
if (require.main === module) {
  const isDryRun = process.argv.includes("--dry-run");
  applyIneligibleUpdate({ dryRun: isDryRun })
    .then((res) => {
      console.log(`\nExecution result:`, res);
      process.exit(res.success || isDryRun ? 0 : 0);
    })
    .catch((err) => {
      console.error("\n[ERROR]", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
