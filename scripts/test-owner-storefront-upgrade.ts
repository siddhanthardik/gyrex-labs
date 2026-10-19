import { prisma } from "../lib/db/prisma";
import { getLabStorefront } from "../services/labs/storefront";
import {
  getLabStoreSettings,
  updateLabStoreSettings,
} from "../services/lab/store-settings-service";
import {
  detectImageFormat,
  saveLabLogo,
  deleteLabLogoFile,
  MAX_LOGO_SIZE_BYTES,
} from "../services/lab/logo-storage-service";

async function runTests() {
  console.log("===============================================================");
  console.log("   GYREX LABS — OWNER PANEL & BRANDED STOREFRONT TEST SUITE    ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test Group 1: Logo Storage & Format Validation
    // -------------------------------------------------------------
    console.log("── Test Group 1: Logo Storage & Image Security ──");

    // 1.1 Valid PNG Magic bytes
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);
    const pngResult = detectImageFormat(pngBuffer);
    assert(pngResult.valid && pngResult.ext === "png", "Detects valid PNG by magic bytes");

    // 1.2 Valid JPEG Magic bytes
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const jpegResult = detectImageFormat(jpegBuffer);
    assert(jpegResult.valid && jpegResult.ext === "jpg", "Detects valid JPEG by magic bytes");

    // 1.3 Reject Executable/Script disguised as image
    const fakeImageBuffer = Buffer.from("<?php echo 'malicious'; ?>");
    const fakeResult = detectImageFormat(fakeImageBuffer);
    assert(!fakeResult.valid, "Rejects non-image executable script buffer");

    // 1.4 Reject file too small
    const tinyBuffer = Buffer.from([0x01, 0x02]);
    const tinyResult = detectImageFormat(tinyBuffer);
    assert(!tinyResult.valid, "Rejects file too small to contain valid image headers");

    // 1.5 Enforce MAX_LOGO_SIZE_BYTES limit (5MB)
    assert(MAX_LOGO_SIZE_BYTES === 5 * 1024 * 1024, "MAX_LOGO_SIZE_BYTES is strictly 5MB");

    // -------------------------------------------------------------
    // Test Group 2: Settings Service & Structured Store Metadata
    // -------------------------------------------------------------
    console.log("\n── Test Group 2: Store Settings Service & Metadata ──");

    const targetLab = await prisma.lab.findFirst({
      where: { slug: "sharma-diagnostics" },
    });

    if (!targetLab) {
      throw new Error("Seed lab 'sharma-diagnostics' not found in database.");
    }

    const originalSettings = await getLabStoreSettings(targetLab.id);
    assert(!!originalSettings.lab && !!originalSettings.settings, "Retrieves lab store settings successfully");

    // Update with rich clinical About, Services, Operating Hours, and Team
    const testAbout =
      "Sharma Diagnostics is an NABL-accredited diagnostic facility providing accurate clinical pathology, routine blood testing, and preventive health screenings with dedicated home collection across Delhi NCR.";
    const testSchedule =
      "Monday - Saturday: 07:00 AM - 08:30 PM | Sunday: 07:00 AM - 02:00 PM";
    const testServices = [
      "Clinical Pathology & Hematology",
      "Biochemistry & Hormonal Panels",
      "Preventive Full Body Checkups",
      "Doorstep Phlebotomy / Home Collection",
      "Digital Reports via WhatsApp & Email",
    ];
    const testTeam = [
      {
        name: "Dr. Ramesh Sharma",
        role: "Chief Pathologist & Medical Director",
        qualifications: "MBBS, MD (Pathology)",
      },
      {
        name: "Dr. Ananya Gupta",
        role: "Consultant Biochemist",
        qualifications: "MD (Biochemistry)",
      },
    ];

    const updated = await updateLabStoreSettings(targetLab.id, {
      heroHeadline: "Trusted Diagnostic Care in Janakpuri",
      heroSubheadline: "NABL Accredited accuracy with rapid digital report delivery.",
      metaDescription: testAbout,
      workingHours: {
        about: testAbout,
        schedule: testSchedule,
        services: testServices,
        team: testTeam,
      },
      deliveryPromiseNotice: "Digital reports delivered in 12 hours",
      homeCollectionAvailable: true,
      homeCollectionFee: 120,
      freeHomeCollectionThreshold: 899,
    });

    assert(
      (updated.settings.workingHours as any)?.about === testAbout,
      "Persists 'about' description in workingHours JSON"
    );
    assert(
      Array.isArray((updated.settings.workingHours as any)?.services) &&
        (updated.settings.workingHours as any).services.length === 5,
      "Persists custom clinical services list in workingHours JSON"
    );
    assert(
      (updated.settings.workingHours as any)?.schedule === testSchedule,
      "Persists operating hours schedule in workingHours JSON"
    );
    assert(
      Array.isArray((updated.settings.workingHours as any)?.team) &&
        (updated.settings.workingHours as any).team.length === 2,
      "Persists clinical team profiles in workingHours JSON"
    );

    // -------------------------------------------------------------
    // Test Group 3: Public Branded Digital Storefront Data
    // -------------------------------------------------------------
    console.log("\n── Test Group 3: Branded Digital Storefront Resolution ──");

    const storefront = await getLabStorefront("sharma-diagnostics");
    assert(!!storefront, "Resolves public storefront by slug");

    if (storefront) {
      assert(
        storefront.settings.about === testAbout,
        "Public storefront correctly resolves 'about' narrative"
      );
      assert(
        storefront.settings.schedule === testSchedule,
        "Public storefront correctly resolves operating hours schedule"
      );
      assert(
        storefront.settings.services.length === 5 &&
          storefront.settings.services.includes("Doorstep Phlebotomy / Home Collection"),
        "Public storefront correctly includes configured services"
      );
      assert(
        storefront.settings.team.length === 2 &&
          storefront.settings.team[0].name === "Dr. Ramesh Sharma" &&
          storefront.settings.team[0].role === "Chief Pathologist & Medical Director",
        "Public storefront correctly formats clinical team"
      );
      assert(
        !((storefront.settings.team[0] as any).email) &&
          !((storefront.settings.team[0] as any).phone),
        "Guarantees no private email or phone leak for clinical team members"
      );
      assert(
        storefront.popularTests.length > 0,
        `Resolves catalogue tests from existing data (${storefront.popularTests.length} tests)`
      );
      assert(
        storefront.packages.length > 0,
        `Resolves health packages from existing data (${storefront.packages.length} packages)`
      );
      assert(
        storefront.lab.isVerified === true,
        "Storefront reflects verified lab status"
      );
      assert(
        storefront.lab.nablAccreditationNumber === "MC-4412",
        "Storefront reflects NABL accreditation number"
      );
    }

    // -------------------------------------------------------------
    // Test Group 4: Safe Fallbacks on Unconfigured Lab
    // -------------------------------------------------------------
    console.log("\n── Test Group 4: Safe Clinical Fallbacks on Empty Storefront ──");

    // Clear workingHours on target lab to verify graceful fallbacks
    await prisma.labStoreSettings.update({
      where: { labId: targetLab.id },
      data: {
        workingHours: {},
        metaDescription: null,
      },
    });

    const fallbackStorefront = await getLabStorefront("sharma-diagnostics");
    assert(!!fallbackStorefront, "Retrieves storefront with empty workingHours");

    if (fallbackStorefront) {
      assert(
        fallbackStorefront.settings.about.length > 0,
        "Gracefully falls back to default professional about narrative"
      );
      assert(
        fallbackStorefront.settings.services.length >= 4,
        "Gracefully falls back to standard clinical services list"
      );
      assert(
        fallbackStorefront.settings.schedule.length > 0,
        "Gracefully falls back to standard laboratory operating hours"
      );
      assert(
        fallbackStorefront.settings.team.length > 0,
        "Gracefully falls back to medical director & quality assurance team"
      );
    }

    // -------------------------------------------------------------
    // Test Group 5: Restore Original Settings & Clean State
    // -------------------------------------------------------------
    console.log("\n── Test Group 5: State Cleanup & Idempotency ──");

    await updateLabStoreSettings(targetLab.id, {
      heroHeadline: originalSettings.settings.heroHeadline,
      heroSubheadline: originalSettings.settings.heroSubheadline,
      logoUrl: originalSettings.settings.logoUrl || undefined,
      primaryColor: originalSettings.settings.primaryColor,
      deliveryPromiseNotice: originalSettings.settings.deliveryPromiseNotice || undefined,
      workingHours: originalSettings.settings.workingHours,
      homeCollectionAvailable: originalSettings.settings.homeCollectionAvailable,
      homeCollectionFee: originalSettings.settings.homeCollectionFee,
      freeHomeCollectionThreshold: originalSettings.settings.freeHomeCollectionThreshold || undefined,
    });

    const restoredSettings = await getLabStoreSettings(targetLab.id);
    assert(
      restoredSettings.settings.heroHeadline === originalSettings.settings.heroHeadline,
      "Successfully restored original laboratory settings after test run"
    );

  } catch (err: any) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
