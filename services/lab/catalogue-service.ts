import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction, Prisma } from "@prisma/client";

export interface LabTestFilter {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface UpdateLabTestData {
  sellingPrice?: number;
  mrpPrice?: number;
  isActive?: boolean;
  isHomeCollectionAvailable?: boolean;
  customTatHours?: number;
  customPreparation?: string;
  labSpecificNotes?: string;
}

export interface AddMasterTestData {
  masterTestId: string;
  sellingPrice: number;
  mrpPrice?: number;
  isHomeCollectionAvailable?: boolean;
  customTatHours?: number;
  customPreparation?: string;
}

export interface ImportCandidateRow {
  name: string;
  code?: string;
  price: number;
  mrp?: number;
  homeCollection?: boolean;
}

export interface MatchResult {
  row: ImportCandidateRow;
  matchedMaster: {
    id: string;
    code: string;
    name: string;
    categoryName: string;
    standardTatHours: number;
  } | null;
  matchType: "EXACT_CODE" | "EXACT_NAME" | "SYNONYM" | "FUZZY" | "NONE";
  confidence: number; // 0 to 1
  reason: string;
}

export interface BulkImportAnalysis {
  totalImported: number;
  autoMatchedCount: number;
  needsReviewCount: number;
  unmatchedCount: number;
  readyPercentage: number;
  results: MatchResult[];
}

/**
 * Retrieves the lab's test catalogue with search & filters.
 */
export async function getLabTests(labId: string, filter?: LabTestFilter) {
  const whereClause: Prisma.LabTestWhereInput = {
    labId,
  };

  if (filter?.isActive !== undefined) {
    whereClause.isActive = filter.isActive;
  }

  if (filter?.search) {
    const term = filter.search.trim();
    whereClause.masterTest = {
      is: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { code: { contains: term, mode: "insensitive" } },
        ],
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      },
    };
  } else if (filter?.categoryId) {
    whereClause.masterTest = {
      is: {
        categoryId: filter.categoryId,
      },
    };
  }

  if (filter?.minPrice !== undefined || filter?.maxPrice !== undefined) {
    whereClause.sellingPrice = {};
    if (filter?.minPrice !== undefined) {
      whereClause.sellingPrice.gte = filter.minPrice;
    }
    if (filter?.maxPrice !== undefined) {
      whereClause.sellingPrice.lte = filter.maxPrice;
    }
  }

  const tests = await prisma.labTest.findMany({
    where: whereClause,
    include: {
      masterTest: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      masterTest: { name: "asc" },
    },
  });

  return tests.map((t) => ({
    id: t.id,
    masterTestId: t.masterTestId,
    name: t.masterTest.name,
    code: t.masterTest.code,
    categoryName: t.masterTest.category.name,
    categoryId: t.masterTest.categoryId,
    sampleType: t.masterTest.sampleType,
    sellingPrice: Number(t.sellingPrice),
    mrpPrice: t.mrpPrice ? Number(t.mrpPrice) : null,
    isActive: t.isActive,
    isHomeCollectionAvailable: t.isHomeCollectionAvailable,
    effectiveTatHours: t.customTatHours ?? t.masterTest.standardTatHours,
    customTatHours: t.customTatHours,
    preparationInstructions: t.customPreparation ?? t.masterTest.preparationInstructions,
    fastingRequired: t.masterTest.fastingRequired,
    labSpecificNotes: t.labSpecificNotes,
  }));
}

/**
 * Retrieves a single LabTest by ID ensuring tenant isolation.
 */
