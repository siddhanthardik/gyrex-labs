import { prisma } from "@/lib/db/prisma";
import { AuditAction, Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";

export interface TestMasterFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getTestMasterList(filters: TestMasterFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.TestMasterWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { synonyms: { has: filters.search } },
      { standardizedCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const [total, items, categories] = await Promise.all([
    prisma.testMaster.count({ where }),
    prisma.testMaster.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        category: true,
        _count: {
          select: { labTests: true },
        },
      },
    }),
    prisma.testCategory.findMany({
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
    items: items.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      slug: t.slug,
      synonyms: t.synonyms,
      category: t.category.name,
      categoryId: t.categoryId,
      sampleType: t.sampleType,
      standardTatHours: t.standardTatHours,
      fastingRequired: t.fastingRequired,
      preparationInstructions: t.preparationInstructions,
      description: t.description,
      standardizedCode: t.standardizedCode,
      isActive: t.isActive,
      labsOfferingCount: t._count.labTests,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  };
}

export async function createTestMaster(
  data: {
    code: string;
    name: string;
    categoryId: string;
    sampleType: string;
    standardTatHours?: number;
    fastingRequired?: boolean;
    preparationInstructions?: string;
    description?: string;
    synonyms?: string[];
    standardizedCode?: string;
  },
  actor: SessionUser
) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const created = await prisma.testMaster.create({
    data: {
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      categoryId: data.categoryId,
      sampleType: data.sampleType,
      standardTatHours: data.standardTatHours ?? 24,
      fastingRequired: data.fastingRequired ?? false,
      preparationInstructions: data.preparationInstructions || null,
      description: data.description || null,
      synonyms: data.synonyms || [],
      standardizedCode: data.standardizedCode || null,
      isActive: true,
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "TestMaster",
    entityId: created.id,
    metadata: {
      action: "CREATE",
      code: created.code,
      name: created.name,
    },
  });

  return created;
}

export async function updateTestMaster(
  id: string,
  data: {
    name?: string;
    categoryId?: string;
    sampleType?: string;
    standardTatHours?: number;
    fastingRequired?: boolean;
    preparationInstructions?: string;
    description?: string;
    synonyms?: string[];
    standardizedCode?: string;
    isActive?: boolean;
  },
  actor: SessionUser
) {
  const existing = await prisma.testMaster.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`TestMaster '${id}' not found`);
  }

  const updated = await prisma.testMaster.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.sampleType && { sampleType: data.sampleType }),
      ...(data.standardTatHours !== undefined && { standardTatHours: data.standardTatHours }),
      ...(data.fastingRequired !== undefined && { fastingRequired: data.fastingRequired }),
      ...(data.preparationInstructions !== undefined && { preparationInstructions: data.preparationInstructions }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.synonyms && { synonyms: data.synonyms }),
      ...(data.standardizedCode !== undefined && { standardizedCode: data.standardizedCode }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "TestMaster",
    entityId: id,
    metadata: {
      action: "UPDATE",
      changes: data,
    },
  });

  return updated;
}

export async function getTestCategories() {
  const categories = await prisma.testCategory.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      _count: {
        select: { testMasters: true },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    testsCount: c._count.testMasters,
  }));
}

export async function createTestCategory(
  data: { name: string; description?: string; displayOrder?: number },
  actor: SessionUser
) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const category = await prisma.testCategory.create({
    data: {
      name: data.name.trim(),
      slug,
      description: data.description || null,
      displayOrder: data.displayOrder ?? 0,
      isActive: true,
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "TestCategory",
    entityId: category.id,
    metadata: {
      action: "CREATE_CATEGORY",
      name: category.name,
    },
  });

  return category;
}

export async function getCatalogueMatchingOverview() {
  // Aggregate stats across all laboratories
  const labs = await prisma.lab.findMany({
    where: { status: { in: ["ACTIVE", "PENDING_VERIFICATION"] } },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { labTests: true },
      },
    },
    take: 10,
  });

  const totalMasterTests = await prisma.testMaster.count({ where: { isActive: true } });

  return {
    totalMasterTests,
    activeLabsCount: labs.length,
    labs: labs.map((l) => ({
      labId: l.id,
      labName: l.name,
      labSlug: l.slug,
      cataloguedTestsCount: l._count.labTests,
      coveragePercentage: totalMasterTests > 0
        ? Math.min(100, Math.round((l._count.labTests / totalMasterTests) * 100))
        : 0,
    })),
  };
}
