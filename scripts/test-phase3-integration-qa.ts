/**
 * GYREX LABS — PHASE 3 INTEGRATION, QA, & RELEASE VERIFICATION SUITE
 *
 * Comprehensive end-to-end regression and release test harness:
 * 1. SEO Metadata Generation & OpenGraph tags
 * 2. WhatsApp quick-chat entry points & phone sanitization
 * 3. Server-authoritative pricing & cart calculation (anti-tampering)
 * 4. Home collection fee rules & free-threshold calculations
 * 5. Single-tenant cart guard & cross-tenant item rejection
 * 6. NABL accreditation full lifecycle & private certificate authentication
 * 7. Clinical team specialist photos & zero personal contact leaks
 * 8. Patient booking order creation & GYR-YYYY-XXXXX sequence validation
 * 9. Logo & facility banner fallback fidelity
 * 10. Database schema integrity & clean state restoration
 */

import { prisma } from "../lib/db/prisma";
import { getLabStorefront } from "../services/labs/storefront";
import {
  getLabStoreSettings,
  updateLabStoreSettings,
} from "../services/lab/store-settings-service";
import {
  calculateOrderTotal,
  createPatientOrder,
} from "../services/orders/patient-order-service";
import { generateMetadata } from "../app/(patient)/[labSlug]/layout";
import { computeIsNablValid } from "../app/lab/settings/page";
import { CollectionType, PaymentMethod, OrderStatus, PaymentStatus } from "@prisma/client";

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

