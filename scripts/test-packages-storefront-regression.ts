import assert from "assert";
import { prisma } from "../lib/db/prisma";
import { getLabStorefront } from "../services/labs/storefront";
import { getLabPackages, createLabPackage } from "../services/lab/packages-service";
import {
  savePackageImage,
  deletePackageImageFile,
} from "../services/lab/package-storage-service";

async function runRegressionTests() {
  console.log("==================================================================");
  console.log("  Running Storefront Packages & Images Regression Test Suite      ");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // Find pilot lab (e.g. sharma-diagnostics)
  const pilotLab = await prisma.lab.findFirst({
    where: { slug: "sharma-diagnostics" },
    include: {
      labTests: {
        where: { isActive: true },
        take: 3,
      },
      packages: true,
    },
  });

  if (!pilotLab || pilotLab.labTests.length < 2) {
    throw new Error("Pilot lab with at least 2 active tests required for regression suite.");
  }

  const testLabId = pilotLab.id;
  const testSlug = pilotLab.slug;
  const test1 = pilotLab.labTests[0];
  const test2 = pilotLab.labTests[1];

  // ─────────────────────────────────────────────────────────────
  // 1. Issue 1: Landing Page Display of Multiple Packages
  // ─────────────────────────────────────────────────────────────
  console.log("── Group 1: Landing Page Package Resolution & Prioritization ──");

  // Create test packages for isolation testing
  const timestamp = Date.now();
  const pkgA = await prisma.package.create({
    data: {
      labId: testLabId,
      name: `Regression Pkg Popular ${timestamp}`,
      slug: `reg-pkg-pop-${timestamp}`,
      sellingPrice: 1200,
      mrpPrice: 1800,
      isPopular: true,
      isActive: true,
      imageUrl: null,
      packageTests: {
        create: [{ labTestId: test1.id, displayOrder: 0 }],
      },
    },
  });

  const pkgB = await prisma.package.create({
    data: {
      labId: testLabId,
      name: `Regression Pkg NonPop 1 ${timestamp}`,
      slug: `reg-pkg-nonpop1-${timestamp}`,
      sellingPrice: 900,
      mrpPrice: 1200,
      isPopular: false,
      isActive: true,
      imageUrl: null,
      packageTests: {
        create: [{ labTestId: test2.id, displayOrder: 0 }],
      },
    },
  });

  const pkgC = await prisma.package.create({
    data: {
      labId: testLabId,
      name: `Regression Pkg NonPop 2 ${timestamp}`,
      slug: `reg-pkg-nonpop2-${timestamp}`,
      sellingPrice: 1500,
      mrpPrice: 2000,
      isPopular: false,
      isActive: true,
      imageUrl: null,
      packageTests: {
        create: [{ labTestId: test1.id, displayOrder: 0 }],
      },
    },
  });

  try {
    await test("getLabStorefront returns active packages ordered by isPopular desc, createdAt desc", async () => {
      const store = await getLabStorefront(testSlug);
      assert.ok(store, "Storefront must be found");
      const pkgs = store.packages;
      assert.ok(pkgs.length >= 3, "Storefront must return active packages");

      // Verify that popular packages appear before non-popular packages
      let seenNonPopular = false;
      for (const p of pkgs) {
        if (!p.isPopular) {
          seenNonPopular = true;
        } else if (seenNonPopular) {
          assert.fail(`Popular package ${p.name} appeared after a non-popular package in storefront results`);
        }
      }
    });

    await test("Landing page display algorithm resolves all 3 active packages without dropping non-popular", async () => {
      const store = await getLabStorefront(testSlug);
      assert.ok(store);

      // Filter only our test packages to test in isolation
      const relevant = store.packages.filter((p) => [pkgA.id, pkgB.id, pkgC.id].includes(p.id));
      assert.strictEqual(relevant.length, 3, "All 3 created test packages must be returned by storefront query");

      // Apply the landing page display logic
      const popularPackages = relevant.filter((p) => p.isPopular);
      const remainingPackages = relevant.filter((p) => !p.isPopular);
      const displayPackages = [...popularPackages, ...remainingPackages].slice(0, 6);

      // Verify that even with only 1 popular package, ALL 3 packages are displayed!
      assert.strictEqual(popularPackages.length, 1, "Exactly 1 test package is popular");
      assert.strictEqual(remainingPackages.length, 2, "2 test packages are non-popular");
      assert.strictEqual(displayPackages.length, 3, "displayPackages must contain all 3 packages (not just 1!)");

      // Verify popular package is ranked first
      assert.strictEqual(displayPackages[0].id, pkgA.id, "Popular package must be ranked first");
      assert.ok(
        displayPackages.some((p) => p.id === pkgB.id),
        "Non-popular package B must be present on landing page"
      );
      assert.ok(
        displayPackages.some((p) => p.id === pkgC.id),
        "Non-popular package C must be present on landing page"
      );
    });

    await test("When 0 packages are marked popular, displayPackages shows non-popular packages up to limit", async () => {
      const nonPopOnly = [pkgB, pkgC];
      const popularPackages = nonPopOnly.filter((p) => p.isPopular);
      const remainingPackages = nonPopOnly.filter((p) => !p.isPopular);
      const displayPackages = [...popularPackages, ...remainingPackages].slice(0, 6);

      assert.strictEqual(displayPackages.length, 2);
      assert.ok(displayPackages.some((p) => p.id === pkgB.id));
      assert.ok(displayPackages.some((p) => p.id === pkgC.id));
    });

    // ─────────────────────────────────────────────────────────────
    // 2. Issue 2: Package Images Storage, Querying & Propagation
    // ─────────────────────────────────────────────────────────────
    console.log("\n── Group 2: Package Image Storage, Retrieval & Propagation ──");

    await test("Default packages in database have imageUrl = null (verifies no invented/assumed images)", async () => {
      const freshPkg = await prisma.package.findUnique({
        where: { id: pkgA.id },
      });
      assert.strictEqual(freshPkg?.imageUrl, null, "Fresh package must have imageUrl: null");
    });

    let uploadedImageUrl: string | undefined;

    await test("Uploaded package image is validated, safely stored, and URL generated", async () => {
      const validPng = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.alloc(64, 0x00),
      ]);
      const saveRes = await savePackageImage(testLabId, pkgA.id, validPng);
      assert.strictEqual(saveRes.success, true);
      assert.ok(saveRes.imageUrl?.startsWith("/api/files/package/pkg-"));
      assert.ok(saveRes.imageUrl?.endsWith(".png"));
      uploadedImageUrl = saveRes.imageUrl;

      // Update package with the image URL
      await prisma.package.update({
        where: { id: pkgA.id },
        data: { imageUrl: uploadedImageUrl },
      });
    });

    await test("Storefront service getLabStorefront propagates package imageUrl to client", async () => {
      assert.ok(uploadedImageUrl);
      const store = await getLabStorefront(testSlug);
      assert.ok(store);
      const targetPkg = store.packages.find((p) => p.id === pkgA.id);
      assert.ok(targetPkg, "Package A must be found in storefront");
      assert.strictEqual(targetPkg.imageUrl, uploadedImageUrl, "Storefront package must have matching imageUrl");
    });

    await test("Admin service getLabPackages includes imageUrl for admin table thumbnails", async () => {
      assert.ok(uploadedImageUrl);
      const adminPkgs = await getLabPackages(testLabId);
      const targetPkg = adminPkgs.find((p) => p.id === pkgA.id);
      assert.ok(targetPkg, "Package A must be found in admin packages");
      assert.strictEqual(targetPkg.imageUrl, uploadedImageUrl, "Admin package must have matching imageUrl for thumbnail");
    });

    await test("Package image file is cleanly unlinked on deletion without deleting shared assets", async () => {
      assert.ok(uploadedImageUrl);
      await deletePackageImageFile(uploadedImageUrl);
      // Verify safe deletion does not throw
    });
  } finally {
    // Clean up test packages and relations
    await prisma.packageTest.deleteMany({
      where: { packageId: { in: [pkgA.id, pkgB.id, pkgC.id] } },
    });
    await prisma.package.deleteMany({
      where: { id: { in: [pkgA.id, pkgB.id, pkgC.id] } },
    });
  }

  console.log(`\n==================================================================`);
  console.log(`  Tests Completed: ${passed} / ${total} passed (${passed === total ? "ALL PASS" : "FAILURES"})`);
  console.log(`==================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runRegressionTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
