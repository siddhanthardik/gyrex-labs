import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction } from "@prisma/client";
import { SessionUser } from "@/lib/auth/session";

export interface TestMasterRowIssue {
  type: "ERROR" | "WARNING";
  field: string;
  message: string;
}

export type TestMasterRowStatus = "NEW" | "EXISTING_SKIP" | "ERROR";

export interface AnalyzedTestMasterRow {
  rowNumber: number;
  status: TestMasterRowStatus;
  code: string;
  name: string;
  categoryName: string;
  categoryId: string | null;
  sampleType: string;
  standardTatHours: number;
  fastingRequired: boolean;
  preparationInstructions: string | null;
  synonyms: string[];
  standardizedCode: string | null;
  description: string | null;
  isActive: boolean;
  matchedExistingId?: string;
  issues: TestMasterRowIssue[];
}

export interface TestMasterImportAnalysis {
  batchId: string;
  filename: string;
  totalRows: number;
  validRows: number; // rows that can be created as new
  newRecordsCount: number;
  existingCount: number;
  duplicateCount: number;
  errorCount: number;
  hasBlockingErrors: boolean;
  items: AnalyzedTestMasterRow[];
}

export interface TestMasterImportResult {
  success: boolean;
  batchId: string;
  filename: string;
  totalProcessed: number;
  createdCount: number;
  skippedCount: number;
  rejectedCount: number;
  createdIds: string[];
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROW_LIMIT = 5000;

/**
 * Defense against CSV / Spreadsheet formula injection.
 * Strips or prefixes leading characters '=', '+', '-', '@', '\t', '\r'.
 */
export function sanitizeFormulaString(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  // Strip control characters
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  if (/^[=\+\-@\t\r]/.test(str)) {
    // Prefix with single quote so spreadsheet engines treat it as plain text
    str = `'${str}`;
  }
  return str;
}

/**
 * Normalizes header keys to standard internal field names.
 * Explicitly ignores and drops price/cost/mrp columns.
 */
function normalizeHeaderKey(header: string): string | null {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Explicitly ignore any price/rate/mrp/cost columns (TestMaster must NEVER contain price)
  if (
    clean.includes("price") ||
    clean.includes("mrp") ||
    clean.includes("cost") ||
    clean.includes("rate") ||
    clean.includes("fee") ||
    clean.includes("charge")
  ) {
    return null;
  }

  if (clean === "code" || clean.includes("testcode") || clean.includes("itemcode")) return "code";
  if (clean === "name" || clean.includes("testname") || clean.includes("investigation")) return "name";
  if (clean.includes("cat") || clean.includes("department") || clean.includes("dept")) return "category";
  if (clean.includes("sample") || clean.includes("specimen") || clean.includes("sampletype")) return "sampleType";
  if (clean.includes("tat") || clean.includes("hours") || clean.includes("turnaround")) return "standardTatHours";
  if (clean.includes("fasting")) return "fastingRequired";
  if (clean.includes("prep") || clean.includes("instruction")) return "preparationInstructions";
  if (clean.includes("synonym") || clean.includes("alias")) return "synonyms";
  if (clean.includes("loinc") || clean.includes("standardized") || clean.includes("cpt")) return "standardizedCode";
  if (clean.includes("desc")) return "description";
  if (clean.includes("active") || clean.includes("status")) return "isActive";

  return clean;
}

/**
 * Flexible boolean parsing.
 */
function parseBooleanFlexible(value: unknown, defaultValue: boolean = false): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  const str = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1", "mandatory", "required"].includes(str)) return true;
  if (["no", "n", "false", "0", "optional", "not required"].includes(str)) return false;
  return defaultValue;
}

/**
 * Approved controlled aliases for TestMaster category values.
 * Maps various department spellings, organ panels, and clinical subspecialties
 * to canonical active TestCategory names in the database.
 */
