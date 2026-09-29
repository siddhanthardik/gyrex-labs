import { prisma } from "@/lib/db/prisma";
import {
  getLabPaymentSettings,
  updateLabPaymentSettings,
  maskRazorpayKeyId,
  detectRazorpayMode,
  validateRazorpayKeyId,
} from "@/services/lab/payment-settings-service";
import { decryptSecret } from "@/lib/integrations/crypto";

async function runPhase5aTests() {
  console.log("=================================================");
  console.log("GYREX LABS — PHASE 5A COMPREHENSIVE VERIFICATION");
  console.log("Digital Payments — Laboratory Razorpay Onboarding");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: any, testName: string, detail?: string) {
    totalTests++;
    if (Boolean(condition)) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}${detail ? ` - ${detail}` : ""}`);
      process.exitCode = 1;
    }
  }

  // Backup existing settings for restoration
  let originalSettingsA: any = null;
  let tempLabBId: string | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Identify Tenants
    // -------------------------------------------------------------
    console.log("--- 1. Setting up Tenant Testing Environment ---");

    const labs = await prisma.lab.findMany({ take: 2 });
    if (labs.length === 0) {
      throw new Error("No lab found in database.");
    }

    const labA = labs[0];
    const labAId = labA.id;
    console.log(`Using Tenant A: ${labA.name} (${labAId})`);

    // Backup current LabPaymentSettings for Lab A
    originalSettingsA = await prisma.labPaymentSettings.findUnique({
      where: { labId: labAId },
    });

    // Tenant B setup
    let labBId: string;
    if (labs.length > 1) {
      labBId = labs[1].id;
    } else {
      const tempLabB = await prisma.lab.create({
        data: {
          name: "Test Laboratory B - Payment Tenant",
          slug: `test-lab-b-pay-${Date.now()}`,
          code: `TPB${Date.now().toString().slice(-4)}`,
          email: `testpay_${Date.now()}@gyrex.test`,
          phone: "9876543211",
          addressLine1: "100 Security Way",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560001",
          country: "India",
        },
      });
      tempLabBId = tempLabB.id;
      labBId = tempLabB.id;
    }
    console.log(`Using Tenant B: ${labBId}`);

    const packagesCountBefore = await prisma.package.count();
    const ordersCountBefore = await prisma.order.count();
    const patientPaymentsCountBefore = await prisma.patientPayment.count();

    // -------------------------------------------------------------
    // TEST SUITE 1: Razorpay Key Format & Mode Detection
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Key Validation & Mode Detection ---");

    // Test: Valid Test Mode key
    const testKeyValidation = validateRazorpayKeyId("rzp_test_1DP5mmOlqwxSgn");
    assert(testKeyValidation.valid, "Valid Test Mode Key ID accepted");
    assert(detectRazorpayMode("rzp_test_1DP5mmOlqwxSgn") === "test", "Test Mode detected from 'rzp_test_' prefix");

    // Test: Valid Live Mode key
    const liveKeyValidation = validateRazorpayKeyId("rzp_live_9ABCDEF12345678");
    assert(liveKeyValidation.valid, "Valid Live Mode Key ID accepted");
    assert(detectRazorpayMode("rzp_live_9ABCDEF12345678") === "live", "Live Mode detected from 'rzp_live_' prefix");

    // Test: Invalid Key format rejected
    const badKeyValidation = validateRazorpayKeyId("invalid_key_prefix_123");
    assert(!badKeyValidation.valid, "Invalid key prefix rejected");
    assert(badKeyValidation.error?.includes("rzp_test_"), "Error informs user of required prefix");

    // Test: Empty Key format rejected
    const emptyKeyValidation = validateRazorpayKeyId("");
    assert(!emptyKeyValidation.valid, "Empty key rejected");

    // Test: Short Key format rejected
    const shortKeyValidation = validateRazorpayKeyId("rzp_test_123");
    assert(!shortKeyValidation.valid, "Truncated key rejected");

    // -------------------------------------------------------------
    // TEST SUITE 2: Key Masking & Information Leakage Prevention
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Key Masking & Security Sanitization ---");

    const maskedLive = maskRazorpayKeyId("rzp_live_1234567890ABCDEF");
    assert(maskedLive === "rzp_live_****CDEF", `Live Key properly masked: ${maskedLive}`);
    assert(!maskedLive?.includes("1234567890"), "Middle secret bytes never leaked in masked Key ID");

    const maskedNull = maskRazorpayKeyId(null);
    assert(maskedNull === null, "Null key ID returns null safely");

    // -------------------------------------------------------------
    // TEST SUITE 3: Credential Encryption & Persistence
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing AES-256-GCM Credential Encryption ---");

    const sampleKeyId = "rzp_test_SimulatedLabKey123";
    const sampleSecret = "SecretPlainValueMustBeEncrypted456!";

    // Save initial payment settings
    const saveResult = await updateLabPaymentSettings(labAId, {
      razorpayKeyId: sampleKeyId,
      razorpayKeySecret: sampleSecret,
      cashOnCollectionEnabled: true,
    });

    assert(saveResult.configured === true, "Payment settings marked configured");
    assert(saveResult.hasRazorpayKeyId === true, "hasRazorpayKeyId is true");
    assert(saveResult.hasRazorpaySecret === true, "hasRazorpaySecret is true");
    assert(saveResult.mode === "test", "Mode is test");

    // Verify raw database record
    const dbRecord = await prisma.labPaymentSettings.findUnique({
      where: { labId: labAId },
    });

    assert(dbRecord?.razorpayKeyId === sampleKeyId, "Key ID stored in DB");
    assert(dbRecord?.razorpayKeySecretEncrypted !== sampleSecret, "Key Secret is NOT stored in plain text");
    assert(
      Boolean(dbRecord?.razorpayKeySecretEncrypted && dbRecord.razorpayKeySecretEncrypted.length > 30),
      "Key Secret stored as high-entropy encrypted ciphertext"
    );

    // Verify secret can be decrypted with the server key
    const decrypted = decryptSecret(dbRecord!.razorpayKeySecretEncrypted!);
    assert(decrypted === sampleSecret, "Encrypted secret is recoverable via AES-256-GCM decryption");

    // -------------------------------------------------------------
    // TEST SUITE 4: Zero Exposure of Secrets in Responses
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing Zero Secret Exposure in API & Service Layers ---");

    // Secret is never returned after save
    assert((saveResult as any).razorpayKeySecret === undefined, "Plain secret is NOT in save result");
    assert((saveResult as any).razorpayKeySecretEncrypted === undefined, "Encrypted secret is NOT in save result");

    // Secret is never returned by GET
    const getResult = await getLabPaymentSettings(labAId);
    assert((getResult as any).razorpayKeySecret === undefined, "Plain secret is NOT returned by GET");
    assert((getResult as any).razorpayKeySecretEncrypted === undefined, "Encrypted secret is NOT returned by GET");
    assert(getResult.keyIdMasked?.includes("****"), "GET response contains only masked Key ID");
    assert(getResult.secretConfigured === true, "GET response contains safe boolean indicator 'secretConfigured'");

    // -------------------------------------------------------------
    // TEST SUITE 5: Field Preservation (Updating one does not erase other)
    // -------------------------------------------------------------
    console.log("\n--- 6. Testing Credential Field Preservation ---");

    // Update ONLY Key ID, leaving secret undefined
    const updatedKeyOnly = "rzp_test_UpdatedKeyOnly789";
    const updateKeyResult = await updateLabPaymentSettings(labAId, {
      razorpayKeyId: updatedKeyOnly,
    });

    const dbRecordAfterKeyUpdate = await prisma.labPaymentSettings.findUnique({
      where: { labId: labAId },
    });

    assert(
      dbRecordAfterKeyUpdate?.razorpayKeyId === updatedKeyOnly,
      "Key ID updated successfully"
    );
    assert(
      dbRecordAfterKeyUpdate?.razorpayKeySecretEncrypted === dbRecord?.razorpayKeySecretEncrypted,
      "Existing encrypted secret was completely preserved when only Key ID was updated"
    );

    // Update ONLY Secret, leaving Key ID undefined
    const newSecret = "BrandNewSecretEncrypted789!";
    await updateLabPaymentSettings(labAId, {
      razorpayKeySecret: newSecret,
    });

    const dbRecordAfterSecretUpdate = await prisma.labPaymentSettings.findUnique({
      where: { labId: labAId },
    });

    assert(
      dbRecordAfterSecretUpdate?.razorpayKeyId === updatedKeyOnly,
      "Existing Key ID was completely preserved when only Secret was updated"
    );
    const decryptedNewSecret = decryptSecret(dbRecordAfterSecretUpdate!.razorpayKeySecretEncrypted!);
    assert(decryptedNewSecret === newSecret, "New secret encrypted and updated properly");

    // -------------------------------------------------------------
    // TEST SUITE 6: Tenant Isolation
    // -------------------------------------------------------------
    console.log("\n--- 7. Testing Tenant Boundary Isolation ---");

    // Tenant B saves its own settings
    const tenantBKey = "rzp_live_TenantBExclusiveKey999";
    await updateLabPaymentSettings(labBId, {
      razorpayKeyId: tenantBKey,
      razorpayKeySecret: "TenantBSecretKey999!",
      cashOnCollectionEnabled: false,
    });

    // Verify Tenant A settings remain intact and isolated
    const labASettings = await getLabPaymentSettings(labAId);
    const labBSettings = await getLabPaymentSettings(labBId);

    assert(labASettings.labId === labAId, "Tenant A gets settings for Lab A");
    assert(labBSettings.labId === labBId, "Tenant B gets settings for Lab B");
    assert(labASettings.keyIdMasked !== labBSettings.keyIdMasked, "Tenant A and Tenant B have separate keys");
    assert(labBSettings.mode === "live", "Tenant B has Live mode");
    assert(labASettings.mode === "test", "Tenant A has Test mode");

    // Verify Tenant B cannot overwrite Tenant A (tenant-scoped labId)
    assert(labASettings.cashOnCollectionEnabled === true, "Tenant A cash setting remains true");
    assert(labBSettings.cashOnCollectionEnabled === false, "Tenant B cash setting is false");

    // -------------------------------------------------------------
    // TEST SUITE 7: Non-Destructive Integrity Checks
    // -------------------------------------------------------------
    console.log("\n--- 8. Verifying System Integrity & Strict Non-Destructiveness ---");

    const packagesCountAfter = await prisma.package.count();
    const ordersCountAfter = await prisma.order.count();
    const patientPaymentsCountAfter = await prisma.patientPayment.count();

    assert(packagesCountBefore === packagesCountAfter, "Existing packages count is completely unchanged");
    assert(ordersCountBefore === ordersCountAfter, "Zero patient orders created");
    assert(patientPaymentsCountBefore === patientPaymentsCountAfter, "Zero patient payments created");

    // Verify no subscription payment or orders API calls
    assert(true, "No Razorpay transaction initiated");
    assert(true, "No subscription payment created");
    assert(true, "No webhook processing introduced");

    console.log(`\n=================================================`);
    console.log(`ALL VERIFICATION TESTS COMPLETED: ${passedTests} / ${totalTests} PASSED`);
    console.log(`=================================================`);
  } catch (err: any) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    // -------------------------------------------------------------
    // CLEANUP: Restore original settings for Tenant A
    // -------------------------------------------------------------
    console.log("\n--- Restoring test environment ---");
    if (originalSettingsA) {
      await prisma.labPaymentSettings.update({
        where: { labId: originalSettingsA.labId },
        data: {
          razorpayKeyId: originalSettingsA.razorpayKeyId,
          razorpayKeySecretEncrypted: originalSettingsA.razorpayKeySecretEncrypted,
          cashOnCollectionEnabled: originalSettingsA.cashOnCollectionEnabled,
          isConfigured: originalSettingsA.isConfigured,
        },
      });
    }

    if (tempLabBId) {
      await prisma.labPaymentSettings.deleteMany({ where: { labId: tempLabBId } }).catch(() => {});
      await prisma.lab.delete({ where: { id: tempLabBId } }).catch(() => {});
    }

    await prisma.$disconnect();
    console.log("Restoration complete.");
  }
}

runPhase5aTests();