export async function getLabTestById(labId: string, labTestId: string) {
  const labTest = await prisma.labTest.findFirst({
    where: { id: labTestId, labId },
    include: {
      masterTest: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!labTest) {
    throw new Error("Diagnostic test not found in your laboratory catalogue.");
  }

  return {
    id: labTest.id,
    masterTestId: labTest.masterTestId,
    name: labTest.masterTest.name,
    code: labTest.masterTest.code,
    categoryName: labTest.masterTest.category.name,
    sampleType: labTest.masterTest.sampleType,
    standardTatHours: labTest.masterTest.standardTatHours,
    sellingPrice: Number(labTest.sellingPrice),
    mrpPrice: labTest.mrpPrice ? Number(labTest.mrpPrice) : null,
    isActive: labTest.isActive,
    isHomeCollectionAvailable: labTest.isHomeCollectionAvailable,
    customTatHours: labTest.customTatHours,
    customPreparation: labTest.customPreparation,
    labSpecificNotes: labTest.labSpecificNotes,
    fastingRequired: labTest.masterTest.fastingRequired,
    masterDescription: labTest.masterTest.description,
  };
}

/**
 * Updates a LabTest's prices, status, TAT, instructions.
 * Strictly verifies tenant boundary. Does NOT modify TestMaster.
 */
export async function updateLabTest(
  labId: string,
  labTestId: string,
  data: UpdateLabTestData,
  actorUserId?: string
) {
  const existing = await prisma.labTest.findFirst({
    where: { id: labTestId, labId },
    include: { masterTest: { select: { name: true } } },
  });

  if (!existing) {
    throw new Error("Diagnostic test not found or access denied.");
  }

  if (data.sellingPrice !== undefined && data.sellingPrice < 0) {
    throw new Error("Selling price cannot be negative.");
  }

  const updated = await prisma.labTest.update({
    where: { id: labTestId },
    data: {
      sellingPrice: data.sellingPrice !== undefined ? data.sellingPrice : undefined,
      mrpPrice: data.mrpPrice !== undefined ? data.mrpPrice : undefined,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
      isHomeCollectionAvailable:
        data.isHomeCollectionAvailable !== undefined ? data.isHomeCollectionAvailable : undefined,
      customTatHours: data.customTatHours !== undefined ? data.customTatHours : undefined,
      customPreparation: data.customPreparation !== undefined ? data.customPreparation : undefined,
      labSpecificNotes: data.labSpecificNotes !== undefined ? data.labSpecificNotes : undefined,
    },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "LabTest",
    entityId: labTestId,
    labId,
    metadata: {
      testName: existing.masterTest.name,
      previousPrice: Number(existing.sellingPrice),
      newPrice: Number(updated.sellingPrice),
      previousActive: existing.isActive,
      newActive: updated.isActive,
    },
  });

  return {
    id: updated.id,
    sellingPrice: Number(updated.sellingPrice),
    mrpPrice: updated.mrpPrice ? Number(updated.mrpPrice) : null,
    isActive: updated.isActive,
    isHomeCollectionAvailable: updated.isHomeCollectionAvailable,
    customTatHours: updated.customTatHours,
  };
}

/**
 * Browses central Gyrex Test Master catalogue to select tests to add.
 */
export async function getTestMasterCatalogue(
  labId: string,
  options?: { search?: string; categoryId?: string; excludeAlreadyAdded?: boolean }
) {
  const where: Prisma.TestMasterWhereInput = {
    isActive: true,
  };

  if (options?.categoryId) {
    where.categoryId = options.categoryId;
  }

  if (options?.search) {
    const term = options.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { synonyms: { has: term } },
    ];
  }

  if (options?.excludeAlreadyAdded) {
    const existing = await prisma.labTest.findMany({
      where: { labId },
      select: { masterTestId: true },
    });
    const existingIds = existing.map((e) => e.masterTestId);
    if (existingIds.length > 0) {
      where.id = { notIn: existingIds };
    }
  }

  const [masters, categories] = await Promise.all([
    prisma.testMaster.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.testCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    tests: masters.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      sampleType: m.sampleType,
      standardTatHours: m.standardTatHours,
      fastingRequired: m.fastingRequired,
      categoryName: m.category.name,
      categoryId: m.categoryId,
      synonyms: m.synonyms,
    })),
  };
}

/**
 * Adds a test from Gyrex Test Master to the laboratory's catalogue.
 */
export async function addTestMasterToLab(
  labId: string,
  data: AddMasterTestData,
  actorUserId?: string
) {
  if (data.sellingPrice < 0) {
    throw new Error("Selling price cannot be negative.");
  }

  const master = await prisma.testMaster.findUnique({
    where: { id: data.masterTestId },
  });

  if (!master) {
    throw new Error("Invalid Test Master reference.");
  }

  const labTest = await prisma.labTest.upsert({
    where: {
      labId_masterTestId: {
        labId,
        masterTestId: data.masterTestId,
      },
    },
    update: {
      sellingPrice: data.sellingPrice,
      mrpPrice: data.mrpPrice ?? null,
      isActive: true,
      isHomeCollectionAvailable: data.isHomeCollectionAvailable ?? true,
      customTatHours: data.customTatHours ?? null,
      customPreparation: data.customPreparation ?? null,
    },
    create: {
      labId,
      masterTestId: data.masterTestId,
      sellingPrice: data.sellingPrice,
      mrpPrice: data.mrpPrice ?? null,
      isActive: true,
      isHomeCollectionAvailable: data.isHomeCollectionAvailable ?? true,
      customTatHours: data.customTatHours ?? null,
      customPreparation: data.customPreparation ?? null,
    },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "LabTest",
    entityId: labTest.id,
    labId,
    metadata: {
      action: "ADD_TEST_TO_CATALOGUE",
      masterCode: master.code,
      masterName: master.name,
      sellingPrice: data.sellingPrice,
    },
  });

  return labTest;
}

/**
 * Analyzes bulk import rows against Gyrex Test Master without automatically modifying DB.
 */
