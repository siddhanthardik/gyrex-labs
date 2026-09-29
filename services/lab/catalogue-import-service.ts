import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction } from "@prisma/client";

export interface RawRowData {
  rowNumber: number;
  code?: string;
  name?: string;
  category?: string;
  sampleType?: string;
  mrp?: number | null;
  sellingPrice?: number | null;
  homeCollection?: boolean;
  active?: boolean;
  rawRecord: Record<string, any>;
}

export interface ValidationIssue {
  type: "ERROR" | "WARNING";
  field: string;
  message: string;
}

export type ImportItemStatus = "READY" | "NEEDS_REVIEW" | "ERROR";
export type ImportMatchType = "EXACT_CODE" | "EXACT_NAME" | "SYNONYM" | "FUZZY" | "UNMATCHED";
export type ImportAction = "CREATE" | "UPDATE" | "SKIP";

export interface AnalyzedImportItem {
  id: string; // row client id e.g. "row-1"
  rowNumber: number;
  status: ImportItemStatus;
  matchType: ImportMatchType;
  confidence: number;
  matchReason: string;
  uploaded: {
    code: string;
    name: string;
    category?: string;
    sampleType?: string;
    mrp: number | null;
    sellingPrice: number | null;
    isHomeCollection: boolean;
    isActive: boolean;
  };
  matchedMaster: {
    id: string;
    code: string;
    name: string;
    categoryName: string;
    sampleType: string;
    standardTatHours: number;
  } | null;
  existingLabTest: {
    id: string;
    sellingPrice: number;
    mrpPrice: number | null;
    isActive: boolean;
  } | null;
  priceDifference?: {
    oldPrice: number;
    newPrice: number;
    diff: number;
  };
  action: ImportAction;
  issues: ValidationIssue[];
}

export interface BulkImportAnalysisResult {
  totalRows: number;
  readyCount: number;
  needsReviewCount: number;
  errorCount: number;
  updateCount: number;
  newCount: number;
  items: AnalyzedImportItem[];
}

export interface ConfirmedImportItem {
  masterTestId: string;
  sellingPrice: number;
  mrpPrice?: number | null;
  isHomeCollectionAvailable?: boolean;
  isActive?: boolean;
  action: ImportAction;
}

export interface ImportExecutionResult {
  success: boolean;
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROW_LIMIT = 5000;

/**
 * Standard header aliases for robust mapping.
 */
function normalizeHeaderKey(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.includes("code")) return "code";
  if (clean.includes("name") || clean.includes("test")) return "name";
  if (clean.includes("cat")) return "category";
  if (clean.includes("sample") || clean.includes("specimen")) return "sampleType";
  if (clean.includes("mrp")) return "mrp";
  if (clean.includes("selling") || clean.includes("price") || clean.includes("rate") || clean.includes("cost")) return "sellingPrice";
  if (clean.includes("home") || clean.includes("collection")) return "homeCollection";
  if (clean.includes("active") || clean.includes("status")) return "active";
  return clean;
}

/**
 * Parses boolean string or number safely. Defaults to true if empty or standard positive.
 */
function parseBooleanFlexible(value: any, defaultValue: boolean = true): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  const str = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1", "available"].includes(str)) return true;
  if (["no", "n", "false", "0", "unavailable"].includes(str)) return false;
  return defaultValue;
}

/**
 * Parses currency or decimal numbers safely, stripping symbols like '₹' or commas.
 */
function parsePrice(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }
  const cleanStr = String(value).replace(/[₹$,\s]/g, "").trim();
  if (!cleanStr) return null;
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
}

/**
 * Parses an uploaded XLSX or CSV buffer and returns raw rows.
 */