export const APPROVED_CATEGORY_ALIASES: Record<string, string> = {
  // Hematology
  "hematology & coagulation": "Hematology",
  "haematology & coagulation": "Hematology",
  "coagulation": "Hematology",
  "immunohematology": "Hematology",

  // Serology & Immunology
  "immunology & serology": "Serology & Immunology",
  "immunology": "Serology & Immunology",
  "immunology & autoimmune": "Serology & Immunology",
  "allergy": "Serology & Immunology",
  "allergy & immunoassays": "Serology & Immunology",
  "specialized immunology & transplant": "Serology & Immunology",

  // Biochemistry
  "clinical biochemistry & metabolic": "Biochemistry",
  "kidney": "Biochemistry",
  "liver": "Biochemistry",
  "nutritional & micronutrients": "Biochemistry",
  "diabetes": "Biochemistry",
  "lipids & cardiac": "Biochemistry",
  "gastroenterology": "Biochemistry",
  "neurology & specialized protein diagnostics": "Biochemistry",

  // Molecular Diagnostics & Genetics
  "molecular diagnostics": "Molecular Diagnostics & Genetics",
  "molecular diagnostics & genetics": "Molecular Diagnostics & Genetics",
  "rare disease & specialized genetics": "Molecular Diagnostics & Genetics",
  "cytogenetics": "Molecular Diagnostics & Genetics",

  // Microbiology & Infectious Diseases
  "microbiology & infectious disease serology": "Microbiology & Infectious Diseases",
  "microbiology": "Microbiology & Infectious Diseases",
  "infectious disease": "Microbiology & Infectious Diseases",
  "tuberculosis & mycobacteriology": "Microbiology & Infectious Diseases",

  // Histopathology & Cytopathology
  "histopathology": "Histopathology & Cytopathology",
  "histopathology & cytology": "Histopathology & Cytopathology",
  "cytopathology": "Histopathology & Cytopathology",

  // Oncology & Precision Medicine
  "oncology & precision medicine": "Oncology & Precision Medicine",
  "oncology": "Oncology & Precision Medicine",
  "oncology & precision diagnostics": "Oncology & Precision Medicine",

  // Toxicology & Therapeutic Drug Monitoring
  "specialized toxicology & therapeutic drug monitoring": "Toxicology & Therapeutic Drug Monitoring",
  "toxicology & therapeutic drug monitoring": "Toxicology & Therapeutic Drug Monitoring",
  "therapeutic drug monitoring": "Toxicology & Therapeutic Drug Monitoring",

  // Reproductive & Prenatal Diagnostics
  "fertility & reproductive": "Reproductive & Prenatal Diagnostics",
  "prenatal screening": "Reproductive & Prenatal Diagnostics",
  "reproductive & prenatal diagnostics": "Reproductive & Prenatal Diagnostics",

  // Histocompatibility & Immunogenetics
  "histocompatibility & immunogenetics": "Histocompatibility & Immunogenetics",
  "transplant immunology & hla": "Histocompatibility & Immunogenetics",

  // Canonical Identity Mappings (Self-mapping for consistency)
  "endocrinology": "Endocrinology",
  "biochemistry": "Biochemistry",
  "clinical pathology": "Clinical Pathology",
  "serology & immunology": "Serology & Immunology",
  "hematology": "Hematology",
  "general": "General",
};

/**
 * Test-specific canonical category overrides for investigations appearing in mixed/methodology categories.
 * Ensures tests are classified according to the clinical investigation/discipline represented rather than solely laboratory method.
 */
export const TEST_SPECIFIC_CATEGORY_OVERRIDES: Record<string, string> = {
  // Transplant Histocompatibility Crossmatching (method was Flow Cytometry)
  "gyx-00400": "Histocompatibility & Immunogenetics",
  "crossmatch - flow cytometry": "Histocompatibility & Immunogenetics",

  // Bone Marrow & MRD Immunophenotyping (Hematology)
  "gyx-00045": "Hematology",
  "bone marrow flow cytometry": "Hematology",
  "gyx-00047": "Hematology",
  "minimal residual disease flow cytometry": "Hematology",
  "gyx-00365": "Hematology",
  "mrd by flow cytometry": "Hematology",

  // Coagulation Factor & Platelet Antibody tests (Hematology)
  "gyx-00508": "Hematology",
  "adamts13 activity": "Hematology",
  "gyx-00595": "Hematology",
  "factor vii functional": "Hematology",
  "gyx-00596": "Hematology",
  "factor xiii clot solubility": "Hematology",
  "gyx-00700": "Hematology",
  "platelet antibodies": "Hematology",

  // Molecular Genetics & Cytogenetic FISH panels (Molecular Diagnostics & Genetics)
  "gyx-00510": "Molecular Diagnostics & Genetics",
  "alk fusion fish": "Molecular Diagnostics & Genetics",
  "gyx-00515": "Molecular Diagnostics & Genetics",
  "alpha thalassemia mutation analysis": "Molecular Diagnostics & Genetics",
  "gyx-00544": "Molecular Diagnostics & Genetics",
  "beta thalassemia gene mutation analysis": "Molecular Diagnostics & Genetics",
  "gyx-00686": "Molecular Diagnostics & Genetics",
  "multiple myeloma markers fish": "Molecular Diagnostics & Genetics",
};

