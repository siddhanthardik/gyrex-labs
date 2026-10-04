/**
 * Gyrex Labs - Idempotent TestCategory Provisioning & Reconciliation Script
 *
 * Reconciles the production database TestCategory table with the official
 * APPROVED_GYREX_TAXONOMY defined in services/superadmin/testmaster-import-service.ts.
 *
 * Rules:
 * - Reuses APPROVED_GYREX_TAXONOMY (does not duplicate taxonomy definitions)
 * - Checks TestCategory by slug and name
 * - Creates ONLY missing approved categories
 * - Never deletes or renames existing categories
 * - Never creates duplicates
 * - Preserves existing category IDs
 * - Sets created approved categories to active (isActive: true)
 * - Assigns sensible displayOrder based on taxonomy order
 * - Prints summary: EXISTING / CREATED / ALREADY_ACTIVE / TOTAL
 */

import { prisma } from "../lib/db/prisma";
import { APPROVED_GYREX_TAXONOMY } from "../services/superadmin/testmaster-import-service";

export interface ReconcileOptions {
  dryRun?: boolean;
  client?: any;
}

export interface ReconcileSummary {
  existing: number;
  created: number;
  alreadyActive: number;
  total: number;
  createdCategories: Array<{ name: string; slug: string; displayOrder: number }>;
}

export async function reconcileTestCategories(
  options: ReconcileOptions = {}
): Promise<ReconcileSummary> {
  const db = options.client || prisma;
  const isDryRun = options.dryRun ?? false;

  console.log("===============================================================");
  console.log(`  GYREX LABS TESTCATEGORY RECONCILIATION${isDryRun ? " [DRY RUN]" : ""}`);
  console.log("===============================================================\n");

  // Fetch all existing categories from the database
  const existingCategories: Array<{
    id: string;
    name: string;
    slug: string;
    displayOrder: number;
    isActive: boolean;
  }> = await db.testCategory.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const existingBySlug = new Map<string, typeof existingCategories[0]>();
  const existingByName = new Map<string, typeof existingCategories[0]>();

  for (const cat of existingCategories) {
    existingBySlug.set(cat.slug.trim().toLowerCase(), cat);
    existingByName.set(cat.name.trim().toLowerCase(), cat);
  }

  let existingCount = 0;
  let alreadyActiveCount = 0;
  let createdCount = 0;
  const createdCategories: Array<{ name: string; slug: string; displayOrder: number }> = [];

  // Calculate highest existing display order
  const maxExistingOrder = existingCategories.reduce(
    (max, c) => Math.max(max, c.displayOrder ?? 0),
    0
  );

  for (let idx = 0; idx < APPROVED_GYREX_TAXONOMY.length; idx++) {
    const item = APPROVED_GYREX_TAXONOMY[idx];
    const lowerSlug = item.slug.trim().toLowerCase();
    const lowerName = item.name.trim().toLowerCase();

    // Check if category already exists by slug or name
    const existing = existingBySlug.get(lowerSlug) || existingByName.get(lowerName);

    if (existing) {
      existingCount++;
      if (existing.isActive) {
        alreadyActiveCount++;
      }
      console.log(`  [EXISTING] "${existing.name}" (slug: "${existing.slug}", id: ${existing.id}, active: ${existing.isActive})`);
    } else {
      // Missing approved category — assign displayOrder based on taxonomy sequence
      const displayOrder = maxExistingOrder + (idx + 1) * 10;
      createdCount++;
      createdCategories.push({
        name: item.name,
        slug: item.slug,
        displayOrder,
      });

      if (!isDryRun) {
        const created = await db.testCategory.create({
          data: {
            name: item.name,
            slug: item.slug,
            displayOrder,
            isActive: true,
          },
        });
        existingBySlug.set(lowerSlug, created);
        existingByName.set(lowerName, created);
        console.log(`  [CREATED] "${created.name}" (slug: "${created.slug}", id: ${created.id}, displayOrder: ${displayOrder})`);
      } else {
        console.log(`  [WOULD CREATE] "${item.name}" (slug: "${item.slug}", displayOrder: ${displayOrder})`);
      }
    }
  }

  const total = existingCategories.length + (isDryRun ? 0 : createdCount);

  console.log("\n---------------------------------------------------------------");
  console.log("  RECONCILIATION SUMMARY");
  console.log("---------------------------------------------------------------");
  console.log(`  EXISTING:       ${existingCount}`);
  console.log(`  CREATED:        ${createdCount}${isDryRun ? " (dry run simulation)" : ""}`);
  console.log(`  ALREADY_ACTIVE: ${alreadyActiveCount}`);
  console.log(`  TOTAL:          ${total}`);
  console.log("---------------------------------------------------------------\n");

  return {
    existing: existingCount,
    created: createdCount,
    alreadyActive: alreadyActiveCount,
    total,
    createdCategories,
  };
}

// Allow direct CLI execution if executed as entrypoint
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/reconcile-test-categories.ts")) {
  const isDryRunArg = process.argv.includes("--dry-run");
  reconcileTestCategories({ dryRun: isDryRunArg })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Reconciliation failed:", err);
      process.exit(1);
    });
}