export function parseSpreadsheetBuffer(buffer: Buffer, fileName?: string): RawRowData[] {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds 10 MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`);
  }

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("The uploaded spreadsheet contains no readable sheets.");
  }

  // Prioritize sheet named 'Tests', otherwise use first sheet
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
    throw new Error("Spreadsheet is empty.");
  }

  // Find header row: scan first 10 rows for matching header keywords
  let headerRowIndex = -1;
  let headerMap: Record<number, string> = {};

  for (let r = 0; r < Math.min(10, aoa.length); r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;

    const testCodeFound = row.some((c) => String(c).toLowerCase().includes("code"));
    const testNameFound = row.some((c) => String(c).toLowerCase().includes("name"));
    const priceFound = row.some((c) =>
      String(c).toLowerCase().includes("price") || String(c).toLowerCase().includes("mrp")
    );

    if ((testCodeFound || testNameFound) && (priceFound || row.length >= 3)) {
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
      "Could not detect valid table headers. Please use the Gyrex Labs official template with columns: 'Test Code', 'Test Name', 'Selling Price'."
    );
  }

  // Verify that required headers exist
  const mappedCols = Object.values(headerMap);
  const hasCodeOrName = mappedCols.includes("code") || mappedCols.includes("name");
  const hasPrice = mappedCols.includes("sellingPrice");

  if (!hasCodeOrName) {
    throw new Error("Missing mandatory column: 'Test Name' or 'Test Code'.");
  }
  if (!hasPrice) {
    throw new Error("Missing mandatory column: 'Selling Price'.");
  }

  const rawRows: RawRowData[] = [];

  for (let r = headerRowIndex + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!Array.isArray(row) || row.every((c) => String(c).trim() === "")) {
      continue; // skip blank row
    }

    const rowObj: Record<string, any> = {};
    row.forEach((cellVal, colIdx) => {
      const field = headerMap[colIdx];
      if (field) {
        rowObj[field] = cellVal;
      }
    });

    const codeStr = rowObj["code"] ? String(rowObj["code"]).trim() : "";
    const nameStr = rowObj["name"] ? String(rowObj["name"]).trim() : "";

    // Ignore completely empty row
    if (!codeStr && !nameStr && !rowObj["sellingPrice"]) {
      continue;
    }

    rawRows.push({
      rowNumber: r + 1, // 1-based spreadsheet row number
      code: codeStr || undefined,
      name: nameStr || undefined,
      category: rowObj["category"] ? String(rowObj["category"]).trim() : undefined,
      sampleType: rowObj["sampleType"] ? String(rowObj["sampleType"]).trim() : undefined,
      mrp: parsePrice(rowObj["mrp"]),
      sellingPrice: parsePrice(rowObj["sellingPrice"]),
      homeCollection: parseBooleanFlexible(rowObj["homeCollection"], true),
      active: parseBooleanFlexible(rowObj["active"], true),
      rawRecord: rowObj,
    });

    if (rawRows.length > MAX_ROW_LIMIT) {
      throw new Error(`Row limit exceeded: maximum allowed is ${MAX_ROW_LIMIT} rows per file.`);
    }
  }

  if (rawRows.length === 0) {
    throw new Error("No data rows found in the uploaded file.");
  }

  return rawRows;
}

/**
 * Analyzes imported rows:
 * - Checks row validity (selling price, MRP >= selling price)
 * - Identifies in-file duplicates
 * - Checks against existing LabTest records in the lab
 * - Matches against central TestMaster (Code, Name, Synonym, Fuzzy)
 * - Assigns status: READY, NEEDS_REVIEW, ERROR
 */
export async function analyzeSpreadsheetImport(
  labId: string,
  rawRows: RawRowData[]
): Promise<BulkImportAnalysisResult> {
  // 1. Fetch all active TestMasters with category
  const masters = await prisma.testMaster.findMany({
    where: { isActive: true },
    include: { category: true },
  });

  // 2. Fetch all existing LabTests for this lab
  const existingLabTests = await prisma.labTest.findMany({
    where: { labId },
    include: { masterTest: true },
  });

  const labTestByMasterId = new Map(existingLabTests.map((lt) => [lt.masterTestId, lt]));

  // In-file duplicate tracker: key is normalized code or name
  const seenInFile = new Map<string, number>(); // key -> first seen rowNumber

  const items: AnalyzedImportItem[] = [];
  let readyCount = 0;
  let needsReviewCount = 0;
  let errorCount = 0;
  let updateCount = 0;
  let newCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const issues: ValidationIssue[] = [];
    const rowId = `row-${i + 1}`;

    const rawCode = (row.code || "").trim();
    const rawName = (row.name || "").trim();
    const upperCode = rawCode.toUpperCase();
    const lowerName = rawName.toLowerCase();

    // Field-level checks
    if (!rawCode && !rawName) {
      issues.push({
        type: "ERROR",
        field: "name",
        message: "Either Test Code or Test Name must be provided.",
      });
    }

    if (row.sellingPrice === null || row.sellingPrice === undefined) {
      issues.push({
        type: "ERROR",
        field: "sellingPrice",
        message: "Selling Price is required and cannot be empty.",
      });
    } else if (isNaN(row.sellingPrice) || row.sellingPrice <= 0) {
      issues.push({
        type: "ERROR",
        field: "sellingPrice",
        message: "Selling Price must be a valid positive number greater than 0.",
      });
    }

    if (row.mrp !== null && row.mrp !== undefined) {
      if (isNaN(row.mrp) || row.mrp <= 0) {
        issues.push({
          type: "WARNING",
          field: "mrp",
          message: "MRP should be a positive number.",
        });
      } else if (
        row.sellingPrice !== null &&
        row.sellingPrice !== undefined &&
        row.mrp < row.sellingPrice
      ) {
        issues.push({
          type: "WARNING",
          field: "mrp",
          message: `MRP (₹${row.mrp}) is lower than Selling Price (₹${row.sellingPrice}). MRP is typically equal to or higher than selling price.`,
        });
      }
    }

    // In-file duplicate check
    const dupKey = upperCode || lowerName;
    if (dupKey) {
      if (seenInFile.has(dupKey)) {
        const firstSeen = seenInFile.get(dupKey);
        issues.push({
          type: "WARNING",
          field: "code",
          message: `Duplicate item in file (matches row ${firstSeen}). If confirmed, this row will overwrite the previous entry.`,
        });
      } else {
        seenInFile.set(dupKey, row.rowNumber);
      }
    }

    // Test Master Matching
    let matchedMaster: (typeof masters)[0] | null = null;
    let matchType: ImportMatchType = "UNMATCHED";
    let confidence = 0;
    let matchReason = "No matching test found in Gyrex Test Master.";

    // 1. Exact Code
    if (upperCode) {
      const codeMatch = masters.find((m) => m.code.toUpperCase() === upperCode);
      if (codeMatch) {
        matchedMaster = codeMatch;
        matchType = "EXACT_CODE";
        confidence = 1.0;
        matchReason = `Exact code match with '${codeMatch.code}'.`;
      }
    }

    // 2. Exact Name
    if (!matchedMaster && lowerName) {
      const nameMatch = masters.find((m) => m.name.toLowerCase() === lowerName);
      if (nameMatch) {
        matchedMaster = nameMatch;
        matchType = "EXACT_NAME";
        confidence = 0.98;
        matchReason = `Exact test name match with '${nameMatch.name}'.`;
      }
    }

    // 3. Synonym Match
    if (!matchedMaster && lowerName) {
      const synMatch = masters.find((m) =>
        m.synonyms.some((s) => s.toLowerCase() === lowerName)
      );
      if (synMatch) {
        matchedMaster = synMatch;
        matchType = "SYNONYM";
        confidence = 0.92;
        matchReason = `Matched standard synonym for '${synMatch.name}'.`;
      }
    }

    // 4. Fuzzy / Token containment match
    if (!matchedMaster && lowerName && lowerName.length >= 3) {
      let fuzzyMatch = masters.find((m) => {
        const masterLower = m.name.toLowerCase();
        return masterLower.includes(lowerName) || lowerName.includes(masterLower);
      });

      if (!fuzzyMatch) {
        const inputTokens = lowerName
          .split(/[\s,()/-]+/)
          .filter((t) => t.length >= 4);

        if (inputTokens.length >= 2) {
          fuzzyMatch = masters.find((m) => {
            const masterTokens = m.name
              .toLowerCase()
              .split(/[\s,()/-]+/)
              .filter((t) => t.length >= 4);
            const commonTokens = inputTokens.filter((t) => masterTokens.includes(t));
            return commonTokens.length >= 2;
          });
        }
      }

      if (fuzzyMatch) {
        matchedMaster = fuzzyMatch;
        matchType = "FUZZY";
        confidence = 0.75;
        matchReason = `Potential match with '${fuzzyMatch.name}'. Review before importing.`;
      }
    }

    // Check against existing lab test
    let existingItem: AnalyzedImportItem["existingLabTest"] = null;
    let priceDiff: AnalyzedImportItem["priceDifference"] = undefined;
    let defaultAction: ImportAction = "CREATE";

    if (matchedMaster) {
      const existing = labTestByMasterId.get(matchedMaster.id);
      if (existing) {
        const oldPrice = Number(existing.sellingPrice);
        const newPrice = row.sellingPrice || 0;
        const diff = newPrice - oldPrice;

        existingItem = {
          id: existing.id,
          sellingPrice: oldPrice,
          mrpPrice: existing.mrpPrice ? Number(existing.mrpPrice) : null,
          isActive: existing.isActive,
        };

        priceDiff = {
          oldPrice,
          newPrice,
          diff,
        };

        if (diff !== 0) {
          defaultAction = "UPDATE";
          issues.push({
            type: "WARNING",
            field: "sellingPrice",
            message: `Existing catalogue test. Selling price will update from ₹${oldPrice} to ₹${newPrice}.`,
          });
        } else {
          defaultAction = "SKIP";
          issues.push({
            type: "WARNING",
            field: "sellingPrice",
            message: `Already in catalogue at ₹${oldPrice}. Will be skipped unless you choose to update.`,
          });
        }
      }
    }

    // Determine Overall Status
    let status: ImportItemStatus = "READY";
    const hasError = issues.some((iss) => iss.type === "ERROR");

    if (hasError) {
      status = "ERROR";
      errorCount++;
    } else if (matchType === "UNMATCHED") {
      status = "NEEDS_REVIEW";
      needsReviewCount++;
      issues.push({
        type: "WARNING",
        field: "name",
        message: "Not found in central Gyrex Master. Cannot be published until matched.",
      });
    } else if (matchType === "FUZZY") {
      status = "NEEDS_REVIEW";
      needsReviewCount++;
    } else if (issues.length > 0) {
      // has warnings
      status = "NEEDS_REVIEW";
      needsReviewCount++;
    } else {
      status = "READY";
      readyCount++;
    }

    if (defaultAction === "UPDATE") {
      updateCount++;
    } else if (status !== "ERROR" && defaultAction === "CREATE") {
      newCount++;
    }

    items.push({
      id: rowId,
      rowNumber: row.rowNumber,
      status,
      matchType,
      confidence,
      matchReason,
      uploaded: {
        code: rawCode,
        name: rawName || (matchedMaster ? matchedMaster.name : "Unknown"),
        category: row.category,
        sampleType: row.sampleType,
        mrp: row.mrp ?? null,
        sellingPrice: row.sellingPrice ?? null,
        isHomeCollection: row.homeCollection ?? true,
        isActive: row.active ?? true,
      },
      matchedMaster: matchedMaster
        ? {
            id: matchedMaster.id,
            code: matchedMaster.code,
            name: matchedMaster.name,
            categoryName: matchedMaster.category.name,
            sampleType: matchedMaster.sampleType,
            standardTatHours: matchedMaster.standardTatHours,
          }
        : null,
      existingLabTest: existingItem,
      priceDifference: priceDiff,
      action: defaultAction,
      issues,
    });
  }

  return {
    totalRows: rawRows.length,
    readyCount,
    needsReviewCount,
    errorCount,
    updateCount,
    newCount,
    items,
  };
}

/**
 * Defense against formula injection (CSV/Excel Formula Injection).
 * Prefixes cells starting with '=', '+', '-', '@' with a single quote.
 */
function sanitizeFormulaInjection(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates downloadable CSV Error & Warning Report for imported items.
 */
export function generateErrorReportCsv(items: AnalyzedImportItem[]): string {
  const headers = [
    "Row Number",
    "Test Code",
    "Test Name",
    "Uploaded Selling Price",
    "MRP",
    "Status",
    "Match Type",
    "Matched Master Test",
    "Existing Price (₹)",
    "Issues & Warnings",
    "Recommended Action",
  ];

  const problemItems = items.filter((item) => item.status !== "READY" || item.issues.length > 0);

  const lines = [headers.join(",")];

  for (const item of problemItems) {
    const issuesText = item.issues.map((i) => `[${i.type}] ${i.message}`).join("; ");
    let recommended = "Ready to import";
    if (item.status === "ERROR") {
      recommended = "Fix price or test name in file and re-upload";
    } else if (item.matchType === "UNMATCHED") {
      recommended = "Check test code/name spelling against Gyrex Test Master";
    } else if (item.matchType === "FUZZY") {
      recommended = "Verify if suggested Gyrex master matches your lab test";
    } else if (item.priceDifference) {
      recommended = `Confirm updating price from ₹${item.priceDifference.oldPrice} to ₹${item.priceDifference.newPrice}`;
    }

    const row = [
      item.rowNumber,
      sanitizeFormulaInjection(item.uploaded.code),
      sanitizeFormulaInjection(item.uploaded.name),
      item.uploaded.sellingPrice ?? "",
      item.uploaded.mrp ?? "",
      item.status,
      item.matchType,
      sanitizeFormulaInjection(item.matchedMaster ? `${item.matchedMaster.code} - ${item.matchedMaster.name}` : "None"),
      item.existingLabTest ? item.existingLabTest.sellingPrice : "",
      sanitizeFormulaInjection(issuesText),
      sanitizeFormulaInjection(recommended),
    ];

    lines.push(row.join(","));
  }

  return lines.join("\r\n");
}

/**
 * Commits confirmed import items to the database in a Neon-safe transaction.
 * Strictly verifies tenant boundary (labId).
 * Does NOT modify central TestMaster.
 */
export async function executeCatalogueImport(
  labId: string,
  confirmedItems: ConfirmedImportItem[],
  actorUserId?: string
): Promise<ImportExecutionResult> {
  if (!confirmedItems || confirmedItems.length === 0) {
    throw new Error("No items provided for import.");
  }

  // Filter out invalid items or explicitly skipped items
  const validItems = confirmedItems.filter(
    (item) => item.action !== "SKIP" && item.masterTestId && item.sellingPrice > 0
  );

  if (validItems.length === 0) {
    return {
      success: true,
      totalProcessed: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: confirmedItems.length,
    };
  }

  let createdCount = 0;
  let updatedCount = 0;

  // Use Neon-friendly transaction parameters
  await prisma.$transaction(
    async (tx) => {
      for (const item of validItems) {
        // Upsert into LabTest
        const existing = await tx.labTest.findUnique({
          where: {
            labId_masterTestId: {
              labId,
              masterTestId: item.masterTestId,
            },
          },
          select: { id: true, sellingPrice: true },
        });

        if (existing) {
          await tx.labTest.update({
            where: { id: existing.id },
            data: {
              sellingPrice: item.sellingPrice,
              mrpPrice: item.mrpPrice !== undefined ? item.mrpPrice : undefined,
              isActive: item.isActive !== undefined ? item.isActive : true,
              isHomeCollectionAvailable:
                item.isHomeCollectionAvailable !== undefined
                  ? item.isHomeCollectionAvailable
                  : true,
            },
          });
          updatedCount++;
        } else {
          await tx.labTest.create({
            data: {
              labId,
              masterTestId: item.masterTestId,
              sellingPrice: item.sellingPrice,
              mrpPrice: item.mrpPrice ?? null,
              isActive: item.isActive !== undefined ? item.isActive : true,
              isHomeCollectionAvailable:
                item.isHomeCollectionAvailable !== undefined
                  ? item.isHomeCollectionAvailable
                  : true,
            },
          });
          createdCount++;
        }
      }
    },
    { maxWait: 15000, timeout: 20000 }
  );

  // Record audit log
  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "LabCatalogueImport",
    entityId: labId,
    labId,
    metadata: {
      action: "CONFIRM_CATALOGUE_BULK_IMPORT",
      totalProcessed: createdCount + updatedCount,
      createdCount,
      updatedCount,
      skippedCount: confirmedItems.length - (createdCount + updatedCount),
    },
  });

  return {
    success: true,
    totalProcessed: createdCount + updatedCount,
    createdCount,
    updatedCount,
    skippedCount: confirmedItems.length - (createdCount + updatedCount),
  };
}
