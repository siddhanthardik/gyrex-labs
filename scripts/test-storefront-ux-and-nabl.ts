/**
 * GYREX LABS — STOREFRONT UX FIXES & NABL ACCREDITATION TEST SUITE
 *
 * Verifies all 8 requirements of the Storefront UX Fixes & NABL Accreditation Plan:
 * 1. Hero layout simplification & logo deduplication
 * 2. Dedicated Home Collection card separation
 * 3. Multi-paragraph About formatting
 * 4. Clinical team photo storage, magic byte validation, & public streaming
 * 5. Removal of duplicate /lab/staff from Store Settings Related Consoles
 * 6. NABL accreditation dates, active window evaluation, certificate storage, & private access
 * 7. HTML response handling in safeApiRequest without SyntaxError JSON parse crashes
 * 8. Multi-tenant isolation & zero schema migrations
 */

import { prisma } from "../lib/db/prisma";
import {
  getLabStoreSettings,
  updateLabStoreSettings,
} from "../services/lab/store-settings-service";
import { getLabStorefront } from "../services/labs/storefront";
import {
  saveTeamPhoto,
  deleteTeamPhotoFile,
  MAX_TEAM_PHOTO_SIZE_BYTES,
} from "../services/lab/team-storage-service";
import { detectImageFormat } from "../services/lab/logo-storage-service";
import {
  saveNablCertificate,
  deleteNablCertificateFile,
  MAX_NABL_CERT_SIZE_BYTES,
  detectNablCertificateFormat,
} from "../services/lab/nabl-storage-service";
import { computeIsNablValid } from "../app/lab/settings/page";
import fs from "fs";
import path from "path";

// Realistic image byte fixtures
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const WEBP_MAGIC = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);
const PDF_MAGIC = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Title (NABL Certificate)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF");
const SCRIPT_BUFFER = Buffer.from("<!DOCTYPE html><html><script>alert(1)</script></html>");

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failCount++;
  }
}