export async function analyzeBulkImport(
  labId: string,
  rows: ImportCandidateRow[]
): Promise<BulkImportAnalysis> {
  const allMasters = await prisma.testMaster.findMany({
    where: { isActive: true },
    include: { category: true },
  });

  const results: MatchResult[] = [];
  let autoMatched = 0;
  let needsReview = 0;
  let unmatched = 0;

  for (const row of rows) {
    const rawName = row.name.trim();
    const cleanName = rawName.toLowerCase();
    const rawCode = row.code?.trim().toUpperCase();

    // 1. Try exact code match
    if (rawCode) {
      const codeMatch = allMasters.find((m) => m.code.toUpperCase() === rawCode);
      if (codeMatch) {
        results.push({
          row,
          matchedMaster: {
            id: codeMatch.id,
            code: codeMatch.code,
            name: codeMatch.name,
            categoryName: codeMatch.category.name,
            standardTatHours: codeMatch.standardTatHours,
          },
          matchType: "EXACT_CODE",
          confidence: 1.0,
          reason: `Exact code match with '${codeMatch.code}'`,
        });
        autoMatched++;
        continue;
      }
    }

    // 2. Try exact name match
    const exactNameMatch = allMasters.find((m) => m.name.toLowerCase() === cleanName);
    if (exactNameMatch) {
      results.push({
        row,
        matchedMaster: {
          id: exactNameMatch.id,
          code: exactNameMatch.code,
          name: exactNameMatch.name,
          categoryName: exactNameMatch.category.name,
          standardTatHours: exactNameMatch.standardTatHours,
        },
        matchType: "EXACT_NAME",
        confidence: 0.98,
        reason: "Exact test name match",
      });
      autoMatched++;
      continue;
    }

    // 3. Try synonym match
    const synonymMatch = allMasters.find((m) =>
      m.synonyms.some((s) => s.toLowerCase() === cleanName)
    );
    if (synonymMatch) {
      results.push({
        row,
        matchedMaster: {
          id: synonymMatch.id,
          code: synonymMatch.code,
          name: synonymMatch.name,
          categoryName: synonymMatch.category.name,
          standardTatHours: synonymMatch.standardTatHours,
        },
        matchType: "SYNONYM",
        confidence: 0.92,
        reason: "Matched standard medical synonym",
      });
      autoMatched++;
      continue;
    }

    // 4. Try partial / token containment match (Needs Review)
    const partialMatch = allMasters.find(
      (m) =>
        m.name.toLowerCase().includes(cleanName) ||
        cleanName.includes(m.name.toLowerCase()) ||
        m.synonyms.some((s) => cleanName.includes(s.toLowerCase()))
    );

    if (partialMatch) {
      results.push({
        row,
        matchedMaster: {
          id: partialMatch.id,
          code: partialMatch.code,
          name: partialMatch.name,
          categoryName: partialMatch.category.name,
          standardTatHours: partialMatch.standardTatHours,
        },
        matchType: "FUZZY",
        confidence: 0.75,
        reason: `Potential match with '${partialMatch.name}'. Review required before publishing.`,
      });
      needsReview++;
      continue;
    }

    // 5. Unmatched
    results.push({
      row,
      matchedMaster: null,
      matchType: "NONE",
      confidence: 0,
      reason: "No matching test found in Gyrex Test Master",
    });
    unmatched++;
  }

  const total = rows.length;
  const readyPercentage = total > 0 ? Math.round((autoMatched / total) * 100) : 0;

  return {
    totalImported: total,
    autoMatchedCount: autoMatched,
    needsReviewCount: needsReview,
    unmatchedCount: unmatched,
    readyPercentage,
    results,
  };
}

/**
 * Confirms reviewed imported items and persists them to the lab's catalogue.
 * Server validates and enforces tenant bounds.
 */
export async function confirmBulkImport(
  labId: string,
  confirmedItems: Array<{
    masterTestId: string;
    sellingPrice: number;
    mrpPrice?: number;
    isHomeCollectionAvailable?: boolean;
  }>,
  actorUserId?: string
) {
  let createdCount = 0;

  for (const item of confirmedItems) {
    if (item.sellingPrice < 0) continue;

    await prisma.labTest.upsert({
      where: {
        labId_masterTestId: {
          labId,
          masterTestId: item.masterTestId,
        },
      },
      update: {
        sellingPrice: item.sellingPrice,
        mrpPrice: item.mrpPrice ?? null,
        isActive: true,
        isHomeCollectionAvailable: item.isHomeCollectionAvailable ?? true,
      },
      create: {
        labId,
        masterTestId: item.masterTestId,
        sellingPrice: item.sellingPrice,
        mrpPrice: item.mrpPrice ?? null,
        isActive: true,
        isHomeCollectionAvailable: item.isHomeCollectionAvailable ?? true,
      },
    });
    createdCount++;
  }

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "LabTestImport",
    entityId: labId,
    labId,
    metadata: {
      action: "CONFIRM_BULK_IMPORT",
      totalConfirmed: createdCount,
    },
  });

  return { success: true, count: createdCount };
}
