/**
 * GYREX LABS — SERVICE AREAS (SINGLE & BULK PIN CODES) REGRESSION TEST SUITE
 *
 * Covers:
 * 1. Successful single PIN creation.
 * 2. Single PIN with locality name.
 * 3. Bulk PIN creation with multiple PIN/locality pairs.
 * 4. Duplicate PIN handling (single rejection & bulk skipping with details).
 * 5. Invalid PIN handling and accurate counts.
 * 6. Unauthenticated and unauthorized requests returning correct status without unexpected redirect.
 * 7. Lab tenant isolation (prevent cross-lab reads, writes, branch hijacking, and deletions).
 * 8. Reloading the service-area list after saving.
 * 9. Frontend bulk input parsing across all expected formats.
 *
 * Run: npx tsx scripts/test-service-areas-regression.ts
 */

import { prisma } from "../lib/db/prisma";
import {
  isValidIndianPincode,
  addPincodeCoverage,
  bulkAddPincodes,
  removePincodeCoverage,
  getLabServiceAreas,
} from "../services/lab/service-area-service";
import { parseBulkPincodes } from "../components/lab/service-areas-settings";
import { POST as postServiceAreas, GET as getServiceAreas } from "../app/api/lab/service-areas/route";
import { DELETE as deleteServiceArea } from "../app/api/lab/service-areas/[id]/route";
import { AuthorizationError } from "../lib/auth/context";
import { NextRequest } from "next/server";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failedTests++;
  }
}

