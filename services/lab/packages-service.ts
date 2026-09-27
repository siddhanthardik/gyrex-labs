import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction } from "@prisma/client";

export interface CreatePackageInput {
  name: string;
  slug?: string;
  code?: string;
  description?: string;
  sellingPrice: number;
  mrpPrice?: number;
  isHomeCollectionAvailable?: boolean;
  fastingRequired?: boolean;
  preparationInstructions?: string;
  estimatedTatHours?: number;
  testIds: string[]; // LabTest IDs
}

export interface UpdatePackageInput extends Partial<CreatePackageInput> {
  isActive?: boolean;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Lists health packages created by this laboratory.
 */
export async function getLabPackages(labId: string, filter?: { search?: string; isActive?: boolean }) {
  const where: any = { labId };

  if (filter?.isActive !== undefined) {
    where.isActive = filter.isActive;
  }

  if (filter?.search) {
    where.name = { contains: filter.search.trim(), mode: "insensitive" };
  }

  const packages = await prisma.package.findMany({
    where,
    include: {
      packageTests: {
        include: {
          labTest: {
            include: {
              masterTest: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return packages.map((pkg) => {
    const individualTestValue = pkg.packageTests.reduce(
      (sum, pt) => sum + Number(pt.labTest.sellingPrice),
      0
    );
    const sellingPrice = Number(pkg.sellingPrice);
    const savings = Math.max(0, individualTestValue - sellingPrice);

    return {
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      code: pkg.code,
      description: pkg.description,
      sellingPrice,
      mrpPrice: pkg.mrpPrice ? Number(pkg.mrpPrice) : null,
      individualTestValue,
      savings,
      testCount: pkg.packageTests.length,
      isActive: pkg.isActive,
      isHomeCollectionAvailable: pkg.isHomeCollectionAvailable,
      estimatedTatHours: pkg.estimatedTatHours,
      fastingRequired: pkg.fastingRequired,
      preparationInstructions: pkg.preparationInstructions,
      tests: pkg.packageTests.map((pt) => ({
        labTestId: pt.labTestId,
        testName: pt.labTest.masterTest.name,
        testCode: pt.labTest.masterTest.code,
        price: Number(pt.labTest.sellingPrice),
      })),
    };
  });
}

/**
 * Gets a single package by ID for this laboratory.
 */
export async function getLabPackageById(labId: string, packageId: string) {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, labId },
    include: {
      packageTests: {
        include: {
          labTest: {
            include: {
              masterTest: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!pkg) {
    throw new Error("Health package not found or access denied.");
  }

  const individualTestValue = pkg.packageTests.reduce(
    (sum, pt) => sum + Number(pt.labTest.sellingPrice),
    0
  );
  const sellingPrice = Number(pkg.sellingPrice);
  const savings = Math.max(0, individualTestValue - sellingPrice);

  return {
    id: pkg.id,
    name: pkg.name,
    slug: pkg.slug,
    code: pkg.code,
    description: pkg.description,
    sellingPrice,
    mrpPrice: pkg.mrpPrice ? Number(pkg.mrpPrice) : null,
    individualTestValue,
    savings,
    isActive: pkg.isActive,
    isHomeCollectionAvailable: pkg.isHomeCollectionAvailable,
    estimatedTatHours: pkg.estimatedTatHours,
    fastingRequired: pkg.fastingRequired,
    preparationInstructions: pkg.preparationInstructions,
    tests: pkg.packageTests.map((pt) => ({
      labTestId: pt.labTestId,
      testName: pt.labTest.masterTest.name,
      testCode: pt.labTest.masterTest.code,
      sampleType: pt.labTest.masterTest.sampleType,
      price: Number(pt.labTest.sellingPrice),
    })),
  };
}

/**
 * Creates a new health package.
 * STRICT SECURITY: Validates that EVERY testId belongs exclusively to this labId!
 * Server calculates and verifies individual test value and savings.
 */
export async function createLabPackage(
  labId: string,
  input: CreatePackageInput,
  actorUserId?: string
) {
  if (input.sellingPrice < 0) {
    throw new Error("Package selling price cannot be negative.");
  }

  if (!input.name?.trim()) {
    throw new Error("Package name is required.");
  }

  if (!input.testIds || input.testIds.length === 0) {
    throw new Error("A package must contain at least one diagnostic test.");
  }

  // 1. Verify ALL testIds belong strictly to this lab tenant
  const validLabTests = await prisma.labTest.findMany({
    where: {
      id: { in: input.testIds },
      labId, // Mandatory tenant filter
    },
    include: { masterTest: true },
  });

  if (validLabTests.length !== input.testIds.length) {
    throw new Error(
      "Security Violation: One or more selected tests do not belong to your laboratory or do not exist."
    );
  }

  // 2. Compute server-authoritative individual total value
  const individualTestValue = validLabTests.reduce(
    (sum, t) => sum + Number(t.sellingPrice),
    0
  );

  // 3. Generate safe unique slug
  let slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);
  const existingSlug = await prisma.package.findFirst({
    where: { labId, slug },
  });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  // 4. Create package with junction items in a transaction
  const createdPackage = await prisma.$transaction(async (tx) => {
    const pkg = await tx.package.create({
      data: {
        labId,
        name: input.name.trim(),
        slug,
        code: input.code?.trim() || null,
        description: input.description?.trim() || null,
        sellingPrice: input.sellingPrice,
        mrpPrice: input.mrpPrice ?? individualTestValue,
        isHomeCollectionAvailable: input.isHomeCollectionAvailable ?? true,
        fastingRequired: input.fastingRequired ?? validLabTests.some((t) => t.masterTest.fastingRequired),
        preparationInstructions: input.preparationInstructions?.trim() || null,
        estimatedTatHours: input.estimatedTatHours ?? 24,
        isActive: true,
      },
    });

    for (let i = 0; i < input.testIds.length; i++) {
      await tx.packageTest.create({
        data: {
          packageId: pkg.id,
          labTestId: input.testIds[i],
          displayOrder: i,
        },
      });
    }

    return pkg;
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "Package",
    entityId: createdPackage.id,
    labId,
    metadata: {
      action: "PACKAGE_CREATED",
      packageName: createdPackage.name,
      sellingPrice: input.sellingPrice,
      individualTestValue,
      testsCount: input.testIds.length,
    },
  });

  return createdPackage;
}

/**
 * Updates an existing package.
 * Validates tenant ownership of the package and any newly associated tests.
 */
export async function updateLabPackage(
  labId: string,
  packageId: string,
  input: UpdatePackageInput,
  actorUserId?: string
) {
  const existing = await prisma.package.findFirst({
    where: { id: packageId, labId },
  });

  if (!existing) {
    throw new Error("Package not found or access denied.");
  }

  if (input.sellingPrice !== undefined && input.sellingPrice < 0) {
    throw new Error("Selling price cannot be negative.");
  }

  // If tests are being replaced, strictly verify all belong to this lab
  if (input.testIds) {
    if (input.testIds.length === 0) {
      throw new Error("A package must contain at least one diagnostic test.");
    }

    const validLabTests = await prisma.labTest.findMany({
      where: {
        id: { in: input.testIds },
        labId,
      },
    });

    if (validLabTests.length !== input.testIds.length) {
      throw new Error(
        "Security Violation: One or more selected tests do not belong to your laboratory."
      );
    }
  }

  const updatedPackage = await prisma.$transaction(async (tx) => {
    const pkg = await tx.package.update({
      where: { id: packageId },
      data: {
        name: input.name !== undefined ? input.name.trim() : undefined,
        description: input.description !== undefined ? input.description?.trim() : undefined,
        sellingPrice: input.sellingPrice !== undefined ? input.sellingPrice : undefined,
        mrpPrice: input.mrpPrice !== undefined ? input.mrpPrice : undefined,
        isActive: input.isActive !== undefined ? input.isActive : undefined,
        isHomeCollectionAvailable:
          input.isHomeCollectionAvailable !== undefined
            ? input.isHomeCollectionAvailable
            : undefined,
        fastingRequired:
          input.fastingRequired !== undefined ? input.fastingRequired : undefined,
        preparationInstructions:
          input.preparationInstructions !== undefined
            ? input.preparationInstructions?.trim()
            : undefined,
        estimatedTatHours:
          input.estimatedTatHours !== undefined ? input.estimatedTatHours : undefined,
      },
    });

    if (input.testIds) {
      // Replace package test junction
      await tx.packageTest.deleteMany({ where: { packageId } });
      for (let i = 0; i < input.testIds.length; i++) {
        await tx.packageTest.create({
          data: {
            packageId,
            labTestId: input.testIds[i],
            displayOrder: i,
          },
        });
      }
    }

    return pkg;
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.TEST_MASTER_UPDATED,
    entityType: "Package",
    entityId: packageId,
    labId,
    metadata: {
      action: "PACKAGE_UPDATED",
      previousActive: existing.isActive,
      newActive: updatedPackage.isActive,
    },
  });

  return updatedPackage;
}