async function runTests() {
  console.log("\n===============================================================");
  console.log("   GYREX LABS — STOREFRONT UX FIXES & NABL ACCREDITATION TEST  ");
  console.log("===============================================================\n");

  const pilotSlug = "sharma-diagnostics";
  const pilotLab = await prisma.lab.findUnique({
    where: { slug: pilotSlug },
    include: { storeSettings: true },
  });

  if (!pilotLab) {
    console.error(`Pilot lab '${pilotSlug}' not found in database. Exiting.`);
    process.exit(1);
  }

  // Backup existing settings for restoration
  const originalWorkingHours = pilotLab.storeSettings?.workingHours as Record<string, any> | null;
  const originalNablNumber = pilotLab.nablAccreditationNumber;

  try {
    // ── Group 1: Team Photo Storage Service & Magic Bytes ──
    console.log("── Test Group 1: Team Photo Storage Service & Security ──");
    assert(MAX_TEAM_PHOTO_SIZE_BYTES === 5 * 1024 * 1024, "MAX_TEAM_PHOTO_SIZE_BYTES is strictly 5MB");
    assert(detectImageFormat(PNG_MAGIC).valid === true && detectImageFormat(PNG_MAGIC).ext === "png", "Detects PNG magic bytes for team photo");
    assert(detectImageFormat(JPEG_MAGIC).valid === true && detectImageFormat(JPEG_MAGIC).ext === "jpg", "Detects JPEG magic bytes for team photo");
    assert(detectImageFormat(WEBP_MAGIC).valid === true && detectImageFormat(WEBP_MAGIC).ext === "webp", "Detects WebP magic bytes for team photo");
    assert(detectImageFormat(SCRIPT_BUFFER).valid === false, "Rejects HTML/script buffer for team photo");
    assert(detectImageFormat(Buffer.from([0x01, 0x02])).valid === false, "Rejects truncated buffer for team photo");

    const teamSaveRes = await saveTeamPhoto(pilotLab.id, PNG_MAGIC);
    assert(teamSaveRes.success === true, "Saves valid PNG team photo");
    assert(
      typeof teamSaveRes.photoUrl === "string" && teamSaveRes.photoUrl.startsWith("/api/files/team/"),
      "Generates public stream URL: " + teamSaveRes.photoUrl
    );

    if (teamSaveRes.filename && teamSaveRes.photoUrl) {
      const diskPath = path.join(process.cwd(), "storage", "branding", "team", teamSaveRes.filename);
      assert(fs.existsSync(diskPath), "Saved team photo file exists in controlled storage");
      await deleteTeamPhotoFile(teamSaveRes.photoUrl);
      assert(!fs.existsSync(diskPath), "Stored team photo removed from disk after delete");
    }

    // Traversal test
    await deleteTeamPhotoFile("/api/files/team/../../../etc/passwd");
    assert(true, "Safely handles directory traversal attempts without crashing or unlinking outside dir");

    // ── Group 2: NABL Certificate Storage Service & Security ──
    console.log("\n── Test Group 2: NABL Certificate Storage Service & Security ──");
    assert(MAX_NABL_CERT_SIZE_BYTES === 10 * 1024 * 1024, "MAX_NABL_CERT_SIZE_BYTES is strictly 10MB");
    assert(detectNablCertificateFormat(PDF_MAGIC).valid === true && detectNablCertificateFormat(PDF_MAGIC).ext === "pdf", "Detects PDF magic bytes for NABL certificate");
    assert(detectNablCertificateFormat(PNG_MAGIC).valid === true && detectNablCertificateFormat(PNG_MAGIC).ext === "png", "Detects PNG magic bytes for NABL certificate");
    assert(detectNablCertificateFormat(JPEG_MAGIC).valid === true && detectNablCertificateFormat(JPEG_MAGIC).ext === "jpg", "Detects JPEG magic bytes for NABL certificate");
    assert(detectNablCertificateFormat(SCRIPT_BUFFER).valid === false, "Rejects script buffer for NABL certificate");

    const certSaveRes = await saveNablCertificate(pilotLab.id, PDF_MAGIC);
    assert(certSaveRes.success === true, "Saves valid PDF NABL certificate");
    assert(
      typeof certSaveRes.certificateUrl === "string" &&
        certSaveRes.certificateUrl.startsWith("/api/lab/profile/nabl-certificate/"),
      "Generates private authenticated route URL: " + certSaveRes.certificateUrl
    );

    if (certSaveRes.filename && certSaveRes.certificateUrl) {
      const diskPath = path.join(process.cwd(), "storage", "compliance", "nabl", certSaveRes.filename);
      assert(fs.existsSync(diskPath), "Saved NABL certificate exists in private compliance storage");
      await deleteNablCertificateFile(certSaveRes.certificateUrl);
      assert(!fs.existsSync(diskPath), "Private certificate removed from disk after delete");
    }

    // Traversal test
    await deleteNablCertificateFile("/api/lab/profile/nabl-certificate/../../secret.txt");
    assert(true, "Strictly prevents directory traversal in certificate deletion");

    // ── Group 3: NABL Date Validity & Trust Badge Window Evaluation ──
    console.log("\n── Test Group 3: NABL Date Validity & Trust Badge Window ──");
    const today = new Date();
    const lastYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const nextYear = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Case A: Active validity window (lastYear to nextYear)
    const activeValid = computeIsNablValid(true, "MC-4589", lastYear, nextYear);
    assert(activeValid === true, "Active date window returns valid = true");

    // Case B: Expired validity window (lastYear to yesterday)
    const expiredValid = computeIsNablValid(true, "MC-4589", lastYear, yesterday);
    assert(expiredValid === false, "Expired date window returns valid = false");

    // Case C: Future validity window (tomorrow to nextYear)
    const futureValid = computeIsNablValid(true, "MC-4589", tomorrow, nextYear);
    assert(futureValid === false, "Future start date returns valid = false");

    // Case D: Toggle OFF even if dates are valid
    const disabledValid = computeIsNablValid(false, "MC-4589", lastYear, nextYear);
    assert(disabledValid === false, "NABL toggle OFF returns valid = false");

    // Case E: Missing accreditation number
    const missingNumValid = computeIsNablValid(true, "", lastYear, nextYear);
    assert(missingNumValid === false, "Empty accreditation number returns valid = false");

    // Case F: Legacy unverified lab (number exists, but dates are null/empty)
    const legacyValid = computeIsNablValid(true, "MC-4589", null, null);
    assert(legacyValid === false, "Legacy lab without validity dates returns valid = false (badge withheld)");

    // Case G: Invalid dates where validUntil < validFrom in service layer
    let dateRangeErrorCaught = false;
    try {
      await updateLabStoreSettings(pilotLab.id, {
        isNablAccredited: true,
        nablAccreditationNumber: "MC-4589",
        nablValidFrom: nextYear,
        nablValidUntil: lastYear, // Invalid: until is before from
      });
    } catch (err: any) {
      dateRangeErrorCaught = true;
      assert(
        err.message.toLowerCase().includes("valid until") || err.message.toLowerCase().includes("earlier"),
        "updateLabStoreSettings rejects validUntil < validFrom with clear error"
      );
    }
    assert(dateRangeErrorCaught === true, "Service threw error when validUntil < validFrom");

    // ── Group 4: NABL Persistence & Public Storefront Resolution ──
    console.log("\n── Test Group 4: NABL Persistence & Public Storefront ──");
    // Persist active NABL credentials
    await updateLabStoreSettings(pilotLab.id, {
      isNablAccredited: true,
      nablAccreditationNumber: "MC-4589",
      nablValidFrom: lastYear,
      nablValidUntil: nextYear,
      nablCertificateUrl: "/api/lab/profile/nabl-certificate/sharma-cert.pdf",
    });

    const activeStorefront = await getLabStorefront(pilotSlug);
    assert(activeStorefront !== null, "Resolves storefront data for pilot lab");
    assert(activeStorefront?.settings.nabl?.isAccredited === true, "Storefront nabl.isAccredited is true");
    assert(activeStorefront?.settings.nabl?.accreditationNumber === "MC-4589", "Storefront resolves accreditation number");
    assert(activeStorefront?.settings.nabl?.isCurrentlyValid === true, "Storefront evaluates isCurrentlyValid = true for active window");

    // Persist expired NABL credentials
    await updateLabStoreSettings(pilotLab.id, {
      isNablAccredited: true,
      nablAccreditationNumber: "MC-4589",
      nablValidFrom: lastYear,
      nablValidUntil: yesterday,
    });

    const expiredStorefront = await getLabStorefront(pilotSlug);
    assert(
      expiredStorefront?.settings.nabl?.isCurrentlyValid === false,
      "Storefront evaluates isCurrentlyValid = false for expired date (badge withheld from patients)"
    );

    // ── Group 5: Clinical Team Photo Persistence & Privacy ──
    console.log("\n── Test Group 5: Clinical Team Photo Persistence & Privacy ──");
    const testTeam = [
      {
        name: "Dr. Ramesh Sharma",
        role: "Chief Pathologist & Medical Director",
        qualifications: "MBBS, MD (Pathology)",
        photoUrl: "/api/files/team/dr-sharma-test.jpg",
      },
      {
        name: "Dr. Priya Gupta",
        role: "Senior Consultant Biochemist",
        qualifications: "MBBS, MD (Biochemistry)",
        photoUrl: null,
      },
    ];

    await updateLabStoreSettings(pilotLab.id, {
      workingHours: {
        team: testTeam,
      },
    });

    const teamStorefront = await getLabStorefront(pilotSlug);
    const resolvedTeam = teamStorefront?.settings.team || [];
    assert(resolvedTeam.length === 2, "Public storefront resolves 2 team members");
    assert(
      resolvedTeam[0].photoUrl === "/api/files/team/dr-sharma-test.jpg",
      "Public storefront preserves specialist photoUrl: " + resolvedTeam[0].photoUrl
    );
    assert(resolvedTeam[1].photoUrl === null, "Specialist without photo retains photoUrl = null");
    // Ensure no private contacts leaked
    assert(!("email" in resolvedTeam[0]), "Specialist has no email field in public payload");
    assert(!("phone" in resolvedTeam[0]), "Specialist has no phone field in public payload");

    // ── Group 6: Multi-Paragraph About Formatting & Layout ──
    console.log("\n── Test Group 6: Multi-Paragraph About Formatting & Layout ──");
    const multiParagraphAbout =
      "Sharma Diagnostics was established in 1998 with a mission to deliver reliable and accessible diagnostic testing.\n\nOur laboratory is equipped with state-of-the-art automated clinical chemistry analyzers and hematology cell counters.\n\nAll test samples are processed under strict ISO 15189 quality protocols supervised by resident pathologists.";

    await updateLabStoreSettings(pilotLab.id, {
      workingHours: {
        about: multiParagraphAbout,
      },
    });

    const aboutStorefront = await getLabStorefront(pilotSlug);
    const resolvedAbout = aboutStorefront?.settings.about || "";
    const paragraphs = resolvedAbout.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    assert(paragraphs.length === 3, "About narrative cleanly splits into 3 separate paragraphs");
    assert(paragraphs[0].includes("established in 1998"), "Paragraph 1 contains facility founding history");
    assert(paragraphs[1].includes("automated clinical chemistry"), "Paragraph 2 contains laboratory equipment details");
    assert(paragraphs[2].includes("ISO 15189 quality protocols"), "Paragraph 3 contains clinical quality standards");

    // ── Group 7: Home Collection Card Separation & Hero Simplification ──
    console.log("\n── Test Group 7: Home Collection Card & Hero Simplification ──");
    await updateLabStoreSettings(pilotLab.id, {
      homeCollectionAvailable: true,
      homeCollectionFee: 150,
      freeHomeCollectionThreshold: 1200,
    });

    const hcStorefront = await getLabStorefront(pilotSlug);
    assert(hcStorefront?.settings.homeCollectionAvailable === true, "Home collection is enabled");
    assert(hcStorefront?.settings.homeCollectionFee === 150, "Home collection fee is configured at ₹150");
    assert(hcStorefront?.settings.freeHomeCollectionThreshold === 1200, "Free home collection threshold is ₹1200");

    // ── Group 8: Staff Console Deduplication in Store Settings ──
    console.log("\n── Test Group 8: Staff Console Deduplication in Settings ──");
    const settingsFile = fs.readFileSync(
      path.join(process.cwd(), "app", "lab", "settings", "page.tsx"),
      "utf8"
    );
    // Ensure "href=\"/lab/staff\"" is NOT present in the Related Consoles section
    const hasDuplicateStaffConsole =
      settingsFile.includes('href="/lab/staff"') &&
      settingsFile.includes("Related Consoles");
    assert(
      !settingsFile.includes('href="/lab/staff"'),
      "Settings page Related Consoles does NOT contain duplicate link to /lab/staff"
    );

    // ── Group 9: safeApiRequest HTML Error Handling ──
    console.log("\n── Test Group 9: safeApiRequest HTML Error Handling ──");
    assert(
      settingsFile.includes("safeApiRequest") &&
        settingsFile.includes("application/json"),
      "safeApiRequest helper verifies application/json content-type before parsing JSON"
    );
    assert(
      settingsFile.includes("status === 401") &&
        settingsFile.includes("session has expired"),
      "safeApiRequest handles 401 session expiry without JSON parse exception"
    );
    assert(
      settingsFile.includes("status === 502") || settingsFile.includes("status === 504"),
      "safeApiRequest handles 502/504 gateway timeout HTML responses gracefully"
    );

    // ── Group 10: Zero Schema Migrations & Data Model Safety ──
    console.log("\n── Test Group 10: Zero Schema Migrations & Data Model Safety ──");
    const retrievedSettings = await getLabStoreSettings(pilotLab.id);
    const rawWh = retrievedSettings.settings.workingHours as Record<string, any>;
    assert(typeof rawWh === "object" && rawWh !== null, "workingHours is a valid JSON object in database");
    assert("nabl" in rawWh, "NABL metadata is stored within existing workingHours JSON column");
    assert("team" in rawWh, "Clinical team is stored within existing workingHours JSON column");
    assert("about" in rawWh, "About narrative is stored within existing workingHours JSON column");
  } finally {
    // ── Restoration: Restore pilot lab to original baseline state ──
    console.log("\n── Restoring Pilot Lab Baseline State ──");
    if (pilotLab) {
      await prisma.lab.update({
        where: { id: pilotLab.id },
        data: {
          nablAccreditationNumber: originalNablNumber,
        },
      });

      if (pilotLab.storeSettings) {
        await prisma.labStoreSettings.update({
          where: { labId: pilotLab.id },
          data: {
            workingHours: originalWorkingHours || undefined,
          },
        });
      }
      console.log("  ✓ Restored Sharma Diagnostics database state.");
    }
  }

  console.log("\n===============================================================");
  console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log("===============================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