export interface ClinicalReviewCategoryDefinition {
  proposedCanonical: string;
  reason: string;
}

/**
 * Categories that require explicit clinical review rather than silent automatic forcing.
 */
export const CLINICAL_REVIEW_CATEGORIES: Record<string, ClinicalReviewCategoryDefinition> = {
  "flow cytometry": {
    proposedCanonical: "Hematology",
    reason: "Flow cytometry investigations in this seed (MRD, bone marrow) are predominantly hematologic neoplasm panels.",
  },
  "histocompatibility & immunogenetics": {
    proposedCanonical: "Histocompatibility & Immunogenetics",
    reason: "HLA allele typing and transplant immunogenetics are dedicated histocompatibility disciplines.",
  },
  "transplant immunology & hla": {
    proposedCanonical: "Histocompatibility & Immunogenetics",
    reason: "Crossmatch, calculated PRA, and lymphocyte cytotoxicity assays are transplant histocompatibility investigations.",
  },
  "hematologic malignancy & cytogenetics": {
    proposedCanonical: "Molecular Diagnostics & Genetics",
    reason: "Cytogenetic FISH and hemoglobinopathy gene mutation analyses are molecular genetics assays.",
  },
};

/**
 * Resolves a raw uploaded category string to a canonical TestCategory record in the database.
 * Supports test-specific overrides, exact canonical names/slugs, approved aliases, and clinical review mappings.
 */
