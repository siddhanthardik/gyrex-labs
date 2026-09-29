/**
 * Gyrex Labs - Phase 7A Automated Verification Test Suite
 * Meta WhatsApp Business Integration (Channel & Welcome Routing)
 *
 * Verifies:
 * 1. Lab WhatsApp settings retrieval, defaults, and URL generation
 * 2. AES-256-GCM encryption of permanent access token and app secret
 * 3. Zero leakage of plain secrets in API responses
 * 4. Meta Webhook verification handshake (hub.mode=subscribe, hub.verify_token, hub.challenge)
 * 5. Cryptographic signature verification (X-Hub-Signature-256 HMAC-SHA256)
 * 6. Inbound message reception ("Hi") and automated welcome reply generation
 * 7. Action links strictly pointing to existing Gyrex patient storefronts:
 *    - Book a Test -> /[labSlug]
 *    - Health Packages -> /[labSlug]/packages
 *    - Upload Prescription -> /[labSlug]/prescription
 *    - My Orders & Reports -> /[labSlug]/reports
 *    - Call Lab -> phone number
 * 8. Multi-tenant isolation (messages & credentials strictly separated by laboratory)
 * 9. Idempotent webhook processing preventing duplicate reply loops
 * 10. Connection testing and error state reporting
 * 11. Strict non-interference: zero orders, payments, subscriptions, or catalogue modified
 */

import { prisma } from "../lib/db/prisma";
import {
  whatsAppService,
  LabWhatsAppSettings,
} from "../services/integrations/whatsapp/whatsapp-service";
import {
  verifyMetaWebhookSignature,
  decryptSecret,
} from "../lib/integrations/crypto";
import { LabStatus, AuditAction } from "@prisma/client";
import crypto from "crypto";

