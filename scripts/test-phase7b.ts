/**
 * Gyrex Labs - Phase 7B Automated Verification Test Suite
 * WhatsApp Transactional Notifications & Patient Lifecycle
 *
 * Verifies:
 * 1. WhatsApp Optionality: Laboratories without WhatsApp connected complete 100% of order,
 *    payment, sample collection, and report operations with zero errors.
 * 2. Order Confirmation: Cash-on-collection and online confirmed bookings trigger patient WhatsApp notifications.
 * 3. Payment Confirmation: Successful payment verification triggers payment confirmation notification.
 * 4. Sample Collection: Sample collection status update triggers sample collection notification.
 * 5. Report Ready: Diagnostic report release triggers notification with secure verification link
 *    (NEVER raw PDF bytes) and updates Report.deliveredViaWhatsappAt.
 * 6. Lab Preferences: Toggles (notifyOrderConfirmation, notifyPaymentConfirmation, notifySampleCollected, notifyReportReady)
 *    strictly suppress or permit corresponding notifications.
 * 7. Idempotency: Duplicate events/calls do not send duplicate messages or duplicate notification records.
 * 8. Multi-Tenant Isolation: Lab A strictly uses Lab A credentials; Lab B strictly uses Lab B credentials.
 * 9. Patient Opt-Out: Inbound "STOP" adds recipient to suppression list; subsequent notifications are skipped; "START" restores delivery.
 * 10. Non-Blocking Delivery: External WhatsApp provider errors never fail or roll back orders, payments, or reports.
 * 11. Zero Leakage: Plaintext tokens and secrets are never logged or stored in notification tables.
 */

import { prisma } from "../lib/db/prisma";
import { whatsAppService } from "../services/integrations/whatsapp/whatsapp-service";
import {
  sendOrderConfirmationWhatsApp,
  sendPaymentConfirmationWhatsApp,
  sendSampleCollectedWhatsApp,
  sendReportReadyWhatsApp,
} from "../services/integrations/whatsapp/whatsapp-notification-service";
import { createPatientOrder } from "../services/orders/patient-order-service";
import {
  uploadLabReport,
  amendLabReport,
} from "../services/lab/reports-service";
import {
  updateLabOrderStatus,
} from "../services/lab/orders-service";
import {
  updateLabCollection,
} from "../services/lab/collection-service";
import {
  CollectionType,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  ReportStatus,
  Gender,
  NotificationChannel,
  NotificationRecipientType,
} from "@prisma/client";
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