export function resolveCategory(
  rawCategoryInput: string,
  categoryMapByName: Map<string, string>,
  categoryMapBySlug: Map<string, string>,
  categoryDisplayNames: Map<string, string>,
  testCode?: string,
  testName?: string
): {
  categoryId: string | null;
  canonicalCategoryName: string;
  source: "EXACT_NAME" | "EXACT_SLUG" | "APPROVED_ALIAS" | "TEST_OVERRIDE" | "CLINICAL_REVIEW" | "UNRESOLVED";
  reviewNotice?: ClinicalReviewCategoryDefinition;
} {
  // 1. Check test-specific override first if code or name matches
  if (testCode) {
    const overrideByCode = TEST_SPECIFIC_CATEGORY_OVERRIDES[testCode.trim().toLowerCase()];
    if (overrideByCode) {
      const catId = categoryMapByName.get(overrideByCode.trim().toLowerCase());
      if (catId) {
        return {
          categoryId: catId,
          canonicalCategoryName: categoryDisplayNames.get(catId) || overrideByCode,
          source: "TEST_OVERRIDE",
        };
      }
    }
  }

  if (testName) {
    const overrideByName = TEST_SPECIFIC_CATEGORY_OVERRIDES[testName.trim().toLowerCase()];
    if (overrideByName) {
      const catId = categoryMapByName.get(overrideByName.trim().toLowerCase());
      if (catId) {
        return {
          categoryId: catId,
          canonicalCategoryName: categoryDisplayNames.get(catId) || overrideByName,
          source: "TEST_OVERRIDE",
        };
      }
    }
  }

  const normalized = rawCategoryInput.trim().toLowerCase();

  // 2. Direct name match in DB
  const directIdByName = categoryMapByName.get(normalized);
  if (directIdByName) {
    return {
      categoryId: directIdByName,
      canonicalCategoryName: categoryDisplayNames.get(directIdByName) || rawCategoryInput,
      source: "EXACT_NAME",
    };
  }

  // 3. Direct slug match in DB
  const directIdBySlug = categoryMapBySlug.get(normalized);
  if (directIdBySlug) {
    return {
      categoryId: directIdBySlug,
      canonicalCategoryName: categoryDisplayNames.get(directIdBySlug) || rawCategoryInput,
      source: "EXACT_SLUG",
    };
  }

  // 4. Approved alias mapping
  const mappedCanonical = APPROVED_CATEGORY_ALIASES[normalized];
  if (mappedCanonical) {
    const aliasCatId = categoryMapByName.get(mappedCanonical.trim().toLowerCase());
    if (aliasCatId) {
      return {
        categoryId: aliasCatId,
        canonicalCategoryName: categoryDisplayNames.get(aliasCatId) || mappedCanonical,
        source: "APPROVED_ALIAS",
      };
    }
  }

  // 5. Clinical review mapping
  const reviewDef = CLINICAL_REVIEW_CATEGORIES[normalized];
  if (reviewDef) {
    const reviewCatId = categoryMapByName.get(reviewDef.proposedCanonical.trim().toLowerCase());
    if (reviewCatId) {
      return {
        categoryId: reviewCatId,
        canonicalCategoryName: categoryDisplayNames.get(reviewCatId) || reviewDef.proposedCanonical,
        source: "CLINICAL_REVIEW",
        reviewNotice: reviewDef,
      };
    }
  }

  // 6. Unresolved
  return {
    categoryId: null,
    canonicalCategoryName: rawCategoryInput,
    source: "UNRESOLVED",
  };
}
export async function generateTestMasterTemplate(format: "xlsx" | "csv" = "xlsx"): Promise<{
  data: Buffer;
  contentType: string;
  filename: string;
}> {
  // Fetch existing categories to populate sample data realistically
  const existingCategories = await prisma.testCategory.findMany({
    orderBy: { displayOrder: "asc" },
    select: { name: true },
    take: 5,
  });

  const cat1 = existingCategories[0]?.name || "Hematology";
  const cat2 = existingCategories[1]?.name || "Biochemistry";
  const cat3 = existingCategories[2]?.name || "Endocrinology";

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

  const sampleRows = [
    [
      "CBC",
      "Complete Blood Count",
      cat1,
      "EDTA Whole Blood",
      24,
      "No",
      "No special preparation required. Routine venipuncture.",
      "Hemogram, Complete Blood Profile, CBC with ESR",
      "58410-2",
      "Quantitative evaluation of blood cellular elements including RBC, WBC, platelets, and hemoglobin.",
      "Yes",
    ],
    [
      "LIPID",
      "Lipid Profile Extended",
      cat2,
      "Serum",
      12,
      "Yes",
      "10-12 hours overnight fasting mandatory. Water intake permitted.",
      "Cholesterol Profile, Lipid Panel",
      "24331-1",
      "Comprehensive assessment of cardiovascular risk: Total Cholesterol, HDL, LDL, VLDL, and Triglycerides.",
      "Yes",
    ],
    [
      "TSH",
      "Thyroid Stimulating Hormone (Ultrasensitive)",
      cat3,
      "Serum",
      24,
      "No",
      "Morning sample preferred. Record any thyroid hormone replacement medications.",
      "Thyrotropin, Ultrasensitive TSH",
      "3016-3",
      "Primary screening test for thyroid disease and anterior pituitary gland function.",
      "Yes",
    ],
  ];

  if (format === "csv") {
    const csvLines = [headers.join(",")];
    for (const row of sampleRows) {
      const escapedRow = row.map((val) => {
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(escapedRow.join(","));
    }
    const csvContent = csvLines.join("\r\n");
    return {
      data: Buffer.from(csvContent, "utf-8"),
      contentType: "text/csv; charset=utf-8",
      filename: "Gyrex_Test_Master_Template.csv",
    };
  }

  // Excel workbook
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column width hints
  ws["!cols"] = [
    { wch: 14 }, // Code
    { wch: 32 }, // Name
    { wch: 20 }, // Category
    { wch: 20 }, // Sample Type
    { wch: 22 }, // Standard TAT
    { wch: 18 }, // Fasting
    { wch: 45 }, // Prep
    { wch: 38 }, // Synonyms
    { wch: 25 }, // LOINC
    { wch: 55 }, // Description
    { wch: 10 }, // Active
  ];

  XLSX.utils.book_append_sheet(wb, ws, "TestMaster_Import");
  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return {
    data: xlsxBuffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "Gyrex_Test_Master_Template.xlsx",
  };
}

/**
 * Parses and analyzes a spreadsheet buffer against database rules without writing anything.
 */
export async function analyzeTestMasterSpreadsheet(
  buffer: Buffer,
  filename: string
): Promise<TestMasterImportAnalysis> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds 10 MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`
    );
  }

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("The uploaded spreadsheet contains no readable sheets.");
  }

  const targetSheetName =
    workbook.SheetNames.find((s) => s.toLowerCase().includes("test")) ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) {
    throw new Error(`Could not access sheet '${targetSheetName}'.`);
  }

  const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!aoa || aoa.length === 0) {
    throw new Error("Spreadsheet is completely empty.");
  }

  // Detect header row in first 10 rows
  let headerRowIndex = -1;
  const headerMap: Record<number, string> = {};

  for (let r = 0; r < Math.min(10, aoa.length); r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;

    const codeFound = row.some((c) => String(c).toLowerCase().includes("code"));
    const nameFound = row.some((c) => String(c).toLowerCase().includes("name"));

    if (codeFound && nameFound) {
      headerRowIndex = r;
      row.forEach((cellVal, colIdx) => {
        const normalized = normalizeHeaderKey(String(cellVal || ""));
        if (normalized) {
          headerMap[colIdx] = normalized;
        }
      });
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "Could not detect valid table headers. Please ensure the file has 'Test Code' and 'Test Name' headers matching the official Gyrex template."
    );
  }

  // Check required columns mapped
  const mappedCols = Object.values(headerMap);
  if (!mappedCols.includes("code") || !mappedCols.includes("name")) {
    throw new Error("Missing mandatory column: 'Test Code' and 'Test Name' must both be present.");
  }

  // Pre-fetch all categories from database
  const categories = await prisma.testCategory.findMany();
  const categoryMapByName = new Map<string, string>(); // lowerName -> id
  const categoryMapBySlug = new Map<string, string>(); // lowerSlug -> id
  const categoryDisplayNames = new Map<string, string>(); // id -> proper name

  for (const cat of categories) {
    categoryMapByName.set(cat.name.trim().toLowerCase(), cat.id);
    categoryMapBySlug.set(cat.slug.trim().toLowerCase(), cat.id);
    categoryDisplayNames.set(cat.id, cat.name);
  }

  // Pre-fetch all existing TestMaster records for fast code & name lookup
  const existingMasters = await prisma.testMaster.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
    },
  });

  const existingCodesMap = new Map<string, typeof existingMasters[0]>();
  const existingNamesMap = new Map<string, typeof existingMasters[0]>();

  for (const m of existingMasters) {
    existingCodesMap.set(m.code.trim().toUpperCase(), m);
    existingNamesMap.set(m.name.trim().toLowerCase(), m);
  }

  // Tracking in-file duplicates
  const seenCodesInFile = new Map<string, number>(); // code -> first row number
  const seenNamesInFile = new Map<string, number>(); // name -> first row number

  const items: AnalyzedTestMasterRow[] = [];
  let validRows = 0;
  let existingCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (let r = headerRowIndex + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!Array.isArray(row) || row.every((c) => String(c).trim() === "")) {
      continue; // skip blank rows
    }

    const rowObj: Record<string, any> = {};
    row.forEach((cellVal, colIdx) => {
      const field = headerMap[colIdx];
      if (field) {
        rowObj[field] = cellVal;
      }
    });

    const rawCode = sanitizeFormulaString(rowObj["code"] || "");
    const rawName = sanitizeFormulaString(rowObj["name"] || "");

    // Ignore row if both code and name are completely empty
    if (!rawCode && !rawName) {
      continue;
    }

    const rowNumber = r + 1;
    const issues: TestMasterRowIssue[] = [];

    // 1. Mandatory Code validation
    if (!rawCode) {
      issues.push({
        type: "ERROR",
        field: "code",
        message: "Test Code is mandatory and cannot be blank.",
      });
    }

    // 2. Mandatory Name validation
    if (!rawName) {
      issues.push({
        type: "ERROR",
        field: "name",
        message: "Test Name is mandatory and cannot be blank.",
      });
    }

    const upperCode = rawCode.toUpperCase();
    const lowerName = rawName.toLowerCase();

    // 3. Category validation
    const rawCategory = sanitizeFormulaString(rowObj["category"] || "");
    let categoryId: string | null = null;
    let properCategoryName = rawCategory;

    if (!rawCategory) {
      issues.push({
        type: "ERROR",
        field: "category",
        message: "Category is mandatory.",
      });
    } else {
      const resolution = resolveCategory(
        rawCategory,
        categoryMapByName,
        categoryMapBySlug,
        categoryDisplayNames,
        rawCode,
        rawName
      );

      if (resolution.categoryId) {
        categoryId = resolution.categoryId;
        properCategoryName = resolution.canonicalCategoryName;

        if (resolution.source === "CLINICAL_REVIEW" && resolution.reviewNotice) {
          issues.push({
            type: "WARNING",
            field: "category",
            message: `[CLINICAL REVIEW REQUIRED] Category '${rawCategory}' resolved to proposed canonical '${resolution.canonicalCategoryName}'. Reason: ${resolution.reviewNotice.reason}`,
          });
        }
      } else {
        issues.push({
          type: "ERROR",
          field: "category",
          message: `Category '${rawCategory}' does not exist in the system and has no approved mapping. Please map or create it first.`,
        });
      }
    }

    // 4. Sample Type validation
    const sampleType = sanitizeFormulaString(rowObj["sampleType"] || "Serum") || "Serum";

    // 5. Standard TAT Hours validation
    let standardTatHours = 24;
    if (rowObj["standardTatHours"] !== undefined && rowObj["standardTatHours"] !== "") {
      const parsedTat = Number(rowObj["standardTatHours"]);
      if (isNaN(parsedTat) || !Number.isInteger(parsedTat) || parsedTat <= 0) {
        issues.push({
          type: "ERROR",
          field: "standardTatHours",
          message: "Standard TAT must be a positive whole integer number of hours (e.g. 12, 24, 48).",
        });
      } else {
        standardTatHours = parsedTat;
      }
    }

    // 6. Fasting Required
    const fastingRequired = parseBooleanFlexible(rowObj["fastingRequired"], false);

    // 7. Preparation instructions
    const prep = sanitizeFormulaString(rowObj["preparationInstructions"] || "") || null;

    // 8. Synonyms
    let synonyms: string[] = [];
    if (rowObj["synonyms"]) {
      const rawSyn = sanitizeFormulaString(rowObj["synonyms"]);
      synonyms = rawSyn
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    // 9. Standardized Code / LOINC
    const standardizedCode = sanitizeFormulaString(rowObj["standardizedCode"] || "") || null;

    // 10. Description
    const description = sanitizeFormulaString(rowObj["description"] || "") || null;

    // 11. Active
    const isActive = parseBooleanFlexible(rowObj["isActive"], true);

    // In-file duplicate checking
    let isDuplicateInFile = false;
    if (upperCode) {
      if (seenCodesInFile.has(upperCode)) {
        isDuplicateInFile = true;
        const firstRow = seenCodesInFile.get(upperCode);
        issues.push({
          type: "ERROR",
          field: "code",
          message: `Duplicate Test Code '${upperCode}' within the file (previously found on row ${firstRow}).`,
        });
      } else {
        seenCodesInFile.set(upperCode, rowNumber);
      }
    }

    if (lowerName) {
      if (seenNamesInFile.has(lowerName)) {
        isDuplicateInFile = true;
        const firstRow = seenNamesInFile.get(lowerName);
        issues.push({
          type: "ERROR",
          field: "name",
          message: `Duplicate Test Name '${rawName}' within the file (previously found on row ${firstRow}).`,
        });
      } else {
        seenNamesInFile.set(lowerName, rowNumber);
      }
    }

    // Check against existing database records
    let matchedExistingId: string | undefined = undefined;
    const existingByCode = upperCode ? existingCodesMap.get(upperCode) : null;
    const existingByName = lowerName ? existingNamesMap.get(lowerName) : null;

    if (existingByCode) {
      matchedExistingId = existingByCode.id;
    } else if (existingByName) {
      matchedExistingId = existingByName.id;
    }

    // Determine row status
    let status: TestMasterRowStatus = "NEW";
    const hasError = issues.some((iss) => iss.type === "ERROR");

    if (hasError) {
      status = "ERROR";
      errorCount++;
      if (isDuplicateInFile) {
        duplicateCount++;
      }
    } else if (matchedExistingId) {
      status = "EXISTING_SKIP";
      existingCount++;
      issues.push({
        type: "WARNING",
        field: "code",
        message: `Matches existing Test Master in database (${existingByCode ? `code: ${existingByCode.code}` : `name: ${existingByName?.name}`}). This row will be skipped to protect existing standard definitions.`,
      });
    } else {
      status = "NEW";
      validRows++;
    }

    items.push({
      rowNumber,
      status,
      code: upperCode,
      name: rawName,
      categoryName: properCategoryName,
      categoryId,
      sampleType,
      standardTatHours,
      fastingRequired,
      preparationInstructions: prep,
      synonyms,
      standardizedCode,
      description,
      isActive,
      matchedExistingId,
      issues,
    });

    if (items.length > MAX_ROW_LIMIT) {
      throw new Error(`Row limit exceeded: maximum allowed is ${MAX_ROW_LIMIT} rows per file.`);
    }
  }

  if (items.length === 0) {
    throw new Error("No data rows found in the uploaded file.");
  }

  const batchId = `tmb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    batchId,
    filename,
    totalRows: items.length,
    validRows,
    newRecordsCount: validRows,
    existingCount,
    duplicateCount,
    errorCount,
    hasBlockingErrors: errorCount > 0,
    items,
  };
}

