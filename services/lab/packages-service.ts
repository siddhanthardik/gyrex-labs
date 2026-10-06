import { prisma } from "@/lib/db/prisma";

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
 * Validates selected LabTest records for a package.
 * Strict Tenant Boundary & Inactivity Enforcement:
 * - Deduplicates test IDs
 * - Verifies every test belongs to the authenticated lab
 * - Verifies every selected test is currently active in the lab's catalogue
 */
export async function validatePackageTests(labId: string, testIds: string[]) {
  if (!testIds || testIds.length === 0) {
    throw new Error("A package must contain at least one diagnostic test.");
  }

  const uniqueTestIds = Array.from(new Set(testIds.filter((id) => Boolean(id?.trim()))));
  if (uniqueTestIds.length === 0) {
    throw new Error("A package must contain at least one valid diagnostic test ID.");
  }

  const labTests = await prisma.labTest.findMany({
    where: {
      id: { in: uniqueTestIds },
      labId, // Strict tenant filter
    },
    include: {
      masterTest: {
        include: {
          category: true,
        },
      },
    },
  });

  if (labTests.length !== uniqueTestIds.length) {
    throw new Error(
      "Security Violation: One or more selected tests do not exist in your laboratory catalogue or belong to another facility."
    );
  }

  // Ensure all selected tests are active in the lab's catalogue
  for (const test of labTests) {
    if (!test.isActive) {
      throw new Error(
        `Test '${test.masterTest.name}' (${test.masterTest.code}) is inactive in your catalogue and cannot be included in a health package.`
      );
    }
  }

  const individualTestValue = labTests.reduce(
    (sum, t) => sum + Number(t.sellingPrice),
    0
  );

  return {
    validLabTests: labTests,
    uniqueTestIds,
    individualTestValue,
  };
}

/**
 * Calculates package summary and savings metrics using Decimal-safe math.
 */
export function calculatePackageMetrics(
  individualTestValue: number,
  packageSellingPrice: number
) {
  const savings = Math.max(0, individualTestValue - packageSellingPrice);
  const savingsPercentage =
    individualTestValue > 0
      ? Math.round((savings / individualTestValue) * 1000) / 10
      : 0;

  return {
    individualTestValue: Math.round(individualTestValue * 100) / 100,
    packageSellingPrice: Math.round(packageSellingPrice * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsPercentage,
  };
}

/**
 * Lists health packages created by this laboratory.
 * Strictly scoped to labId tenant.
 */
export async function getLabPackages(
  labId: string,
  filter?: { search?: string; isActive?: boolean }
) {
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
              masterTest: {
                include: {
                  category: true,
                },
              },
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
    const metrics = calculatePackageMetrics(individualTestValue, sellingPrice);

    return {
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      code: pkg.code,
      description: pkg.description,
      sellingPrice,
      mrpPrice: pkg.mrpPrice ? Number(pkg.mrpPrice) : null,
      individualTestValue: metrics.individualTestValue,
      savings: metrics.savings,
      savingsPercentage: metrics.savingsPercentage,
      testCount: pkg.packageTests.length,
      isActive: pkg.isActive,
      isHomeCollectionAvailable: pkg.isHomeCollectionAvailable,
      estimatedTatHours: pkg.estimatedTatHours,
      fastingRequired: pkg.fastingRequired,
      preparationInstructions: pkg.preparationInstructions,
      sampleTypes: pkg.sampleTypes,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      tests: pkg.packageTests.map((pt) => ({
        labTestId: pt.labTestId,
        testName: pt.labTest.masterTest.name,
        testCode: pt.labTest.masterTest.code,
        categoryName: pt.labTest.masterTest.category?.name,
        sampleType: pt.labTest.masterTest.sampleType,
        price: Number(pt.labTest.sellingPrice),
      })),
    };
  });
}

/**
 * Gets a single package by ID for this laboratory.
 * Enforces tenant isolation.
 */