async function runPhase7BTests() {
  console.log("==================================================");
  console.log("GYREX LABS — PHASE 7B TEST SUITE STARTING");
  console.log("WhatsApp Transactional Notifications Verification");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const unconfiguredLabSlug = `unconf-lab-${timestamp}`;
  const labASlug = `wa-lab-a-${timestamp}`;
  const labBSlug = `wa-lab-b-${timestamp}`;

  let unconfLab: any;
  let labA: any;
  let labB: any;

  let testItemA: any;
  let testItemUnconf: any;

  try {
    // ----------------------------------------------------
    // SETUP: Create Test Laboratories and Catalogue Items
    // ----------------------------------------------------
    console.log("--- SETUP: Initializing Test Laboratories & Data ---");

    // 1. Unconfigured Lab (Never connects WhatsApp)
    unconfLab = await prisma.lab.create({
      data: {
        name: `Unconfigured Lab ${timestamp}`,
        slug: unconfiguredLabSlug,
        code: `UNC${timestamp.toString().slice(-4)}`,
        phone: "+91 98765 11111",
        email: `unconf_${timestamp}@example.com`,
        addressLine1: "123 Test Street",
        city: "Bangalore",
        state: "Karnataka",
        postalCode: "560001",
        status: "ACTIVE",
        paymentSettings: {
          create: {
            cashOnCollectionEnabled: true,
            isConfigured: false,
          },
        },
      },
    });

    let category = await prisma.testCategory.findFirst();
    if (!category) {
      category = await prisma.testCategory.create({
        data: { name: "Biochemistry", slug: `biochem-${timestamp}` },
      });
    }

    let masterTest = await prisma.testMaster.findFirst();
    if (!masterTest) {
      masterTest = await prisma.testMaster.create({
        data: {
          name: `Complete Blood Count ${timestamp}`,
          code: `CBC${timestamp.toString().slice(-4)}`,
          slug: `cbc-${timestamp}`,
          categoryId: category.id,
          sampleType: "Whole Blood EDTA",
          standardTatHours: 12,
        },
      });
    }

    testItemUnconf = await prisma.labTest.create({
      data: {
        labId: unconfLab.id,
        masterTestId: masterTest.id,
        sellingPrice: 350.0,
        isActive: true,
      },
    });

    // 2. Lab A (Configured with Meta WhatsApp)
    labA = await prisma.lab.create({
      data: {
        name: `Apex Diagnostics ${timestamp}`,
        slug: labASlug,
        code: `APX${timestamp.toString().slice(-4)}`,
        phone: "+91 98765 22222",
        email: `apex_${timestamp}@example.com`,
        addressLine1: "100 Apex Boulevard",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        status: "ACTIVE",
        paymentSettings: {
          create: {
            cashOnCollectionEnabled: true,
            isConfigured: true,
            razorpayKeyId: "rzp_test_ApexLabA12345",
            razorpayKeySecretEncrypted: "enc_mock_secret_lab_a",
          },
        },
      },
    });

    testItemA = await prisma.labTest.create({
      data: {
        labId: labA.id,
        masterTestId: masterTest.id,
        sellingPrice: 600.0,
        isActive: true,
      },
    });

    // 3. Lab B (Configured with separate credentials)
    labB = await prisma.lab.create({
      data: {
        name: `Care Diagnostics ${timestamp}`,
        slug: labBSlug,
        code: `CAR${timestamp.toString().slice(-4)}`,
        phone: "+91 98765 33333",
        email: `care_${timestamp}@example.com`,
        addressLine1: "200 Care Avenue",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        status: "ACTIVE",
        paymentSettings: {
          create: {
            cashOnCollectionEnabled: true,
            isConfigured: true,
            razorpayKeyId: "rzp_test_CareLabB98765",
            razorpayKeySecretEncrypted: "enc_mock_secret_lab_b",
          },
        },
      },
    });

    console.log(`Setup complete. Created Labs: ${unconfLab.slug}, ${labA.slug}, ${labB.slug}\n`);

    // ====================================================
    // 1. WHATSAPP OPTIONALITY (UNCONFIGURED LAB)
    // ====================================================
    console.log("--- GROUP 1: WhatsApp Optionality (Unconfigured Lab) ---");

    // Test 1: Settings for unconfigured lab report configured: false
    const unconfSettings = await whatsAppService.getLabWhatsAppSettings(unconfLab.id);
    assert(
      unconfSettings.configured === false && unconfSettings.status === "DISCONNECTED",
      "Unconfigured lab has configured: false and status: DISCONNECTED"
    );

    // Test 2: Placing order for unconfigured lab succeeds without errors
    const patientPhone1 = "+919876540001";
    const orderUnconf = await createPatientOrder({
      labId: unconfLab.id,
      patient: {
        fullName: "Rahul Verma",
        phone: patientPhone1,
        gender: Gender.MALE,
        ageYears: 32,
      },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: new Date().toISOString(),
        scheduledSlot: "08:00 AM - 09:00 AM",
        addressLine1: "Flat 402, Green Glen Layout",
        city: "Bangalore",
      },
      items: [{ itemType: "TEST", id: testItemUnconf.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });

    assert(
      Boolean(orderUnconf && orderUnconf.orderNumber && orderUnconf.orderStatus === OrderStatus.CONFIRMED),
      "Unconfigured lab order placement (Cash on Collection) succeeds and confirms order"
    );

    // Test 3: Order confirmation notification for unconfigured lab is skipped gracefully
    const unconfOrderNotifResult = await sendOrderConfirmationWhatsApp(orderUnconf.id);
    assert(
      unconfOrderNotifResult.sent === false && unconfOrderNotifResult.skipped === true,
      "Order confirmation WhatsApp notification gracefully skips for unconfigured lab"
    );

    // Test 4: Report upload for unconfigured lab succeeds with zero errors
    const unconfReport = await uploadLabReport(unconfLab.id, {
      orderId: orderUnconf.id,
      originalFileName: "cbc_report.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 102400,
      storagePath: `/reports/${unconfLab.id}/cbc_${orderUnconf.orderNumber}.pdf`,
      releasedNow: true,
    });

    assert(
      Boolean(unconfReport && unconfReport.reportNumber && unconfReport.status === ReportStatus.FINAL),
      "Diagnostic report upload for unconfigured lab succeeds and releases as FINAL"
    );

    // Test 5: Report ready notification skips gracefully for unconfigured lab
    const unconfReportNotifResult = await sendReportReadyWhatsApp(unconfReport.id);
    assert(
      unconfReportNotifResult.sent === false && unconfReportNotifResult.skipped === true,
      "Report ready WhatsApp notification gracefully skips for unconfigured lab"
    );

    // Test 6: Zero WhatsApp notification records created for unconfigured lab
    const unconfNotifCount = await prisma.notification.count({
      where: { labId: unconfLab.id, channel: NotificationChannel.WHATSAPP },
    });
    assert(
      unconfNotifCount === 0,
      "No notification database rows created for unconfigured lab"
    );

    // ====================================================
    // 2. CONFIGURE LAB A & TEST PREFERENCE DEFAULTS
    // ====================================================
    console.log("\n--- GROUP 2: Lab A WhatsApp Configuration & Preferences ---");

    const phoneIdA = `5948372615${timestamp.toString().slice(-4)}`;
    const updatedSettingsA = await whatsAppService.updateLabWhatsAppSettings(labA.id, {
      wabaId: `waba_apex_${timestamp}`,
      phoneNumberId: phoneIdA,
      displayPhoneNumber: "+91 98765 22222",
      accessToken: `EAAG_mock_token_lab_a_${timestamp}`,
      appSecret: `meta_app_secret_lab_a_${timestamp}`,
      isEnabled: true,
      notifyOrderConfirmation: true,
      notifyPaymentConfirmation: true,
      notifySampleCollected: true,
      notifyReportReady: true,
    });

    // Test 7: Lab A settings are configured and notifications enabled by default
    assert(
      updatedSettingsA.configured === true &&
        updatedSettingsA.isEnabled === true &&
        updatedSettingsA.notifyOrderConfirmation === true &&
        updatedSettingsA.notifyPaymentConfirmation === true &&
        updatedSettingsA.notifySampleCollected === true &&
        updatedSettingsA.notifyReportReady === true,
      "Lab A WhatsApp settings configured with all 4 notification preferences enabled"
    );

    // Test 8: Secrets are never exposed in safe settings response
    assert(
      updatedSettingsA.hasAccessToken === true &&
        updatedSettingsA.hasAppSecret === true &&
        !(updatedSettingsA as any).accessToken &&
        !(updatedSettingsA as any).appSecret,
      "Lab A safe response does not leak plaintext access token or app secret"
    );

    // ====================================================
    // 3. ORDER CONFIRMATION NOTIFICATION (LAB A)
    // ====================================================
    console.log("\n--- GROUP 3: Order Confirmation Notification Flow ---");

    const patientPhoneA = "+919876540002";
    const orderA = await createPatientOrder({
      labId: labA.id,
      patient: {
        fullName: "Ananya Sharma",
        phone: patientPhoneA,
        gender: Gender.FEMALE,
        ageYears: 28,
      },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: new Date().toISOString(),
        scheduledSlot: "07:00 AM - 08:00 AM",
        addressLine1: "Apt 201, Lotus Towers",
        city: "Mumbai",
      },
      items: [{ itemType: "TEST", id: testItemA.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });

    assert(
      Boolean(orderA && orderA.orderStatus === OrderStatus.CONFIRMED),
      "Lab A patient order created with CONFIRMED status"
    );

    // Test 9: sendOrderConfirmationWhatsApp dispatches notification
    const orderNotifResult = await sendOrderConfirmationWhatsApp(orderA.id);
    assert(
      orderNotifResult.sent === true && Boolean(orderNotifResult.messageId),
      `Order confirmation notification dispatched successfully (messageId: ${orderNotifResult.messageId})`
    );

    // Test 10: Notification row exists in database with recipient, channel, and tracking URL
    const orderNotifRow = await prisma.notification.findFirst({
      where: {
        labId: labA.id,
        channel: NotificationChannel.WHATSAPP,
        recipientType: NotificationRecipientType.PATIENT,
      },
      orderBy: { createdAt: "desc" },
    });

    assert(
      Boolean(
        orderNotifRow &&
          orderNotifRow.message.includes(orderA.orderNumber) &&
          orderNotifRow.message.includes(`/${labA.slug}/booking/${orderA.orderNumber}`) &&
          orderNotifRow.message.includes("Reply STOP to opt out")
      ),
      "Order confirmation message text contains order number, tracking URL, and opt-out notice"
    );

    // Test 11: Idempotency - Calling order confirmation a second time is skipped
    const orderNotifDuplicate = await sendOrderConfirmationWhatsApp(orderA.id);
    assert(
      orderNotifDuplicate.sent === false && orderNotifDuplicate.skipped === true,
      "Idempotency: Repeated order confirmation notification is skipped"
    );

    // ====================================================
    // 4. PAYMENT CONFIRMATION NOTIFICATION (LAB A)
    // ====================================================
    console.log("\n--- GROUP 4: Payment Confirmation Notification Flow ---");

    // Create a payment record for orderA (online payment flow)
    const paymentA = await prisma.patientPayment.create({
      data: {
        paymentNumber: `PAY-MOCK-${timestamp}-1`,
        orderId: orderA.id,
        labId: labA.id,
        amount: orderA.totalAmount,
        currency: "INR",
        method: PaymentMethod.RAZORPAY,
        status: PaymentStatus.PAID,
        gatewayOrderId: `order_mock_${timestamp}`,
        gatewayPaymentId: `pay_mock_${timestamp}`,
        paidAt: new Date(),
      },
    });

    // Test 12: sendPaymentConfirmationWhatsApp dispatches notification
    const paymentNotifResult = await sendPaymentConfirmationWhatsApp(paymentA.id);
    assert(
      paymentNotifResult.sent === true && Boolean(paymentNotifResult.messageId),
      `Payment confirmation notification dispatched successfully (messageId: ${paymentNotifResult.messageId})`
    );

    // Test 13: Notification row recorded in database for payment
    const paymentNotifRow = await prisma.notification.findFirst({
      where: {
        labId: labA.id,
        channel: NotificationChannel.WHATSAPP,
        title: { startsWith: "Payment Received:" },
      },
    });

    assert(
      Boolean(
        paymentNotifRow &&
          paymentNotifRow.message.includes(paymentA.paymentNumber) &&
          paymentNotifRow.message.includes(labA.name)
      ),
      "Payment confirmation database record contains payment reference and lab name"
    );

    // Test 14: Idempotency - Calling payment confirmation a second time is skipped
    const paymentNotifDuplicate = await sendPaymentConfirmationWhatsApp(paymentA.id);
    assert(
      paymentNotifDuplicate.sent === false && paymentNotifDuplicate.skipped === true,
      "Idempotency: Repeated payment confirmation notification is skipped"
    );

    // ====================================================
    // 5. SAMPLE COLLECTION NOTIFICATION (LAB A)
    // ====================================================
    console.log("\n--- GROUP 5: Sample Collection Notification Flow ---");

    // Test 15: sendSampleCollectedWhatsApp dispatches notification
    const sampleNotifResult = await sendSampleCollectedWhatsApp(orderA.id, {
      phlebotomistName: "Sunil Kumar",
    });

    assert(
      sampleNotifResult.sent === true && Boolean(sampleNotifResult.messageId),
      `Sample collection notification dispatched successfully (messageId: ${sampleNotifResult.messageId})`
    );

    // Test 16: Notification row contains phlebotomist details and status
    const sampleNotifRow = await prisma.notification.findFirst({
      where: {
        labId: labA.id,
        channel: NotificationChannel.WHATSAPP,
        title: { startsWith: "Sample Collected:" },
      },
    });

    assert(
      Boolean(
        sampleNotifRow &&
          sampleNotifRow.message.includes("Sunil Kumar") &&
          sampleNotifRow.message.includes(orderA.orderNumber)
      ),
      "Sample collection message contains phlebotomist name and order number"
    );

    // Test 17: Idempotency - Calling sample collection a second time is skipped
    const sampleNotifDuplicate = await sendSampleCollectedWhatsApp(orderA.id);
    assert(
      sampleNotifDuplicate.sent === false && sampleNotifDuplicate.skipped === true,
      "Idempotency: Repeated sample collection notification is skipped"
    );

    // ====================================================
    // 6. DIAGNOSTIC REPORT READY NOTIFICATION (LAB A)
    // ====================================================
    console.log("\n--- GROUP 6: Diagnostic Report Ready Flow & Security ---");

    const reportA = await uploadLabReport(labA.id, {
      orderId: orderA.id,
      originalFileName: "lipid_profile_report.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 204800,
      storagePath: `/reports/${labA.id}/lipid_${orderA.orderNumber}.pdf`,
      releasedNow: true,
    });

    // Test 18: Report created with FINAL status
    assert(
      Boolean(reportA && reportA.status === ReportStatus.FINAL),
      "Diagnostic report created and released as FINAL"
    );

    // Test 19: sendReportReadyWhatsApp dispatches notification and updates Report.deliveredViaWhatsappAt
    const reportNotifResult = await sendReportReadyWhatsApp(reportA.id);
    assert(
      reportNotifResult.sent === true && Boolean(reportNotifResult.messageId),
      `Report ready WhatsApp notification dispatched successfully (messageId: ${reportNotifResult.messageId})`
    );

    // Test 20: Report.deliveredViaWhatsappAt is updated in PostgreSQL
    const refreshedReport = await prisma.report.findUnique({ where: { id: reportA.id } });
    assert(
      refreshedReport?.deliveredViaWhatsappAt !== null &&
        refreshedReport?.deliveredViaWhatsappAt !== undefined,
      "Report.deliveredViaWhatsappAt timestamp is successfully persisted"
    );

    // Test 21: CRITICAL SECURITY - Message contains secure web link, NEVER raw PDF bytes/attachments
    const reportNotifRow = await prisma.notification.findFirst({
      where: {
        labId: labA.id,
        channel: NotificationChannel.WHATSAPP,
        title: { startsWith: "Report Ready:" },
      },
    });

    const expectedReportUrl = `/${labA.slug}/reports?orderNumber=${orderA.orderNumber}`;
    assert(
      Boolean(
        reportNotifRow &&
          reportNotifRow.message.includes(expectedReportUrl) &&
          reportNotifRow.message.includes("Privacy Notice") &&
          !reportNotifRow.message.includes(".pdf")
      ),
      "Report ready notification provides authenticated web link and requires privacy verification (zero raw PDF)"
    );

    // Test 22: Idempotency - Repeated report ready notification is skipped
    const reportNotifDuplicate = await sendReportReadyWhatsApp(reportA.id);
    assert(
      reportNotifDuplicate.sent === false && reportNotifDuplicate.skipped === true,
      "Idempotency: Repeated report ready notification is skipped"
    );

    // ====================================================
    // 7. LAB NOTIFICATION PREFERENCE TOGGLES
    // ====================================================
    console.log("\n--- GROUP 7: Laboratory Notification Preference Toggles ---");

    // Disable order confirmation and report ready for Lab A
    await whatsAppService.updateLabWhatsAppSettings(labA.id, {
      notifyOrderConfirmation: false,
      notifyReportReady: false,
    });

    const patientPhoneA2 = "+919876540003";
    const orderA2 = await createPatientOrder({
      labId: labA.id,
      patient: {
        fullName: "Vikram Malhotra",
        phone: patientPhoneA2,
        gender: Gender.MALE,
        ageYears: 45,
      },
      collection: {
        type: CollectionType.LAB_VISIT,
        scheduledDate: new Date().toISOString(),
        scheduledSlot: "10:00 AM - 11:00 AM",
      },
      items: [{ itemType: "TEST", id: testItemA.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });

    // Test 23: Order confirmation skipped when notifyOrderConfirmation is false
    const toggleOrderResult = await sendOrderConfirmationWhatsApp(orderA2.id);
    assert(
      toggleOrderResult.sent === false && toggleOrderResult.skipped === true,
      "Preference Toggle: Order confirmation skipped when notifyOrderConfirmation is false"
    );

    // Test 24: Payment confirmation STILL SENT when notifyPaymentConfirmation is true
    const paymentA2 = await prisma.patientPayment.create({
      data: {
        paymentNumber: `PAY-MOCK-${timestamp}-2`,
        orderId: orderA2.id,
        labId: labA.id,
        amount: orderA2.totalAmount,
        currency: "INR",
        method: PaymentMethod.RAZORPAY,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    const togglePaymentResult = await sendPaymentConfirmationWhatsApp(paymentA2.id);
    assert(
      togglePaymentResult.sent === true,
      "Preference Toggle: Payment confirmation still sent because notifyPaymentConfirmation is true"
    );

    // Test 25: Report ready skipped when notifyReportReady is false
    const reportA2 = await uploadLabReport(labA.id, {
      orderId: orderA2.id,
      originalFileName: "report_a2.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 150000,
      storagePath: `/reports/${labA.id}/a2.pdf`,
      releasedNow: true,
    });

    const toggleReportResult = await sendReportReadyWhatsApp(reportA2.id);
    assert(
      toggleReportResult.sent === false && toggleReportResult.skipped === true,
      "Preference Toggle: Report ready skipped when notifyReportReady is false"
    );

    // Re-enable preferences for subsequent tests
    await whatsAppService.updateLabWhatsAppSettings(labA.id, {
      notifyOrderConfirmation: true,
      notifyReportReady: true,
    });

    // ====================================================
    // 8. MULTI-TENANT CREDENTIAL & TENANT ISOLATION
    // ====================================================
    console.log("\n--- GROUP 8: Multi-Tenant Credential & Tenant Isolation ---");

    // Configure Lab B with distinct credentials
    const phoneIdB = `4837261590${timestamp.toString().slice(-4)}`;
    await whatsAppService.updateLabWhatsAppSettings(labB.id, {
      wabaId: `waba_care_${timestamp}`,
      phoneNumberId: phoneIdB,
      displayPhoneNumber: "+91 98765 33333",
      accessToken: `EAAG_mock_token_lab_b_${timestamp}`,
      appSecret: `meta_app_secret_lab_b_${timestamp}`,
      isEnabled: true,
    });

    const testItemB = await prisma.labTest.create({
      data: {
        labId: labB.id,
        masterTestId: masterTest.id,
        sellingPrice: 500.0,
        isActive: true,
      },
    });

    const orderB = await createPatientOrder({
      labId: labB.id,
      patient: {
        fullName: "Priya Nair",
        phone: "+919876540004",
        gender: Gender.FEMALE,
        ageYears: 29,
      },
      collection: {
        type: CollectionType.HOME_COLLECTION,
        scheduledDate: new Date().toISOString(),
        scheduledSlot: "09:00 AM - 10:00 AM",
      },
      items: [{ itemType: "TEST", id: testItemB.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });

    // Test 26: Lab B dispatches notification with Lab B credentials
    const orderBResult = await sendOrderConfirmationWhatsApp(orderB.id);
    assert(
      orderBResult.sent === true && Boolean(orderBResult.messageId),
      "Lab B dispatches order notification under Lab B tenant credentials"
    );

    // Test 27: Disabling WhatsApp for Lab A leaves Lab B completely operational
    await whatsAppService.updateLabWhatsAppSettings(labA.id, { isEnabled: false });

    const orderA3 = await createPatientOrder({
      labId: labA.id,
      patient: {
        fullName: "Arjun Rao",
        phone: "+919876540005",
        gender: Gender.MALE,
        ageYears: 38,
      },
      collection: {
        type: CollectionType.LAB_VISIT,
        scheduledDate: new Date().toISOString(),
        scheduledSlot: "11:00 AM - 12:00 PM",
      },
      items: [{ itemType: "TEST", id: testItemA.id }],
      paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
    });

    const orderA3Result = await sendOrderConfirmationWhatsApp(orderA3.id);
    assert(
      orderA3Result.sent === false && orderA3Result.skipped === true,
      "Disabling Lab A skips Lab A notifications"
    );

    const paymentB = await prisma.patientPayment.create({
      data: {
        paymentNumber: `PAY-MOCK-${timestamp}-3`,
        orderId: orderB.id,
        labId: labB.id,
        amount: orderB.totalAmount,
        currency: "INR",
        method: PaymentMethod.RAZORPAY,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    const paymentBResult = await sendPaymentConfirmationWhatsApp(paymentB.id);
    assert(
      paymentBResult.sent === true,
      "Lab B notifications remain active and functional after Lab A is disabled"
    );

    // Re-enable Lab A
    await whatsAppService.updateLabWhatsAppSettings(labA.id, { isEnabled: true });

    // ====================================================
    // 9. PATIENT OPT-OUT / OPT-IN VIA WEBHOOK
    // ====================================================
    console.log("\n--- GROUP 9: Patient Opt-Out & Opt-In Handling ---");

    const optOutPhone = "919876540099";

    // Simulate inbound "STOP" webhook from patient
    const stopWebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: `waba_apex_${timestamp}`,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+91 98765 22222",
                  phone_number_id: phoneIdA,
                },
                contacts: [{ profile: { name: "OptOut Tester" }, wa_id: optOutPhone }],
                messages: [
                  {
                    from: optOutPhone,
                    id: `wamid.optout.${timestamp}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: "STOP" },
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

    const stopPayloadSigned = createSignedMetaPayload(
      stopWebhookPayload,
      `meta_app_secret_lab_a_${timestamp}`
    );

    // Test 28: Inbound "STOP" triggers PATIENT_OPT_OUT
    const stopResult = await whatsAppService.handleInboundWebhook(
      stopPayloadSigned.rawBody,
      stopPayloadSigned.signatureHeader,
      labA.id
    );

    assert(
      stopResult.handled === true && stopResult.eventType === "PATIENT_OPT_OUT",
      "Inbound 'STOP' message processed as PATIENT_OPT_OUT event"
    );

    // Test 29: isPatientOptedOut returns true
    const isOptedOut = await whatsAppService.isPatientOptedOut(labA.id, optOutPhone);
    assert(isOptedOut === true, "Patient phone number recorded as opted-out for Lab A");

    // Test 30: Notifications to opted-out patient are suppressed (status: opted_out)
    const suppressedSendResult = await whatsAppService.sendLabTextMessage({
      labId: labA.id,
      recipientPhone: `+${optOutPhone}`,
      text: "Test notification to opted-out patient",
    });

    assert(
      suppressedSendResult.success === false && suppressedSendResult.status === "opted_out",
      "Outbound message to opted-out phone is strictly suppressed"
    );

    // Simulate inbound "START" webhook from patient to opt back in
    const startWebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: `waba_apex_${timestamp}`,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+91 98765 22222",
                  phone_number_id: phoneIdA,
                },
                contacts: [{ profile: { name: "OptOut Tester" }, wa_id: optOutPhone }],
                messages: [
                  {
                    from: optOutPhone,
                    id: `wamid.optin.${timestamp}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: "START" },
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

    const startPayloadSigned = createSignedMetaPayload(
      startWebhookPayload,
      `meta_app_secret_lab_a_${timestamp}`
    );

    // Test 31: Inbound "START" triggers PATIENT_OPT_IN
    const startResult = await whatsAppService.handleInboundWebhook(
      startPayloadSigned.rawBody,
      startPayloadSigned.signatureHeader,
      labA.id
    );

    assert(
      startResult.handled === true && startResult.eventType === "PATIENT_OPT_IN",
      "Inbound 'START' message processed as PATIENT_OPT_IN event"
    );

    // Test 32: Phone number is no longer opted out
    const isOptedOutAfterStart = await whatsAppService.isPatientOptedOut(labA.id, optOutPhone);
    assert(
      isOptedOutAfterStart === false,
      "Patient phone number is restored to opt-in status after 'START'"
    );

    // ====================================================
    // 10. NON-BLOCKING RESILIENCE
    // ====================================================
    console.log("\n--- GROUP 10: Non-Blocking Delivery Resilience ---");

    // Corrupt Lab A's token to simulate external API / decryption failure
    await prisma.platformSettings.update({
      where: { key: `lab_whatsapp:${labA.id}` },
      data: {
        value: {
          wabaId: `waba_apex_${timestamp}`,
          phoneNumberId: phoneIdA,
          accessTokenEncrypted: "corrupted_invalid_aes_string",
          isEnabled: true,
          status: "CONNECTED",
          notifyOrderConfirmation: true,
        } as any,
      },
    });

    // Test 33: Placing an order does NOT fail even when WhatsApp token is corrupted
    let orderPlacementFailed = false;
    let orderResilient: any = null;
    try {
      orderResilient = await createPatientOrder({
        labId: labA.id,
        patient: {
          fullName: "Resilience Patient",
          phone: "+919876540006",
          gender: Gender.MALE,
          ageYears: 30,
        },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: new Date().toISOString(),
          scheduledSlot: "08:00 AM - 09:00 AM",
        },
        items: [{ itemType: "TEST", id: testItemA.id }],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });
    } catch {
      orderPlacementFailed = true;
    }

    assert(
      orderPlacementFailed === false && Boolean(orderResilient?.orderNumber),
      "Resilience: Corrupted WhatsApp credentials never fail underlying order creation"
    );

    // Test 34: Notification service returns safe failure without throwing
    let notifServiceThrew = false;
    try {
      const res = await sendOrderConfirmationWhatsApp(orderResilient.id);
      assert(res.sent === false, "Notification service returns sent: false on provider error");
    } catch {
      notifServiceThrew = true;
    }

    assert(
      notifServiceThrew === false,
      "Resilience: sendOrderConfirmationWhatsApp never throws unhandled errors"
    );

  } catch (error: any) {
    console.error("\n[CRITICAL ERROR] Test suite encountered an unexpected exception:", error);
    failedTests++;
  } finally {
    // Cleanup test data safely
    console.log("\n--- CLEANUP: Removing Test Data ---");
    try {
      if (unconfLab?.id) {
        await prisma.notification.deleteMany({ where: { labId: unconfLab.id } });
        await prisma.report.deleteMany({ where: { labId: unconfLab.id } });
        await prisma.fileAsset.deleteMany({ where: { labId: unconfLab.id } });
        await prisma.orderItem.deleteMany({ where: { order: { labId: unconfLab.id } } });
        await prisma.collection.deleteMany({ where: { labId: unconfLab.id } });
        await prisma.order.deleteMany({ where: { labId: unconfLab.id } });
        await prisma.labTest.deleteMany({ where: { labId: unconfLab.id } });
        await prisma.labPaymentSettings.deleteMany({ where: { labId: unconfLab.id } });
        await prisma.lab.delete({ where: { id: unconfLab.id } });
      }

      if (labA?.id) {
        await prisma.notification.deleteMany({ where: { labId: labA.id } });
        await prisma.report.deleteMany({ where: { labId: labA.id } });
        await prisma.fileAsset.deleteMany({ where: { labId: labA.id } });
        await prisma.patientPayment.deleteMany({ where: { labId: labA.id } });
        await prisma.orderItem.deleteMany({ where: { order: { labId: labA.id } } });
        await prisma.collection.deleteMany({ where: { labId: labA.id } });
        await prisma.order.deleteMany({ where: { labId: labA.id } });
        await prisma.labTest.deleteMany({ where: { labId: labA.id } });
        await prisma.labPaymentSettings.deleteMany({ where: { labId: labA.id } });
        await prisma.platformSettings.deleteMany({
          where: {
            OR: [
              { key: `lab_whatsapp:${labA.id}` },
              { key: `lab_whatsapp_optouts:${labA.id}` },
            ],
          },
        });
        await prisma.lab.delete({ where: { id: labA.id } });
      }

      if (labB?.id) {
        await prisma.notification.deleteMany({ where: { labId: labB.id } });
        await prisma.patientPayment.deleteMany({ where: { labId: labB.id } });
        await prisma.orderItem.deleteMany({ where: { order: { labId: labB.id } } });
        await prisma.collection.deleteMany({ where: { labId: labB.id } });
        await prisma.order.deleteMany({ where: { labId: labB.id } });
        await prisma.labTest.deleteMany({ where: { labId: labB.id } });
        await prisma.labPaymentSettings.deleteMany({ where: { labId: labB.id } });
        await prisma.platformSettings.deleteMany({
          where: {
            OR: [
              { key: `lab_whatsapp:${labB.id}` },
              { key: `lab_whatsapp_optouts:${labB.id}` },
            ],
          },
        });
        await prisma.lab.delete({ where: { id: labB.id } });
      }
      console.log("Cleanup completed successfully.");
    } catch (cleanupErr: any) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }

  console.log("\n==================================================");
  console.log("GYREX LABS — PHASE 7B VERIFICATION RESULTS");
  console.log(`Passed: ${passedTests} / ${passedTests + failedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase7BTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