/**
 * Commits verified new TestMaster items into the database in a safe transaction.
 * Strictly respects existing records, ignores any price columns, and records full audit log.
 */
export async function confirmTestMasterImport(
  items: AnalyzedTestMasterRow[],
  batchId: string,
  filename: string,
  actor: SessionUser
): Promise<TestMasterImportResult> {
  if (!items || items.length === 0) {
    throw new Error("No items provided for import.");
  }

  // Filter ONLY items with status NEW and no blocking errors
  const candidateItems = items.filter(
    (item) => item.status === "NEW" && !item.issues.some((iss) => iss.type === "ERROR")
  );

  if (candidateItems.length === 0) {
    return {
      success: true,
      batchId,
      filename,
      totalProcessed: items.length,
      createdCount: 0,
      skippedCount: items.length,
      rejectedCount: 0,
      createdIds: [],
    };
  }

  const createdIds: string[] = [];
  const rejectedErrors: Array<{ rowNumber: number; code: string; message: string }> = [];

  // Execute in Neon-safe transaction
  await prisma.$transaction(
    async (tx) => {
      // Re-verify against database within transaction for race safety
      const codes = candidateItems.map((c) => c.code.toUpperCase().trim());
      const existingInDb = await tx.testMaster.findMany({
        where: { code: { in: codes } },
        select: { code: true },
      });
      const dbCodesSet = new Set(existingInDb.map((e) => e.code.toUpperCase()));

      for (const item of candidateItems) {
        const upperCode = item.code.toUpperCase().trim();
        if (dbCodesSet.has(upperCode)) {
          rejectedErrors.push({
            rowNumber: item.rowNumber,
            code: upperCode,
            message: `Concurrent creation detected: code '${upperCode}' already exists in database.`,
          });
          continue;
        }

        const nameSlug = item.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const codeSlug = upperCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const uniqueSlug = `${nameSlug}-${codeSlug}-${Date.now().toString(36).slice(-4)}`;

        const created = await tx.testMaster.create({
          data: {
            code: upperCode,
            name: item.name.trim(),
            slug: uniqueSlug,
            categoryId: item.categoryId!,
            sampleType: item.sampleType || "Serum",
            standardTatHours: item.standardTatHours ?? 24,
            fastingRequired: item.fastingRequired ?? false,
            preparationInstructions: item.preparationInstructions || null,
            description: item.description || null,
            synonyms: item.synonyms || [],
            standardizedCode: item.standardizedCode || null,
            isActive: item.isActive ?? true,
          },
          select: { id: true },
        });

        createdIds.push(created.id);
        dbCodesSet.add(upperCode); // Add to set so subsequent items in same batch don't collide
      }
    },
    { maxWait: 15000, timeout: 20000 }
  );

  const skippedCount = items.length - createdIds.length;

  // Verify actor user existence to safely satisfy foreign key constraint
  let validActorUserId: string | null = null;
  if (actor?.userId) {
    const existingUser = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { id: true },
    });
    if (existingUser) {
      validActorUserId = existingUser.id;
    }
  }

  // Record Audit Log
  await recordAuditLog({
    actorUserId: validActorUserId,
    actorRole: actor?.role ?? null,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "TestMaster",
    entityId: batchId,
    metadata: {
      action: "BULK_IMPORT",
      batchId,
      filename,
      totalRows: items.length,
      createdCount: createdIds.length,
      skippedCount,
      rejectedCount: rejectedErrors.length,
      rejectedDetails: rejectedErrors,
      rawActorUserId: actor?.userId ?? null,
    },
  });

  return {
    success: true,
    batchId,
    filename,
    totalProcessed: items.length,
    createdCount: createdIds.length,
    skippedCount,
    rejectedCount: rejectedErrors.length,
    createdIds,
  };
}