async function runRegressionSuite() {
  console.log("\n==================================================================");
  console.log("   GYREX LABS — SERVICE AREAS REGRESSION TEST SUITE");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const labASlug = `test-service-lab-a-${timestamp}`;
  const labBSlug = `test-service-lab-b-${timestamp}`;

  // Create two isolated test labs
  const labA = await prisma.lab.create({
    data: {
      name: `Test Laboratory Alpha ${timestamp}`,
      slug: labASlug,
      code: `TLA${timestamp.toString().slice(-4)}`,
      email: `alpha-${timestamp}@gyrexlabs.test`,
      phone: "9876543210",
      city: "Bengaluru",
      state: "Karnataka",
      addressLine1: "100 Indiranagar",
      postalCode: "560038",
      storeSettings: {
        create: {
          homeCollectionAvailable: true,
          homeCollectionFee: 100,
        },
      },
    },
  });

  const labB = await prisma.lab.create({
    data: {
      name: `Test Laboratory Beta ${timestamp}`,
      slug: labBSlug,
      code: `TLB${timestamp.toString().slice(-4)}`,
      email: `beta-${timestamp}@gyrexlabs.test`,
      phone: "9876543211",
      city: "Bengaluru",
      state: "Karnataka",
      addressLine1: "200 Koramangala",
      postalCode: "560095",
      storeSettings: {
        create: {
          homeCollectionAvailable: true,
          homeCollectionFee: 150,
        },
      },
    },
  });

  // Create a branch under Lab B to test cross-tenant branch hijacking prevention
  const branchB = await prisma.labBranch.create({
    data: {
      labId: labB.id,
      name: "Beta Koramangala Hub",
      code: `BKH-${timestamp.toString().slice(-4)}`,
      city: "Bengaluru",
      state: "Karnataka",
      addressLine1: "Koramangala 4th Block",
      postalCode: "560034",
      phone: "9876543212",
    },
  });

  // Create a branch under Lab A for branch assignment tests
  const branchA = await prisma.labBranch.create({
    data: {
      labId: labA.id,
      name: "Alpha Indiranagar Hub",
      code: `AIH-${timestamp.toString().slice(-4)}`,
      city: "Bengaluru",
      state: "Karnataka",
      addressLine1: "Indiranagar 100ft Road",
      postalCode: "560038",
      phone: "9876543213",
    },
  });

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. PIN Format Validation Unit Tests
    // ─────────────────────────────────────────────────────────────
    console.log("── 1. PIN Format Validation & Parser Unit Tests ──");
    assert(isValidIndianPincode("560038") === true, "Valid 6-digit PIN 560038 accepted");
    assert(isValidIndianPincode("110001") === true, "Valid 6-digit PIN 110001 accepted");
    assert(isValidIndianPincode("011001") === false, "PIN starting with 0 rejected");
    assert(isValidIndianPincode("56003") === false, "5-digit PIN rejected");
    assert(isValidIndianPincode("5600381") === false, "7-digit PIN rejected");
    assert(isValidIndianPincode("ABCDEF") === false, "Letters rejected");
    assert(isValidIndianPincode(" 560038 ") === true, "Trimmable valid PIN accepted");

    // ─────────────────────────────────────────────────────────────
    // 2. Frontend Bulk Parser Tests
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 2. Bulk Input Parser Formats ──");
    {
      const bulkSample = `
        560038 - Indiranagar
        560001, MG Road
        560095: Koramangala 5th Block
        560034
        560025\tVictoria Layout
        012345 - Invalid Start Zero
        99999 - Too Short
        560047, 560078, 560085
      `;
      const parsed = parseBulkPincodes(bulkSample);

      assert(parsed.entries.length === 8, "Parsed exactly 8 valid PIN entries from heterogeneous text", `Found ${parsed.entries.length}`);
      assert(parsed.invalidTokens.includes("012345"), "Correctly flagged 012345 as invalid PIN");
      assert(parsed.invalidTokens.includes("99999"), "Correctly flagged 99999 as invalid PIN");

      const indiranagar = parsed.entries.find((e) => e.pincode === "560038");
      assert(indiranagar?.localityName === "Indiranagar", "Extracted 'Indiranagar' from hyphen delimiter");

      const mgRoad = parsed.entries.find((e) => e.pincode === "560001");
      assert(mgRoad?.localityName === "MG Road", "Extracted 'MG Road' from comma delimiter");

      const koramangala = parsed.entries.find((e) => e.pincode === "560095");
      assert(koramangala?.localityName === "Koramangala 5th Block", "Extracted locality from colon delimiter");

      const plain = parsed.entries.find((e) => e.pincode === "560034");
      assert(plain?.localityName === null, "Plain PIN has null locality");

      const tabEntry = parsed.entries.find((e) => e.pincode === "560025");
      assert(tabEntry?.localityName === "Victoria Layout", "Extracted locality from tab delimiter");

      const multi1 = parsed.entries.find((e) => e.pincode === "560047");
      const multi2 = parsed.entries.find((e) => e.pincode === "560078");
      const multi3 = parsed.entries.find((e) => e.pincode === "560085");
      assert(Boolean(multi1 && multi2 && multi3), "Extracted multi-PIN comma-separated line (560047, 560078, 560085)");
    }

    // ─────────────────────────────────────────────────────────────
    // 2b. Explicit Separators: Comma, Space, Newline with Duplicates & Invalids
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 2b. Comma, Space & Newline Separators with Duplicates and Invalids ──");
    {
      // 1. Comma-separated
      const commaInput = "560061, 560062, 560061, 12345, 056061, 560063";
      const commaParsed = parseBulkPincodes(commaInput);
      assert(commaParsed.entries.length === 4, `Comma-separated input extracted 4 total PIN entries, got ${commaParsed.entries.length}`);
      assert(commaParsed.invalidTokens.includes("12345"), "Comma-separated input flagged 12345 as invalid");
      assert(commaParsed.invalidTokens.includes("056061"), "Comma-separated input flagged 056061 as invalid");
      const commaRes = await bulkAddPincodes(labA.id, { pincodes: commaParsed.entries });
      assert(commaRes.addedCount === 3, `Comma-separated bulk added exactly 3 unique valid PINs, got ${commaRes.addedCount}`);
      assert(commaRes.skippedCount === 1, `Comma-separated bulk skipped 1 duplicate in batch, got ${commaRes.skippedCount}`);

      // 2. Space-separated
      const spaceInput = "560071   560072   560071   99999   011001   560073";
      const spaceParsed = parseBulkPincodes(spaceInput);
      assert(spaceParsed.entries.length === 4, `Space-separated input extracted 4 total PIN entries, got ${spaceParsed.entries.length}`);
      assert(spaceParsed.invalidTokens.includes("99999"), "Space-separated input flagged 99999 as invalid");
      assert(spaceParsed.invalidTokens.includes("011001"), "Space-separated input flagged 011001 as invalid");
      const spaceRes = await bulkAddPincodes(labA.id, { pincodes: spaceParsed.entries });
      assert(spaceRes.addedCount === 3, `Space-separated bulk added exactly 3 unique valid PINs, got ${spaceRes.addedCount}`);
      assert(spaceRes.skippedCount === 1, `Space-separated bulk skipped 1 duplicate in batch, got ${spaceRes.skippedCount}`);

      // 3. Newline-separated
      const newlineInput = "560081\n560082\n560081\nINVALID\n560083\n056081";
      const newlineParsed = parseBulkPincodes(newlineInput);
      assert(newlineParsed.entries.length === 4, `Newline-separated input extracted 4 total PIN entries, got ${newlineParsed.entries.length}`);
      assert(newlineParsed.invalidTokens.includes("INVALID"), "Newline-separated input flagged INVALID as invalid");
      assert(newlineParsed.invalidTokens.includes("056081"), "Newline-separated input flagged 056081 as invalid");
      const newlineRes = await bulkAddPincodes(labA.id, { pincodes: newlineParsed.entries });
      assert(newlineRes.addedCount === 3, `Newline-separated bulk added exactly 3 unique valid PINs, got ${newlineRes.addedCount}`);
      assert(newlineRes.skippedCount === 1, `Newline-separated bulk skipped 1 duplicate in batch, got ${newlineRes.skippedCount}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Successful Single PIN Creation
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 3. Successful Single PIN Creation ──");
    const single1 = await addPincodeCoverage(labA.id, {
      pincode: "560001",
    });
    assert(single1.pincode === "560001", "Single PIN 560001 created successfully");
    assert(single1.localityName === null, "Single PIN without locality saves null localityName");
    assert(single1.isActive === true, "Single PIN is active by default");
    assert(single1.labId === labA.id, "Single PIN is scoped to Lab A");

    // ─────────────────────────────────────────────────────────────
    // 4. Single PIN With Locality Name
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 4. Single PIN With Locality Name & Branch ──");
    const single2 = await addPincodeCoverage(labA.id, {
      pincode: "560038",
      localityName: "Indiranagar 100ft Road",
      branchId: branchA.id,
    });
    assert(single2.pincode === "560038", "Single PIN 560038 created successfully");
    assert(single2.localityName === "Indiranagar 100ft Road", "Locality name saved accurately");
    assert(single2.branchId === branchA.id, "Branch ID saved accurately");

    // ─────────────────────────────────────────────────────────────
    // 5. Bulk PIN Creation with Multiple PIN/Locality Pairs
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 5. Bulk PIN Creation With Multiple PIN/Locality Pairs ──");
    const bulkInput = {
      pincodes: [
        { pincode: "560095", localityName: "Koramangala" },
        { pincode: "560034", localityName: "Koramangala 3rd Block" },
        { pincode: "560025", localityName: "Victoria Layout" },
      ],
      branchId: branchA.id,
    };
    const bulkResult = await bulkAddPincodes(labA.id, bulkInput);
    assert(bulkResult.addedCount === 3, `Bulk imported 3 new PIN codes (addedCount: ${bulkResult.addedCount})`);
    assert(bulkResult.skippedCount === 0, `No duplicates skipped in clean batch (skippedCount: ${bulkResult.skippedCount})`);
    assert(bulkResult.invalidPincodes.length === 0, `No invalid PINs in clean batch`);
    assert(bulkResult.addedPincodes.length === 3, "addedPincodes contains all 3 added PINs");

    // ─────────────────────────────────────────────────────────────
    // 6. Duplicate PIN Handling
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 6. Duplicate PIN Handling ──");
    // Single duplicate should throw descriptive error
    let singleDuplicateError = "";
    try {
      await addPincodeCoverage(labA.id, {
        pincode: "560038",
        branchId: branchA.id,
      });
    } catch (err: any) {
      singleDuplicateError = err.message;
    }
    assert(
      singleDuplicateError.includes("already configured"),
      "Single duplicate addition rejected with 'already configured' error message",
      singleDuplicateError
    );

    // Bulk duplicate handling: mix of already existing, batch duplicate, and new
    const mixedBulkResult = await bulkAddPincodes(labA.id, {
      pincodes: [
        { pincode: "560038", localityName: "Indiranagar" }, // Existing in DB under branchA
        { pincode: "560047", localityName: "Austin Town" },  // New
        { pincode: "560047", localityName: "Austin Town Dup" }, // Duplicate in same batch
      ],
      branchId: branchA.id,
    });
    assert(mixedBulkResult.addedCount === 1, `Mixed bulk added exactly 1 new PIN (560047), got ${mixedBulkResult.addedCount}`);
    assert(mixedBulkResult.skippedCount === 2, `Mixed bulk skipped exactly 2 duplicates (1 in DB + 1 in batch), got ${mixedBulkResult.skippedCount}`);
    assert(mixedBulkResult.skippedDetails.length === 2, `skippedDetails contains 2 items`);
    assert(
      mixedBulkResult.skippedDetails.some((d) => d.pincode === "560038"),
      "skippedDetails correctly identified 560038 as already configured"
    );
    assert(
      mixedBulkResult.skippedDetails.some((d) => d.pincode === "560047"),
      "skippedDetails correctly identified 560047 as batch duplicate"
    );

    // ─────────────────────────────────────────────────────────────
    // 7. Invalid PIN Handling & Accurate Counts
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 7. Invalid PIN Handling & Accurate Counts ──");
    const invalidBatchResult = await bulkAddPincodes(labA.id, {
      pincodes: [
        { pincode: "012345", localityName: "Starts with 0" },
        { pincode: "12345", localityName: "Too short" },
        { pincode: "1234567", localityName: "Too long" },
        { pincode: "ABCDEF", localityName: "Letters" },
        { pincode: "560076", localityName: "BTM Layout" }, // Valid and new
      ],
    });
    assert(invalidBatchResult.addedCount === 1, `Added exactly 1 valid PIN (560076), got ${invalidBatchResult.addedCount}`);
    assert(invalidBatchResult.invalidPincodes.length === 4, `Identified exactly 4 invalid PIN codes, got ${invalidBatchResult.invalidPincodes.length}`);
    assert(invalidBatchResult.invalidPincodes.includes("012345"), "012345 listed in invalidPincodes");
    assert(invalidBatchResult.invalidPincodes.includes("12345"), "12345 listed in invalidPincodes");
    assert(invalidBatchResult.invalidPincodes.includes("1234567"), "1234567 listed in invalidPincodes");
    assert(invalidBatchResult.invalidPincodes.includes("ABCDEF"), "ABCDEF listed in invalidPincodes");

    // Also verify backward compatibility: string[] payload support
    const stringArrayResult = await bulkAddPincodes(labA.id, {
      pincodes: ["560078", "560085", "560078"],
    });
    assert(stringArrayResult.addedCount === 2, `string[] payload supported and imported 2 new PINs, got ${stringArrayResult.addedCount}`);
    assert(stringArrayResult.skippedCount === 1, `string[] duplicate skipped cleanly, got ${stringArrayResult.skippedCount}`);

    // ─────────────────────────────────────────────────────────────
    // 8. Lab Tenant Isolation
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 8. Lab Tenant Isolation & Security Boundaries ──");

    // 8a. Lab A cannot attach a branch belonging to Lab B
    let branchHijackError = "";
    try {
      await addPincodeCoverage(labA.id, {
        pincode: "560068",
        branchId: branchB.id, // Belong to Lab B!
      });
    } catch (err: any) {
      branchHijackError = err.message;
    }
    assert(
      branchHijackError.includes("does not belong to laboratory"),
      "Lab A blocked from attaching Lab B's branch to a service area",
      branchHijackError
    );

    // 8b. Lab A cannot delete Lab B's service area
    const betaServiceArea = await addPincodeCoverage(labB.id, {
      pincode: "560068",
      localityName: "Beta Kudlu Gate",
    });

    let crossDeleteError = "";
    try {
      await removePincodeCoverage(labA.id, betaServiceArea.id);
    } catch (err: any) {
      crossDeleteError = err.message;
    }
    assert(
      crossDeleteError.includes("Security Violation: You cannot delete service areas belonging to another laboratory"),
      "Lab A strictly prevented from deleting Lab B's service area",
      crossDeleteError
    );

    // 8c. Lab A queries do not return Lab B service areas
    const labAAreas = await getLabServiceAreas(labA.id);
    const labBAreas = await getLabServiceAreas(labB.id);

    const labAHasBetaPin = labAAreas.some((a) => a.id === betaServiceArea.id);
    const labBHasBetaPin = labBAreas.some((a) => a.id === betaServiceArea.id);
    assert(labAHasBetaPin === false, "Lab A service area list does NOT contain Lab B records");
    assert(labBHasBetaPin === true, "Lab B service area list contains its own record");

    // ─────────────────────────────────────────────────────────────
    // 9. Reloading Service-Area List After Saving
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 9. Service Area List Shape & Branch Metadata ──");
    const freshList = await getLabServiceAreas(labA.id);
    assert(freshList.length > 0, `Fresh service area list returned ${freshList.length} items`);

    const indiranagarArea = freshList.find((a) => a.pincode === "560038");
    assert(indiranagarArea !== undefined, "Found 560038 in reloaded service area list");
    assert(indiranagarArea?.localityName === "Indiranagar 100ft Road", "Reloaded item preserves localityName");
    assert(indiranagarArea?.branchId === branchA.id, "Reloaded item preserves branchId");
    assert(indiranagarArea?.branch?.name === "Alpha Indiranagar Hub", "Reloaded item includes branch.name");
    assert(indiranagarArea?.branch?.code === branchA.code, "Reloaded item includes branch.code");

    // ─────────────────────────────────────────────────────────────
    // 10. Unauthenticated & Unauthorized API Error Responses
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 10. API Route Status Codes (No HTML Redirects) ──");
    {
      // Test unauthenticated GET to /api/lab/service-areas
      const unauthGetReq = new NextRequest("http://localhost:3000/api/lab/service-areas", {
        method: "GET",
      });
      const getRes = await getServiceAreas(unauthGetReq);
      assert(getRes.status === 401, `Unauthenticated GET returns 401 JSON, got status ${getRes.status}`);
      const getData = await getRes.json();
      assert(getData.error !== undefined, "Unauthenticated GET response contains error message");

      // Test unauthenticated POST to /api/lab/service-areas
      const unauthPostReq = new NextRequest("http://localhost:3000/api/lab/service-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: "560038" }),
      });
      const postRes = await postServiceAreas(unauthPostReq);
      assert(postRes.status === 401, `Unauthenticated POST returns 401 JSON, got status ${postRes.status}`);
      const postData = await postRes.json();
      assert(postData.error !== undefined, "Unauthenticated POST response contains error message");

      // Verify no 301/302/303 redirect occurs
      assert(
        ![301, 302, 303, 307, 308].includes(postRes.status),
        "POST does NOT return any redirect status code"
      );

      // Test unauthenticated DELETE
      const unauthDelReq = new NextRequest("http://localhost:3000/api/lab/service-areas/xyz", {
        method: "DELETE",
      });
      const delRes = await deleteServiceArea(unauthDelReq, {
        params: Promise.resolve({ id: "xyz" }),
      });
      assert(delRes.status === 401, `Unauthenticated DELETE returns 401 JSON, got status ${delRes.status}`);
    }

  } finally {
    // Clean up test records
    console.log("\n── Cleaning up test data ──");
    await prisma.labServiceArea.deleteMany({
      where: { labId: { in: [labA.id, labB.id] } },
    });
    await prisma.labBranch.deleteMany({
      where: { labId: { in: [labA.id, labB.id] } },
    });
    await prisma.labStoreSettings.deleteMany({
      where: { labId: { in: [labA.id, labB.id] } },
    });
    await prisma.lab.deleteMany({
      where: { id: { in: [labA.id, labB.id] } },
    });
    console.log("Cleanup completed.");
  }

  console.log("\n==================================================================");
  console.log(`  Tests Passed: ${passedTests} / ${totalTests}`);
  console.log(`  Tests Failed: ${failedTests}`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