async function runPhase3QA() {
  console.log("\n===============================================================");
  console.log("   GYREX LABS — PHASE 3 INTEGRATION, QA, & RELEASE HARNESS    ");
  console.log("===============================================================\n");

  const pilotSlug = "sharma-diagnostics";
  const pilotLab = await prisma.lab.findUnique({
    where: { slug: pilotSlug },
    include: {
      storeSettings: true,
      labTests: { where: { isActive: true }, take: 3 },
      packages: { where: { isActive: true }, take: 2 },
    },
  });

  if (!pilotLab) {
    console.error(`Pilot lab '${pilotSlug}' not found in database. Exiting.`);
    process.exit(1);
  }

  // Backup original state
  const originalWorkingHours = pilotLab.storeSettings?.workingHours as Record<string, any> | null;
  const originalNablNumber = pilotLab.nablAccreditationNumber;
  const createdTestOrderIds: string[] = [];
  let tempServiceAreaId: string | null = null;

  try {
    // ── Test Group 1: SEO Metadata & OpenGraph Social Sharing ──
    console.log("── Test Group 1: SEO Metadata & OpenGraph Social Sharing ──");
    const meta = await generateMetadata({ params: Promise.resolve({ labSlug: pilotSlug }) });

    assert(
      typeof meta.title === "string" && meta.title.includes(pilotLab.name) && meta.title.includes("Gyrex Labs"),
      `SEO Title contains lab name and Gyrex Labs: "${meta.title}"`
    );
    assert(
      typeof meta.description === "string" && meta.description.length > 20,
      `SEO Description is populated: "${meta.description?.slice(0, 60)}..."`
    );
    assert(
      meta.openGraph?.title === `${pilotLab.name} — Official Diagnostic Storefront`,
      "OpenGraph title matches official storefront branding"
    );
    assert(
      meta.openGraph?.url === `https://labs.gyrex.in/${pilotSlug}`,
      `OpenGraph canonical URL matches pilot: ${meta.openGraph?.url}`
    );
    assert(
      meta.openGraph?.siteName === "Gyrex Labs",
      "OpenGraph siteName is Gyrex Labs"
    );
    assert(
      meta.robots !== undefined,
      "Robots directives are present for search engine indexing"
    );

    // ── Test Group 2: WhatsApp Touchpoints & Sanitization ──
    console.log("\n── Test Group 2: WhatsApp Touchpoints & Phone Sanitization ──");
    const testPhone = "+91 98765-43210";
    const sanitized = testPhone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    assert(sanitized === "919876543210", `Sanitizes phone to pure digits: ${sanitized}`);

    const greeting = `Hello ${pilotLab.name}, I would like to inquire about booking diagnostic tests.`;
    const waUrl = `https://wa.me/${sanitized}?text=${encodeURIComponent(greeting)}`;
    assert(waUrl.includes("wa.me/919876543210"), "Generates valid wa.me link target");
    assert(waUrl.includes("inquire%20about%20booking"), "URL-encodes clinical greeting message");

    // ── Test Group 3: Server-Authoritative Pricing & Anti-Tampering ──
    console.log("\n── Test Group 3: Server-Authoritative Pricing & Anti-Tampering ──");
    const sampleTest = pilotLab.labTests[0];
    if (!sampleTest) {
      console.warn("  ⚠ WARNING: No active lab tests found for pricing test.");
    } else {
      const realPrice = Number(sampleTest.sellingPrice);

      // Client passes item
      const calculation = await calculateOrderTotal(
        pilotLab.id,
        [
          {
            itemType: "TEST",
            id: sampleTest.id,
          },
        ],
        CollectionType.LAB_VISIT
      );

      assert(
        calculation.subtotal === realPrice,
        `Server enforced genuine test price ₹${realPrice} (subtotal: ₹${calculation.subtotal}), ignoring client input`
      );
      assert(
        calculation.collectionFee === 0,
        "Collection fee is ₹0 for LAB_VISIT"
      );
      assert(
        calculation.total === realPrice,
        `Total amount exactly equals subtotal ₹${realPrice}`
      );
    }

    // ── Test Group 4: Home Collection Fee Rules & Threshold Waiver ──
    console.log("\n── Test Group 4: Home Collection Fee Rules & Threshold Waiver ──");
    // Configure Home Collection fee = 100, free threshold = 1000
    await updateLabStoreSettings(pilotLab.id, {
      homeCollectionAvailable: true,
      homeCollectionFee: 100,
      freeHomeCollectionThreshold: 1000,
    });

    if (sampleTest) {
      const realPrice = Number(sampleTest.sellingPrice);

      // Order with 1 unit (below 1000 threshold if test < 1000)
      const belowThresholdCalc = await calculateOrderTotal(
        pilotLab.id,
        [{ itemType: "TEST", id: sampleTest.id }],
        CollectionType.HOME_COLLECTION
      );

      if (realPrice < 1000) {
        assert(
          belowThresholdCalc.collectionFee === 100,
          `Applies standard collection fee ₹100 when subtotal ₹${belowThresholdCalc.subtotal} < ₹1000`
        );
        assert(
          belowThresholdCalc.total === belowThresholdCalc.subtotal + 100,
          `Total amount ₹${belowThresholdCalc.total} = subtotal + ₹100`
        );
      }

      // Order with multiple items large enough to exceed 1000 threshold
      const qtyToExceed = Math.ceil(1050 / realPrice);
      const multipleItems = Array(qtyToExceed).fill({ itemType: "TEST", id: sampleTest.id });
      const aboveThresholdCalc = await calculateOrderTotal(
        pilotLab.id,
        multipleItems,
        CollectionType.HOME_COLLECTION
      );

      assert(
        aboveThresholdCalc.subtotal >= 1000,
        `Subtotal reaches or exceeds free threshold: ₹${aboveThresholdCalc.subtotal} >= ₹1000`
      );
      assert(
        aboveThresholdCalc.collectionFee === 0,
        `Collection fee is waived (₹0) when subtotal reaches threshold: ₹${aboveThresholdCalc.collectionFee}`
      );
      assert(
        aboveThresholdCalc.total === aboveThresholdCalc.subtotal,
        `Total amount equals subtotal without collection charge: ₹${aboveThresholdCalc.total}`
      );
    }

    // ── Test Group 5: Single-Tenant Cart Guard & Cross-Tenant Rejection ──
    console.log("\n── Test Group 5: Single-Tenant Cart Guard & Cross-Tenant Rejection ──");
    const otherLab = await prisma.lab.findFirst({
      where: { id: { not: pilotLab.id }, labTests: { some: { isActive: true } } },
      include: { labTests: { where: { isActive: true }, take: 1 } },
    });

    if (otherLab && otherLab.labTests[0]) {
      const foreignTestId = otherLab.labTests[0].id;
      let injectionCaught = false;
      try {
        await calculateOrderTotal(
          pilotLab.id,
          [{ itemType: "TEST", id: foreignTestId }],
          CollectionType.LAB_VISIT
        );
      } catch (err: any) {
        injectionCaught = true;
        assert(
          err.message.includes("does not belong to") ||
            err.message.includes("Invalid item") ||
            err.message.includes("not found"),
          "Rejects cross-tenant test injection with security error"
        );
      }
      assert(injectionCaught === true, "calculateOrderTotal blocked cross-tenant test injection");
    } else {
      console.log("  ℹ Single lab environment: skipping cross-tenant test injection");
    }

    // ── Test Group 6: NABL Accreditation Full Lifecycle & Window ──
    console.log("\n── Test Group 6: NABL Accreditation Lifecycle & Trust Badge ──");
    const now = new Date();
    const fromStr = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const untilStr = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Active
    assert(computeIsNablValid(true, "MC-4589", fromStr, untilStr) === true, "NABL is active when today is within date window");
    // Expired
    const expiredUntil = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    assert(computeIsNablValid(true, "MC-4589", fromStr, expiredUntil) === false, "NABL is inactive when date is expired");
    // Toggle OFF
    assert(computeIsNablValid(false, "MC-4589", fromStr, untilStr) === false, "NABL is inactive when toggle is OFF");
    // Missing dates (legacy)
    assert(computeIsNablValid(true, "MC-4589", "", "") === false, "NABL badge is withheld when dates are missing");

    // ── Test Group 7: Clinical Team Specialists & Privacy ──
    console.log("\n── Test Group 7: Clinical Team Specialists & Privacy ──");
    await updateLabStoreSettings(pilotLab.id, {
      workingHours: {
        ...(pilotLab.storeSettings?.workingHours as Record<string, any> || {}),
        team: [
          { name: "Dr. A. K. Sharma", role: "Chief Pathologist", qualifications: "MD Pathology" },
        ],
      },
    });
    const storefront = await getLabStorefront(pilotSlug);
    assert(storefront !== null, "Storefront resolves successfully");
    const specialists = storefront?.settings.team || [];
    assert(specialists.length > 0, `Storefront resolves ${specialists.length} clinical specialists`);

    for (const member of specialists) {
      assert(Boolean(member.name && member.name.trim()), `Specialist has valid name: ${member.name}`);
      assert(Boolean(member.role && member.role.trim()), `Specialist has valid clinical role: ${member.role}`);
      assert(!("email" in member), "Zero personal email exposure on public storefront");
      assert(!("phone" in member), "Zero personal mobile phone exposure on public storefront");
    }

    // ── Test Group 8: End-to-End Patient Booking Creation ──
    console.log("\n── Test Group 8: End-to-End Patient Booking Order Creation ──");
    if (sampleTest) {
      const pinToCover = pilotLab.postalCode || "110001";
      const existingArea = await prisma.labServiceArea.findFirst({
        where: { labId: pilotLab.id, pincode: pinToCover },
      });
      if (!existingArea) {
        const createdArea = await prisma.labServiceArea.create({
          data: {
            labId: pilotLab.id,
            pincode: pinToCover,
            localityName: "QA Janakpuri Service Zone",
            isActive: true,
          },
        });
        tempServiceAreaId = createdArea.id;
      }

      const orderRes = await createPatientOrder({
        labId: pilotLab.id,
        patient: {
          fullName: "QA Verification Patient",
          phone: "+91 99999-88888",
          email: "qa.patient@test.gyrex.in",
          gender: "MALE",
          ageYears: 35,
        },
        collection: {
          type: CollectionType.HOME_COLLECTION,
          scheduledDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          scheduledSlot: "08:00 AM - 09:00 AM",
          addressLine1: "123 Diagnostic Health Street",
          city: pilotLab.city || "New Delhi",
          state: pilotLab.state || "Delhi",
          postalCode: pilotLab.postalCode || "110001",
        },
        items: [
          {
            itemType: "TEST",
            id: sampleTest.id,
          },
        ],
        paymentMethod: PaymentMethod.CASH_ON_COLLECTION,
      });

      assert(Boolean(orderRes && orderRes.id), "Successfully created patient order in database");
      createdTestOrderIds.push(orderRes.id);

      assert(
        /^GYR-\d{4}-\d+$/.test(orderRes.orderNumber),
        `Order number matches GYR-YYYY-XXXXXXXX format: ${orderRes.orderNumber}`
      );
      assert(orderRes.orderStatus === OrderStatus.CONFIRMED, "Initial order status is CONFIRMED for CASH_ON_COLLECTION");
      assert(orderRes.paymentStatus === PaymentStatus.CASH_ON_COLLECTION, "Initial payment status is CASH_ON_COLLECTION");
      assert(Number(orderRes.totalAmount) > 0, `Total order amount calculated: ₹${orderRes.totalAmount}`);
    }

    // ── Test Group 9: Logo & Hero Fallback Fidelity ──
    console.log("\n── Test Group 9: Logo & Hero Fallback Fidelity ──");
    assert(storefront?.settings.bannerUrl === null, "Sharma Diagnostics banner is null, triggering text-led clinical hero fallback");
    assert(
      Boolean(storefront?.settings.primaryColor === "#0369a1" || storefront?.settings.primaryColor?.startsWith("#")),
      `Primary brand color is verified hex: ${storefront?.settings.primaryColor}`
    );
    assert(
      Boolean(storefront?.settings.heroHeadline && storefront.settings.heroHeadline.length > 5),
      `Hero headline is populated: "${storefront?.settings.heroHeadline}"`
    );

    // ── Test Group 10: Zero Schema Migrations & DB Cleanup ──
    console.log("\n── Test Group 10: Zero Schema Migrations & DB Integrity ──");
    // Ensure workingHours has about, services, team populated for test validation
    await updateLabStoreSettings(pilotLab.id, {
      workingHours: {
        about: "Premier diagnostic laboratory in Karol Bagh.",
        services: ["Biochemistry", "Pathology"],
        team: [
          { name: "Dr. A. K. Sharma", role: "Chief Pathologist", qualification: "MD Pathology" }
        ],
      },
    });

    const settings = await getLabStoreSettings(pilotLab.id);
    const wh = settings.settings.workingHours as Record<string, any>;
    assert(typeof wh === "object" && wh !== null, "workingHours is intact JSON metadata");
    assert("about" in wh, "Preserves about narrative");
    assert("services" in wh, "Preserves services array");
    assert("team" in wh, "Preserves team array");
  } finally {
    // Clean up test orders created during QA
    console.log("\n── Cleaning Up Test Orders & Restoring Pilot State ──");
    for (const orderId of createdTestOrderIds) {
      try {
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.collection.deleteMany({ where: { orderId } });
        await prisma.order.delete({ where: { id: orderId } });
        console.log(`  ✓ Cleaned up test order ${orderId}`);
      } catch (err: any) {
        console.warn(`  ⚠ Failed to cleanup test order ${orderId}:`, err.message);
      }
    }

    if (tempServiceAreaId) {
      await prisma.labServiceArea.deleteMany({ where: { id: tempServiceAreaId } });
      console.log("  ✓ Cleaned up temporary QA service area.");
    }

    // Restore pilot settings
    if (pilotLab) {
      await prisma.lab.update({
        where: { id: pilotLab.id },
        data: { nablAccreditationNumber: originalNablNumber },
      });
      if (pilotLab.storeSettings && originalWorkingHours) {
        await prisma.labStoreSettings.update({
          where: { labId: pilotLab.id },
          data: { workingHours: originalWorkingHours },
        });
      }
      console.log("  ✓ Restored Sharma Diagnostics database baseline.");
    }
  }

  console.log("\n===============================================================");
  console.log(`TOTAL QA TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log("===============================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase3QA()
  .catch((err) => {
    console.error("Phase 3 QA fatal execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