export async function getLabPackageById(labId: string, packageId: string) {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, labId },
    include: {
      packageTests: {
        include: {
          labTest: {
            include: {
              masterTest: {
                include: {
                  category: true,
                },
              },
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
  const metrics = calculatePackageMetrics(individualTestValue, sellingPrice);

  return {
    id: pkg.id,
    name: pkg.name,
    slug: pkg.slug,
    code: pkg.code,
    description: pkg.description,
    sellingPrice,
    mrpPrice: pkg.mrpPrice ? Number(pkg.mrpPrice) : null,
    individualTestValue: metrics.individualTestValue,
    savings: metrics.savings,
    savingsPercentage: metrics.savingsPercentage,
    testCount: pkg.packageTests.length,
    isActive: pkg.isActive,
    isHomeCollectionAvailable: pkg.isHomeCollectionAvailable,
    estimatedTatHours: pkg.estimatedTatHours,
    fastingRequired: pkg.fastingRequired,
    preparationInstructions: pkg.preparationInstructions,
    sampleTypes: pkg.sampleTypes,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    tests: pkg.packageTests.map((pt) => ({
      labTestId: pt.labTestId,
      testName: pt.labTest.masterTest.name,
      testCode: pt.labTest.masterTest.code,
      categoryName: pt.labTest.masterTest.category?.name,
      sampleType: pt.labTest.masterTest.sampleType,
      price: Number(pt.labTest.sellingPrice),
      isHomeCollectionAvailable: pt.labTest.isHomeCollectionAvailable,
      homeCollectionEligible: pt.labTest.masterTest.homeCollectionEligible,
    })),
  };
}

/**
 * Creates a new health package.
 * STRICT SECURITY: Validates that EVERY testId belongs exclusively to this labId!
 * Atomic transaction: Creates Package and PackageTest relations in one transaction.
 */
export async function createLabPackage(
  labId: string,
  input: CreatePackageInput,
  actorUserId?: string
) {
  if (!input.name?.trim()) {
    throw new Error("Package name is required.");
  }

  if (input.sellingPrice === undefined || input.sellingPrice === null || isNaN(input.sellingPrice)) {
    throw new Error("Package selling price is required.");
  }

  if (input.sellingPrice <= 0) {
    throw new Error("Package selling price must be greater than zero.");
  }

  if (input.mrpPrice !== undefined && input.mrpPrice !== null) {
    if (isNaN(input.mrpPrice) || input.mrpPrice <= 0) {
      throw new Error("MRP price must be a valid positive number.");
    }
    if (input.sellingPrice > input.mrpPrice) {
      throw new Error("Package selling price cannot exceed the MRP / printed price.");
    }
  }

  // 1. Verify and deduplicate test IDs
  const { validLabTests, uniqueTestIds, individualTestValue } =
    await validatePackageTests(labId, input.testIds);

  // 2. Generate unique slug within tenant
  let slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);
  if (!slug) slug = `package-${Date.now()}`;
  const existingSlug = await prisma.package.findFirst({
    where: { labId, slug },
  });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  // 3. Collect distinct sample types
  const sampleTypes = Array.from(
    new Set(validLabTests.map((t) => t.masterTest.sampleType).filter(Boolean))
  );

  // 4. Derive fasting requirement
  const fastingRequired =
    input.fastingRequired ?? validLabTests.some((t) => t.masterTest.fastingRequired);

  // 5. Derive estimated TAT (max of tests' standard TAT or 24)
  const maxTat = Math.max(
    ...validLabTests.map((t) => t.customTatHours || t.masterTest.standardTatHours || 24)
  );
  const estimatedTatHours = input.estimatedTatHours || maxTat;

  // 6. Clinical & Laboratory home collection eligibility validation
  const clinicallyIneligibleTests = validLabTests.filter((t) => !t.masterTest.homeCollectionEligible);
  const labUnavailableTests = validLabTests.filter((t) => !t.isHomeCollectionAvailable);

  if (input.isHomeCollectionAvailable === true) {
    if (clinicallyIneligibleTests.length > 0) {
      const names = clinicallyIneligibleTests.map((t) => t.masterTest.name).join(", ");
      throw new Error(
        `The following tests require on-site clinical collection and cannot be offered for home sample collection: ${names}`
      );
    }
    if (labUnavailableTests.length > 0) {
      const names = labUnavailableTests.map((t) => t.masterTest.name).join(", ");
      throw new Error(
        `The following tests are not offered for home collection by your laboratory: ${names}`
      );
    }
  }

  const effectiveHomeCollection =
    clinicallyIneligibleTests.length > 0 || labUnavailableTests.length > 0
      ? false
      : (input.isHomeCollectionAvailable ?? true);

  // 7. Create package with junction items in an atomic transaction
  const createdPackage = await prisma.$transaction(
    async (tx) => {
      const pkg = await tx.package.create({
        data: {
          labId,
          name: input.name.trim(),
          slug,
          code: input.code?.trim() || null,
          description: input.description?.trim() || null,
          sellingPrice: input.sellingPrice,
          mrpPrice: input.mrpPrice ?? (individualTestValue > 0 ? individualTestValue : input.sellingPrice),
          isHomeCollectionAvailable: effectiveHomeCollection,
          fastingRequired,
          preparationInstructions: input.preparationInstructions?.trim() || null,
          sampleTypes,
          estimatedTatHours,
          isActive: true,
        },
      });

      for (let i = 0; i < uniqueTestIds.length; i++) {
        await tx.packageTest.create({
          data: {
            packageId: pkg.id,
            labTestId: uniqueTestIds[i],
            displayOrder: i,
          },
        });
      }

      return pkg;
    },
    { maxWait: 15000, timeout: 20000 }
  );

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

  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Package name cannot be empty.");
  }

  if (input.sellingPrice !== undefined) {
    if (isNaN(input.sellingPrice) || input.sellingPrice <= 0) {
      throw new Error("Package selling price must be greater than zero.");
    }
  }

  if (input.mrpPrice !== undefined && input.mrpPrice !== null) {
    if (isNaN(input.mrpPrice) || input.mrpPrice <= 0) {
      throw new Error("MRP price must be a valid positive number.");
    }
  }

  const effectiveSelling = input.sellingPrice !== undefined ? input.sellingPrice : Number(existing.sellingPrice);
  const effectiveMrp = input.mrpPrice !== undefined ? input.mrpPrice : (existing.mrpPrice ? Number(existing.mrpPrice) : null);
  if (effectiveMrp !== null && effectiveSelling > effectiveMrp) {
    throw new Error("Package selling price cannot exceed the MRP / printed price.");
  }

  let uniqueTestIds: string[] | undefined;
  let sampleTypes: string[] | undefined;
  let activePackageLabTests: Array<{
    isHomeCollectionAvailable: boolean;
    masterTest: { name: string; homeCollectionEligible: boolean };
  }> = [];

  // If tests are being replaced, strictly verify all belong to this lab and are active
  if (input.testIds) {
    const validated = await validatePackageTests(labId, input.testIds);
    uniqueTestIds = validated.uniqueTestIds;
    sampleTypes = Array.from(
      new Set(validated.validLabTests.map((t) => t.masterTest.sampleType).filter(Boolean))
    );
    activePackageLabTests = validated.validLabTests;
  } else {
    const existingPackageWithTests = await prisma.package.findFirst({
      where: { id: packageId, labId },
      include: {
        packageTests: {
          include: {
            labTest: {
              include: {
                masterTest: {
                  select: { name: true, homeCollectionEligible: true },
                },
              },
            },
          },
        },
      },
    });
    activePackageLabTests =
      existingPackageWithTests?.packageTests.map((pt) => pt.labTest) || [];
  }

  const requestedHomeCollection = input.isHomeCollectionAvailable;
  const clinicallyIneligible = activePackageLabTests.filter(
    (t) => !t.masterTest.homeCollectionEligible
  );
  const labUnavailable = activePackageLabTests.filter(
    (t) => !t.isHomeCollectionAvailable
  );

  if (requestedHomeCollection === true) {
    if (clinicallyIneligible.length > 0) {
      const names = clinicallyIneligible.map((t) => t.masterTest.name).join(", ");
      throw new Error(
        `The following tests require on-site clinical collection and cannot be offered for home sample collection: ${names}`
      );
    }
    if (labUnavailable.length > 0) {
      const names = labUnavailable.map((t) => t.masterTest.name).join(", ");
      throw new Error(
        `The following tests are not offered for home collection by your laboratory: ${names}`
      );
    }
  }

  const anyIneligible = clinicallyIneligible.length > 0 || labUnavailable.length > 0;
  const effectiveHomeCollection = anyIneligible
    ? false
    : (requestedHomeCollection !== undefined
        ? requestedHomeCollection
        : existing.isHomeCollectionAvailable);

  const updatedPackage = await prisma.$transaction(
    async (tx) => {
      const pkg = await tx.package.update({
        where: { id: packageId },
        data: {
          name: input.name !== undefined ? input.name.trim() : undefined,
          description: input.description !== undefined ? input.description?.trim() : undefined,
          code: input.code !== undefined ? input.code?.trim() || null : undefined,
          sellingPrice: input.sellingPrice !== undefined ? input.sellingPrice : undefined,
          mrpPrice: input.mrpPrice !== undefined ? input.mrpPrice : undefined,
          isActive: input.isActive !== undefined ? input.isActive : undefined,
          isHomeCollectionAvailable: effectiveHomeCollection,
          fastingRequired:
            input.fastingRequired !== undefined ? input.fastingRequired : undefined,
          preparationInstructions:
            input.preparationInstructions !== undefined
              ? input.preparationInstructions?.trim()
              : undefined,
          sampleTypes: sampleTypes !== undefined ? sampleTypes : undefined,
          estimatedTatHours:
            input.estimatedTatHours !== undefined ? input.estimatedTatHours : undefined,
        },
      });

      if (uniqueTestIds) {
        // Atomic replacement of junction tests
        await tx.packageTest.deleteMany({ where: { packageId } });
        for (let i = 0; i < uniqueTestIds.length; i++) {
          await tx.packageTest.create({
            data: {
              packageId,
              labTestId: uniqueTestIds[i],
              displayOrder: i,
            },
          });
        }
      }

      return pkg;
    },
    { maxWait: 15000, timeout: 20000 }
  );

  return updatedPackage;
}

/**
 * Safely deactivates a package without deleting historical orders or patient records.
 */
export async function deactivateLabPackage(
  labId: string,
  packageId: string,
  actorUserId?: string
) {
  const existing = await prisma.package.findFirst({
    where: { id: packageId, labId },
  });

  if (!existing) {
    throw new Error("Package not found or access denied.");
  }

  const updated = await prisma.package.update({
    where: { id: packageId },
    data: { isActive: false },
  });

  return { success: true, package: updated };
}