process.env.TEST_PAYMENT_MOCK = "true";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${passedTests}: ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${passedTests + failedTests}: ${testName}${detail ? ` - ${detail}` : ""}`);
  }
}

function createSignedMetaPayload(payloadObj: any, secret: string) {
  const rawBody = JSON.stringify(payloadObj);
  const signatureHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const signatureHeader = `sha256=${signatureHex}`;
  return { rawBody, signatureHeader };
}

async function runPhase7ATests() {
  console.log("==================================================");
  console.log("GYREX LABS — PHASE 7A TEST SUITE STARTING");
  console.log("Meta WhatsApp Business Integration & Patient Routing");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const labASlug = `wa-lab-a-${timestamp}`;
  const labBSlug = `wa-lab-b-${timestamp}`;

  let labA: any;
  let labB: any;

  // Baseline counts for non-interference checks
  let initialOrderCount = 0;
  let initialPatientPaymentCount = 0;
  let initialSubscriptionCount = 0;
  let initialTestCount = 0;
  let initialPackageCount = 0;

  const mockTokenA = "EAAG_mock_token_system_user_lab_a_123456789";
  const mockSecretA = "app_secret_meta_lab_a_987654321";
  const phoneIdA = `5948372615${timestamp.toString().slice(-4)}`;
  const wabaIdA = `1029384756${timestamp.toString().slice(-4)}`;

  const mockTokenB = "EAAG_mock_token_system_user_lab_b_987654321";
  const mockSecretB = "app_secret_meta_lab_b_123456789";
  const phoneIdB = `6948372615${timestamp.toString().slice(-4)}`;
  const wabaIdB = `2029384756${timestamp.toString().slice(-4)}`;

  try {
    initialOrderCount = await prisma.order.count();
    initialPatientPaymentCount = await prisma.patientPayment.count();
    initialSubscriptionCount = await prisma.subscription.count();
    initialTestCount = await prisma.testMaster.count();
    initialPackageCount = await prisma.package.count();

    // 1. SETUP TEST FIXTURES
    labA = await prisma.lab.create({
      data: {
        name: `Apex Diagnostics A ${timestamp}`,
        slug: labASlug,
        code: `WAA${timestamp.toString().slice(-4)}`,
        email: `apex_wa_a_${timestamp}@gyrex.test`,
        phone: "+919876500101",
        emergencyPhone: "+919876500199",
        addressLine1: "100 Apex Boulevard",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        status: LabStatus.ACTIVE,
        isVerified: true,
      },
    });

    labB = await prisma.lab.create({
      data: {
        name: `Apex Diagnostics B ${timestamp}`,
        slug: labBSlug,
        code: `WAB${timestamp.toString().slice(-4)}`,
        email: `apex_wa_b_${timestamp}@gyrex.test`,
        phone: "+919876500202",
        addressLine1: "200 Apex Boulevard",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        status: LabStatus.ACTIVE,
        isVerified: true,
      },
    });

    console.log("--- PART 1: LAB WHATSAPP SETTINGS RETRIEVAL & DEFAULTS ---");

    // Test 1: Retrieve default settings for newly created lab
    const initialSettingsA = await whatsAppService.getLabWhatsAppSettings(labA.id);
    assert(
      initialSettingsA.configured === false && initialSettingsA.status === "DISCONNECTED",
      "Initial settings for new lab are unconfigured and disconnected"
    );

    // Test 2: Generates default verify token containing slug
    assert(
      typeof initialSettingsA.webhookVerifyToken === "string" &&
        initialSettingsA.webhookVerifyToken.startsWith("gyr_wa_"),
      "Default webhook verify token generated with standard prefix"
    );

    // Test 3: Generates correct webhook URL with labId query parameter
    assert(
      initialSettingsA.webhookUrl.includes(`/api/webhooks/whatsapp?labId=${labA.id}`),
      "Webhook URL includes correct endpoint and labId query parameter"
    );

    // Test 4: Access token and app secret are never exposed in GET response
    assert(
      (initialSettingsA as any).accessToken === undefined &&
        (initialSettingsA as any).appSecret === undefined &&
        (initialSettingsA as any).accessTokenEncrypted === undefined,
      "Secrets are not exposed in client settings response"
    );

    // Test 5: Generates default preview message with laboratory name and links
    assert(
      initialSettingsA.previewMessage.includes(labA.name) &&
        initialSettingsA.previewMessage.includes(labA.slug),
      "Preview message includes laboratory name and storefront slug"
    );

    console.log("\n--- PART 2: CREDENTIAL ENCRYPTION & SECURE PERSISTENCE ---");

    // Test 6: Update WhatsApp settings for Lab A
    const savedSettingsA = await whatsAppService.updateLabWhatsAppSettings(labA.id, {
      wabaId: wabaIdA,
      phoneNumberId: phoneIdA,
      displayPhoneNumber: "+91 98765 00101",
      accessToken: mockTokenA,
      appSecret: mockSecretA,
      isEnabled: true,
    });
    assert(
      savedSettingsA.configured === true &&
        savedSettingsA.status === "CONNECTED" &&
        savedSettingsA.hasAccessToken === true &&
        savedSettingsA.hasAppSecret === true,
      "Settings successfully updated and marked as configured & connected"
    );

    // Test 7: Plain secrets NOT stored in PlatformSettings database record
    const dbRecordA = await prisma.platformSettings.findUnique({
      where: { key: `lab_whatsapp:${labA.id}` },
    });
    const dbValueA = dbRecordA?.value as Partial<LabWhatsAppSettings>;
    assert(
      dbValueA.accessTokenEncrypted !== mockTokenA &&
        dbValueA.appSecretEncrypted !== mockSecretA,
      "Plain text token and secret are NOT stored in the database"
    );

    // Test 8: Encrypted token is recoverable with AES-256-GCM decryptSecret
    const decryptedTokenA = decryptSecret(dbValueA.accessTokenEncrypted!);
    const decryptedSecretA = decryptSecret(dbValueA.appSecretEncrypted!);
    assert(
      decryptedTokenA === mockTokenA && decryptedSecretA === mockSecretA,
      "Encrypted credentials safely decrypted back to original values"
    );

    // Test 9: Update Lab B credentials independently
    await whatsAppService.updateLabWhatsAppSettings(labB.id, {
      wabaId: wabaIdB,
      phoneNumberId: phoneIdB,
      displayPhoneNumber: "+91 98765 00202",
      accessToken: mockTokenB,
      appSecret: mockSecretB,
      isEnabled: true,
    });
    const dbRecordB = await prisma.platformSettings.findUnique({
      where: { key: `lab_whatsapp:${labB.id}` },
    });
    const dbValueB = dbRecordB?.value as Partial<LabWhatsAppSettings>;
    assert(
      dbValueB.phoneNumberId === phoneIdB && dbValueB.wabaId === wabaIdB,
      "Lab B credentials successfully saved independently"
    );

    // Test 10: Preserves existing encrypted secrets if omitted in update
    const updateWithoutSecret = await whatsAppService.updateLabWhatsAppSettings(labA.id, {
      displayPhoneNumber: "+91 98765 00199",
      // omitting accessToken and appSecret
    });
    const dbRecordAfterPartial = await prisma.platformSettings.findUnique({
      where: { key: `lab_whatsapp:${labA.id}` },
    });
    const valAfterPartial = dbRecordAfterPartial?.value as Partial<LabWhatsAppSettings>;
    assert(
      updateWithoutSecret.hasAccessToken === true &&
        updateWithoutSecret.hasAppSecret === true &&
        decryptSecret(valAfterPartial.accessTokenEncrypted!) === mockTokenA,
      "Existing encrypted secrets are preserved when omitted in partial update"
    );

    // Test 11: Audit log recorded on settings update
    const auditLogs = await prisma.auditLog.findMany({
      where: { labId: labA.id, entityType: "LabWhatsAppSettings" },
    });
    assert(auditLogs.length >= 1, "Audit log recorded for WhatsApp settings update");

    console.log("\n--- PART 3: WEBHOOK VERIFICATION HANDSHAKE (GET) ---");

    // Test 12: Handshake succeeds with valid token and returns challenge
    const testChallenge = "challenge_12345_random_string";
    const handshakeResult = await whatsAppService.verifyWebhookHandshake(
      savedSettingsA.webhookVerifyToken,
      testChallenge,
      labA.id
    );
    assert(
      handshakeResult === testChallenge,
      "Webhook handshake succeeds with valid token and returns challenge string"
    );

    // Test 13: Handshake fails with invalid verify token
    const invalidHandshake = await whatsAppService.verifyWebhookHandshake(
      "wrong_verify_token_999",
      testChallenge,
      labA.id
    );
    assert(invalidHandshake === null, "Webhook handshake fails with invalid verify token");

    // Test 14: Handshake fails with empty verify token or challenge
    const emptyHandshake = await whatsAppService.verifyWebhookHandshake("", "", labA.id);
    assert(emptyHandshake === null, "Webhook handshake fails with empty verify token or challenge");

    // Test 15: Cross-tenant handshake: Token for Lab A fails when queried with Lab B's labId
    const crossTenantHandshake = await whatsAppService.verifyWebhookHandshake(
      savedSettingsA.webhookVerifyToken,
      testChallenge,
      labB.id // Passing Lab B's id with Lab A's token
    );
    assert(
      crossTenantHandshake === null,
      "Cross-tenant webhook handshake is blocked when token does not match target lab"
    );

    // Test 16: Handshake succeeds without labId query parameter by auto-matching registered tokens
    const autoMatchHandshake = await whatsAppService.verifyWebhookHandshake(
      savedSettingsA.webhookVerifyToken,
      testChallenge
    );
    assert(
      autoMatchHandshake === testChallenge,
      "Webhook handshake succeeds by finding matching token in registered lab settings"
    );

    console.log("\n--- PART 4: CRYPTOGRAPHIC SIGNATURE VERIFICATION (X-Hub-Signature-256) ---");

    const samplePayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wabaIdA,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+91 98765 00101",
                  phone_number_id: phoneIdA,
                },
                contacts: [{ profile: { name: "Hardik" }, wa_id: "919876543210" }],
                messages: [
                  {
                    from: "919876543210",
                    id: `wamid.test.${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: { body: "Hi" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    // Test 17: Valid HMAC-SHA256 signature passes verification
    const { rawBody: validRawBody, signatureHeader: validSigHeader } = createSignedMetaPayload(
      samplePayload,
      mockSecretA
    );
    const isSigValid = verifyMetaWebhookSignature(validRawBody, validSigHeader, mockSecretA);
    assert(isSigValid === true, "Valid HMAC-SHA256 X-Hub-Signature-256 passes verification");

    // Test 18: Signature verification fails if payload body is tampered
    const tamperedBody = validRawBody.replace("Hi", "Hacked");
    const isTamperedValid = verifyMetaWebhookSignature(tamperedBody, validSigHeader, mockSecretA);
    assert(isTamperedValid === false, "Tampered payload body fails signature verification");

    // Test 19: Signature verification fails if wrong secret is used
    const isWrongSecretValid = verifyMetaWebhookSignature(validRawBody, validSigHeader, "wrong_secret");
    assert(isWrongSecretValid === false, "Signature fails when tested against incorrect secret");

    // Test 20: Inbound webhook rejects invalid signature and throws error
    let invalidSigError: any = null;
    try {
      await whatsAppService.handleInboundWebhook(validRawBody, "sha256=invalid_hex_signature_12345", labA.id);
    } catch (e: any) {
      invalidSigError = e;
    }
    assert(
      invalidSigError !== null && invalidSigError.message.includes("signature"),
      "handleInboundWebhook rejects invalid signature with error"
    );

    // Test 21: SECURITY_ALERT audit log recorded on invalid webhook signature
    const sigAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: "WHATSAPP_WEBHOOK",
        action: AuditAction.SECURITY_ALERT,
        labId: labA.id,
      },
    });
    assert(sigAudit !== null, "SECURITY_ALERT audit log recorded on signature verification failure");

    console.log("\n--- PART 5: INBOUND MESSAGE RECEPTION & WELCOME ROUTING ---");

    // Test 22: Valid inbound message triggers welcome reply
    const inboundMessageId = `wamid.msg.${Date.now()}_1`;
    const inboundPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wabaIdA,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+91 98765 00101",
                  phone_number_id: phoneIdA,
                },
                contacts: [{ profile: { name: "Hardik" }, wa_id: "919876543210" }],
                messages: [
                  {
                    from: "919876543210",
                    id: inboundMessageId,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: { body: "Hi" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const signedInbound = createSignedMetaPayload(inboundPayload, mockSecretA);
    const inboundResult = await whatsAppService.handleInboundWebhook(
      signedInbound.rawBody,
      signedInbound.signatureHeader,
      labA.id
    );
    assert(
      inboundResult.handled === true &&
        inboundResult.eventType === "WELCOME_REPLY_SENT" &&
        inboundResult.replySent === true,
      "Inbound 'Hi' message triggers automated welcome reply dispatch"
    );

    // Test 23: Welcome message generator contains laboratory name
    const welcomeMsg = whatsAppService.generateWelcomeMessage({
      labName: labA.name,
      labSlug: labA.slug,
      labPhone: labA.phone,
      patientName: "Hardik",
      baseUrl: "https://labs.gyrex.in",
    });
    assert(welcomeMsg.includes(`*${labA.name}*`), "Welcome message highlights laboratory name in bold");

    // Test 24: Welcome message contains Book a Test link
    assert(
      welcomeMsg.includes(`https://labs.gyrex.in/${labA.slug}`),
      "Welcome message contains direct Book a Test link to lab Order Page"
    );

    // Test 25: Welcome message contains Health Packages link
    assert(
      welcomeMsg.includes(`https://labs.gyrex.in/${labA.slug}/packages`),
      "Welcome message contains direct link to Health Packages"
    );

    // Test 26: Welcome message contains Upload Prescription link
    assert(
      welcomeMsg.includes(`https://labs.gyrex.in/${labA.slug}/prescription`),
      "Welcome message contains direct link to Prescription Upload"
    );

    // Test 27: Welcome message contains My Orders & Reports link
    assert(
      welcomeMsg.includes(`https://labs.gyrex.in/${labA.slug}/reports`),
      "Welcome message contains direct link to Patient Orders & Reports"
    );

    // Test 28: Welcome message contains lab contact phone
    assert(
      welcomeMsg.includes(labA.phone),
      "Welcome message includes laboratory contact phone"
    );

    // Test 29: Personalized greeting when patient profile name is present
    assert(
      welcomeMsg.startsWith("Hello Hardik! 👋"),
      "Welcome message includes personalized patient name greeting"
    );

    // Test 30: Custom welcome message override works with template tags
    const customTemplate = "Welcome to {{lab_name}}! Book at {{store_url}}. Call {{lab_phone}}.";
    const customResult = whatsAppService.generateWelcomeMessage({
      labName: labA.name,
      labSlug: labA.slug,
      labPhone: labA.phone,
      customMessage: customTemplate,
      baseUrl: "https://labs.gyrex.in",
    });
    assert(
      customResult === `Welcome to ${labA.name}! Book at https://labs.gyrex.in/${labA.slug}. Call ${labA.phone}.`,
      "Custom welcome message correctly interpolates template placeholders"
    );

    console.log("\n--- PART 6: MULTI-TENANT ISOLATION & ROUTING ---");

    // Test 31: Inbound message to Lab B's phone ID resolves to Lab B
    const inboundMessageIdB = `wamid.test.b.${Date.now()}`;
    const payloadB = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wabaIdB,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+91 98765 00202",
                  phone_number_id: phoneIdB,
                },
                contacts: [{ profile: { name: "Rohan" }, wa_id: "919876549999" }],
                messages: [
                  {
                    from: "919876549999",
                    id: inboundMessageIdB,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: { body: "Hello" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const signedB = createSignedMetaPayload(payloadB, mockSecretB);
    const resolvedTenantB = await whatsAppService.resolveLabFromInbound(payloadB);
    assert(
      resolvedTenantB?.lab?.id === labB.id && resolvedTenantB?.settings?.phoneNumberId === phoneIdB,
      "Inbound payload automatically resolves to Lab B based on phone_number_id"
    );

    // Test 32: Inbound webhook to Lab B returns reply with Lab B storefront links
    const resultB = await whatsAppService.handleInboundWebhook(signedB.rawBody, signedB.signatureHeader, labB.id);
    assert(
      resultB.handled === true && resultB.eventType === "WELCOME_REPLY_SENT",
      "Lab B webhook processes successfully with Lab B credentials"
    );

    // Test 33: Multi-tenant: Lab A settings are completely distinct from Lab B
    const settingsA = await whatsAppService.getLabWhatsAppSettings(labA.id);
    const settingsB = await whatsAppService.getLabWhatsAppSettings(labB.id);
    assert(
      settingsA.phoneNumberId !== settingsB.phoneNumberId &&
        settingsA.wabaId !== settingsB.wabaId &&
        settingsA.webhookVerifyToken !== settingsB.webhookVerifyToken,
      "Lab A and Lab B have completely distinct credentials and verify tokens"
    );

    // Test 34: Lab A webhook cannot be verified using Lab B's secret
    const signedWithSecretB = createSignedMetaPayload(samplePayload, mockSecretB);
    let crossSecretErr: any = null;
    try {
      await whatsAppService.handleInboundWebhook(signedWithSecretB.rawBody, signedWithSecretB.signatureHeader, labA.id);
    } catch (e: any) {
      crossSecretErr = e;
    }
    assert(
      crossSecretErr !== null,
      "Cross-tenant signature verification blocked: Lab B secret cannot sign Lab A webhook"
    );

    // Test 35: Disabling channel for a lab stops automated replies
    await whatsAppService.updateLabWhatsAppSettings(labA.id, { isEnabled: false });
    const disabledPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wabaIdA,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: phoneIdA },
                messages: [
                  {
                    from: "919876543210",
                    id: `wamid.disabled.${Date.now()}`,
                    type: "text",
                    text: { body: "Hi" },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const signedDisabled = createSignedMetaPayload(disabledPayload, mockSecretA);
    const disabledResult = await whatsAppService.handleInboundWebhook(signedDisabled.rawBody, signedDisabled.signatureHeader, labA.id);
    assert(
      disabledResult.handled === true &&
        disabledResult.eventType === "CHANNEL_DISABLED" &&
        disabledResult.replySent === false,
      "Disabled WhatsApp channel acknowledges webhook without sending automated replies"
    );
    // Re-enable channel
    await whatsAppService.updateLabWhatsAppSettings(labA.id, { isEnabled: true });

    // Test 36: Status delivery events (SENT, DELIVERED, READ) are acknowledged without replying
    const statusPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wabaIdA,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: phoneIdA },
                statuses: [{ id: "wamid.sent.1", status: "delivered", timestamp: "1712345678" }],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const signedStatus = createSignedMetaPayload(statusPayload, mockSecretA);
    const statusResult = await whatsAppService.handleInboundWebhook(signedStatus.rawBody, signedStatus.signatureHeader, labA.id);
    assert(
      statusResult.handled === true && statusResult.eventType === "STATUS_DELIVERED",
      "Status events (delivered/read) are handled and acknowledged safely"
    );

    console.log("\n--- PART 7: IDEMPOTENCY & DUPLICATE DEDUPLICATION ---");

    // Test 37: Repeated webhook with same messageId is acknowledged idempotently
    const duplicateMessageId = `wamid.duplicate.test.${Date.now()}`;
    const firstDeliveryPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wabaIdA,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: phoneIdA },
                messages: [{ from: "919876543210", id: duplicateMessageId, type: "text", text: { body: "Hi" } }],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const signedDelivery1 = createSignedMetaPayload(firstDeliveryPayload, mockSecretA);
    const res1 = await whatsAppService.handleInboundWebhook(signedDelivery1.rawBody, signedDelivery1.signatureHeader, labA.id);
    assert(
      res1.handled === true && res1.eventType === "WELCOME_REPLY_SENT",
      "First delivery of messageId sends welcome reply"
    );

    // Test 38: Second delivery of identical messageId is acknowledged without second reply
    const res2 = await whatsAppService.handleInboundWebhook(signedDelivery1.rawBody, signedDelivery1.signatureHeader, labA.id);
    assert(
      res2.handled === true &&
        res2.eventType === "DUPLICATE_MESSAGE_ACKNOWLEDGED" &&
        res2.replySent === false,
      "Duplicate webhook delivery of identical messageId acknowledged without duplicate reply"
    );

    // Test 39: Third delivery continues to be safely ignored
    const res3 = await whatsAppService.handleInboundWebhook(signedDelivery1.rawBody, signedDelivery1.signatureHeader, labA.id);
    assert(
      res3.handled === true && res3.eventType === "DUPLICATE_MESSAGE_ACKNOWLEDGED",
      "Subsequent webhook retries remain safe and idempotent"
    );

    // Test 40: A different messageId from same sender receives reply
    const newMsgId = `wamid.new.${Date.now()}`;
    firstDeliveryPayload.entry[0].changes[0].value.messages[0].id = newMsgId;
    const signedDeliveryNew = createSignedMetaPayload(firstDeliveryPayload, mockSecretA);
    const resNew = await whatsAppService.handleInboundWebhook(signedDeliveryNew.rawBody, signedDeliveryNew.signatureHeader, labA.id);
    assert(
      resNew.handled === true && resNew.eventType === "WELCOME_REPLY_SENT",
      "New distinct messageId from same sender receives prompt reply"
    );

    console.log("\n--- PART 8: CONNECTION TESTING & ERROR REPORTING ---");

    // Test 41: testLabWhatsAppConnection succeeds for configured lab in mock mode
    const testConnA = await whatsAppService.testLabWhatsAppConnection(labA.id);
    assert(
      testConnA.success === true && testConnA.message.includes("verified"),
      "testLabWhatsAppConnection succeeds and returns verified details"
    );

    // Test 42: testLabWhatsAppConnection updates lastVerifiedAt in database
    const settingsAfterTest = await whatsAppService.getLabWhatsAppSettings(labA.id);
    assert(
      settingsAfterTest.lastVerifiedAt !== null && settingsAfterTest.status === "CONNECTED",
      "lastVerifiedAt timestamp persisted in database following successful test"
    );

    // Test 43: Unconfigured lab fails connection test with descriptive error
    const unconfiguredLab = await prisma.lab.create({
      data: {
        name: `Unconfigured Lab ${timestamp}`,
        slug: `unconf-lab-${timestamp}`,
        code: `UNC${timestamp.toString().slice(-4)}`,
        email: `unconf_${timestamp}@gyrex.test`,
        phone: "+919876500303",
        addressLine1: "300 Apex Boulevard",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        status: LabStatus.ACTIVE,
        isVerified: true,
      },
    });
    const testUnconf = await whatsAppService.testLabWhatsAppConnection(unconfiguredLab.id);
    assert(
      testUnconf.success === false && testUnconf.message.includes("incomplete"),
      "Unconfigured lab fails connection test with helpful guidance"
    );

    // Test 44: Cleanup unconfigured lab fixture
    await prisma.platformSettings.deleteMany({ where: { key: `lab_whatsapp:${unconfiguredLab.id}` } });
    await prisma.lab.delete({ where: { id: unconfiguredLab.id } });
    assert(true, "Temporary test lab cleaned up safely");

    // Test 45: API response format conforms to SafeLabWhatsAppResponse schema
    assert(
      typeof settingsA.webhookUrl === "string" &&
        typeof settingsA.webhookVerifyToken === "string" &&
        typeof settingsA.previewMessage === "string" &&
        typeof settingsA.hasAccessToken === "boolean" &&
        typeof settingsA.hasAppSecret === "boolean",
      "SafeLabWhatsAppResponse schema fields fully validated"
    );

    console.log("\n--- PART 9: NON-INTERFERENCE & CORE STABILITY ---");

    // Test 46: Zero patient orders created
    const finalOrderCount = await prisma.order.count();
    assert(
      finalOrderCount === initialOrderCount,
      `Zero patient orders created during WhatsApp operations (${finalOrderCount} === ${initialOrderCount})`
    );

    // Test 47: Zero patient payments created
    const finalPaymentCount = await prisma.patientPayment.count();
    assert(
      finalPaymentCount === initialPatientPaymentCount,
      `Zero patient payments created during WhatsApp operations (${finalPaymentCount} === ${initialPatientPaymentCount})`
    );

    // Test 48: Zero subscription records created
    const finalSubCount = await prisma.subscription.count();
    assert(
      finalSubCount === initialSubscriptionCount,
      `Zero platform subscriptions created during WhatsApp operations (${finalSubCount} === ${initialSubscriptionCount})`
    );

    // Test 49: Catalogue test count remains identical
    const finalTestCount = await prisma.testMaster.count();
    assert(
      finalTestCount === initialTestCount,
      `Catalogue tests foundation remains completely unchanged (${finalTestCount} === ${initialTestCount})`
    );

    // Test 50: Health packages count remains identical
    const finalPackageCount = await prisma.package.count();
    assert(
      finalPackageCount === initialPackageCount,
      `Health packages foundation remains completely unchanged (${finalPackageCount} === ${initialPackageCount})`
    );

  } catch (err) {
    console.error("Critical test execution error:", err);
    failedTests++;
  } finally {
    // CLEANUP FIXTURES
    console.log("\n--- CLEANING UP TEST FIXTURES ---");
    try {
      if (labA) {
        await prisma.platformSettings.deleteMany({ where: { key: `lab_whatsapp:${labA.id}` } });
        await prisma.auditLog.deleteMany({ where: { labId: labA.id } });
        await prisma.lab.deleteMany({ where: { id: labA.id } });
      }
      if (labB) {
        await prisma.platformSettings.deleteMany({ where: { key: `lab_whatsapp:${labB.id}` } });
        await prisma.auditLog.deleteMany({ where: { labId: labB.id } });
        await prisma.lab.deleteMany({ where: { id: labB.id } });
      }
      console.log("Cleanup completed successfully.");
    } catch (cleanupErr) {
      console.warn("Cleanup encountered non-fatal error:", cleanupErr);
    }
  }

  console.log("\n==================================================");
  console.log(`PHASE 7A TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase7ATests();
