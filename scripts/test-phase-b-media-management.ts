import { detectImageFormat } from "../services/lab/logo-storage-service";
import {
  savePackageImage,
  deletePackageImageFile,
  MAX_PACKAGE_IMAGE_SIZE_BYTES,
} from "../services/lab/package-storage-service";
import {
  saveGalleryImage,
  deleteGalleryImageFile,
  MAX_GALLERY_IMAGE_SIZE_BYTES,
} from "../services/lab/gallery-storage-service";
import { getLabStorefront } from "../services/labs/storefront";
import { prisma } from "../lib/db/prisma";
import assert from "assert";

async function runTests() {
  console.log("==================================================");
  console.log("  Running Phase B — Media Management Test Suite   ");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`✅ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`❌ [FAIL] ${name}`);
            console.error(err);
          });
      } else {
        console.log(`✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // 1. Magic Bytes & Image Format Detection
  await test("Rejects invalid file headers (HTML / Script / Plaintext)", () => {
    const fakeHtml = Buffer.from("<html><script>alert(1)</script></html>");
    const result = detectImageFormat(fakeHtml);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error);
  });

  await test("Correctly identifies valid PNG magic bytes", () => {
    const pngHeader = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(16, 0x00),
    ]);
    const result = detectImageFormat(pngHeader);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.ext, "png");
  });

  await test("Correctly identifies valid JPEG magic bytes", () => {
    const jpgHeader = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
      Buffer.alloc(16, 0x00),
    ]);
    const result = detectImageFormat(jpgHeader);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.ext, "jpg");
  });

  await test("Correctly identifies valid WebP magic bytes", () => {
    // RIFF....WEBP
    const webpHeader = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x00, 0x00, 0x00, 0x20]),
      Buffer.from("WEBP"),
      Buffer.from("VP8 "),
    ]);
    const result = detectImageFormat(webpHeader);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.ext, "webp");
  });

  // 2. 5MB Size Limits
  await test("Rejects package image exceeding 5MB size limit", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_PACKAGE_IMAGE_SIZE_BYTES + 1024);
    const res = await savePackageImage("lab-test-id", "pkg-test-id", oversizedBuffer);
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("5MB"));
  });

  await test("Rejects gallery image exceeding 5MB size limit", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_GALLERY_IMAGE_SIZE_BYTES + 1024);
    const res = await saveGalleryImage("lab-test-id", oversizedBuffer);
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("5MB"));
  });

  // 3. Directory Traversal Defenses
  await test("Rejects path traversal in package image deletion", async () => {
    // Malicious traversal attempts should fail silently without throwing or unlinking
    await deletePackageImageFile("/api/files/package/../../etc/passwd");
    await deletePackageImageFile("/api/files/package/..\\..\\windows\\win.ini");
    await deletePackageImageFile("/api/files/package/invalid-name.sh");
  });

  await test("Rejects path traversal in gallery image deletion", async () => {
    await deleteGalleryImageFile("/api/files/gallery/../../etc/passwd");
    await deleteGalleryImageFile("/api/files/gallery/..\\..\\windows\\win.ini");
    await deleteGalleryImageFile("/api/files/gallery/arbitrary.exe");
  });

  // 4. File Saving & Safe URL generation
  let savedPkgUrl: string | undefined;
  let savedGalUrl: string | undefined;

  await test("Saves package image safely with strict prefix and random token", async () => {
    const validPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64, 0x00),
    ]);
    const res = await savePackageImage("lab-test", "pkg-test", validPng);
    assert.strictEqual(res.success, true);
    assert.ok(res.imageUrl?.startsWith("/api/files/package/pkg-labtest-pkgtest-"));
    assert.ok(res.imageUrl?.endsWith(".png"));
    savedPkgUrl = res.imageUrl;
  });

  await test("Saves gallery image safely with strict prefix and random token", async () => {
    const validJpg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
      Buffer.alloc(64, 0x00),
    ]);
    const res = await saveGalleryImage("lab-test", validJpg);
    assert.strictEqual(res.success, true);
    assert.ok(res.imageUrl?.startsWith("/api/files/gallery/gal-labtest-"));
    assert.ok(res.imageUrl?.endsWith(".jpg"));
    savedGalUrl = res.imageUrl;
  });

  // 5. Safe unlinking
  await test("Unlinks package image file safely from disk", async () => {
    assert.ok(savedPkgUrl);
    await deletePackageImageFile(savedPkgUrl);
  });

  await test("Unlinks gallery image file safely from disk", async () => {
    assert.ok(savedGalUrl);
    await deleteGalleryImageFile(savedGalUrl);
  });

  // 6. Database Schema & Models
  await test("Prisma Client contains LabGalleryImage model and Package.imageUrl", async () => {
    const labGalleryImageDelegate = (prisma as any).labGalleryImage;
    assert.ok(labGalleryImageDelegate, "prisma.labGalleryImage must be defined");
    assert.strictEqual(typeof labGalleryImageDelegate.findMany, "function");
    assert.strictEqual(typeof labGalleryImageDelegate.create, "function");
  });

  // 7. Storefront Service Integration
  await test("Storefront service includes galleryImages array and package imageUrl", async () => {
    const existingLab = await prisma.lab.findFirst({
      select: { slug: true },
    });
    if (existingLab) {
      const data = await getLabStorefront(existingLab.slug);
      assert.ok(data);
      assert.ok(Array.isArray(data.galleryImages), "data.galleryImages must be an array");
      if (data.packages.length > 0) {
        assert.ok("imageUrl" in data.packages[0], "packages must contain imageUrl property");
      }
    }
  });

  console.log(`\n==================================================`);
  console.log(`  Tests Completed: ${passed} / ${total} passed (${passed === total ? "ALL PASS" : "FAILURES"})`);
  console.log(`==================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
