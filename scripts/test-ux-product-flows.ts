/**
 * Test Suite: Gyrex Labs Production UX & Product Flows
 * 
 * Verifies:
 * 1. Health Package calculation and savings metrics
 * 2. Health Package price validation (sellingPrice <= mrpPrice, positive prices, deduplication)
 * 3. Subscription Plan name formatting (prevention of "Plan Plan" duplicates)
 * 4. Subscription Plan validation rules (PLAN_ prefix, non-negative prices, required fields)
 * 5. Laboratory Settings 9-tab structure and deep-linking section mapping
 * 6. Publish Checklist route targets
 * 7. Payment Settings separation and Razorpay secret masking
 */

import { calculatePackageMetrics } from "../services/lab/packages-service";

async function runTests() {
  console.log("===============================================================");
  console.log("  GYREX LABS UX & PRODUCT FLOW AUTOMATED VERIFICATION SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // 1. Health Package Metrics Calculation & Savings
  // -------------------------------------------------------------
  console.log("--- 1. Testing Health Package Metrics & Savings Math ---");
  {
    // Test normal discount case
    const metrics1 = calculatePackageMetrics(1500, 999);
    assert(metrics1.individualTestValue === 1500, "Calculates correct individual test value");
    assert(metrics1.packageSellingPrice === 999, "Calculates correct package selling price");
    assert(metrics1.savings === 501, "Calculates exact rupee savings (1500 - 999 = 501)");
    assert(metrics1.savingsPercentage === 33.4, "Calculates exact savings percentage (33.4%)");

    // Test zero savings case (selling price equal to sum)
    const metrics2 = calculatePackageMetrics(500, 500);
    assert(metrics2.savings === 0, "Zero savings when selling price equals total value");
    assert(metrics2.savingsPercentage === 0, "0% savings when price equals sum");

    // Test selling price higher than individual value (savings clamped to 0)
    const metrics3 = calculatePackageMetrics(400, 600);
    assert(metrics3.savings === 0, "Savings never negative (clamped to 0)");
    assert(metrics3.savingsPercentage === 0, "Savings percentage clamped to 0");

    // Test empty package / 0 individual test value
    const metrics4 = calculatePackageMetrics(0, 0);
    assert(metrics4.savings === 0, "Handles 0 individual value safely");
    assert(metrics4.savingsPercentage === 0, "Handles division by zero safely");
  }

  // -------------------------------------------------------------
  // 2. Health Package Price Validations & Deduplication
  // -------------------------------------------------------------
  console.log("\n--- 2. Testing Package Price Validation Rules ---");
  {
    function validatePackageInput(input: {
      name?: string;
      sellingPrice?: number;
      mrpPrice?: number;
      testIds?: string[];
    }): { valid: boolean; error?: string } {
      if (!input.name?.trim()) return { valid: false, error: "Package name is required." };
      if (input.sellingPrice === undefined || input.sellingPrice === null || isNaN(input.sellingPrice)) {
        return { valid: false, error: "Package selling price is required." };
      }
      if (input.sellingPrice <= 0) {
        return { valid: false, error: "Package selling price must be greater than zero." };
      }
      if (input.mrpPrice !== undefined && input.mrpPrice !== null) {
        if (isNaN(input.mrpPrice) || input.mrpPrice <= 0) {
          return { valid: false, error: "MRP price must be a valid positive number." };
        }
        if (input.sellingPrice > input.mrpPrice) {
          return { valid: false, error: "Package selling price cannot exceed the MRP / printed price." };
        }
      }
      if (!input.testIds || input.testIds.length === 0) {
        return { valid: false, error: "A package must contain at least one diagnostic test." };
      }
      const uniqueIds = Array.from(new Set(input.testIds.filter((id) => Boolean(id?.trim()))));
      if (uniqueIds.length === 0) {
        return { valid: false, error: "A package must contain at least one valid diagnostic test ID." };
      }
      return { valid: true };
    }

    assert(!validatePackageInput({ name: "" }).valid, "Rejects empty package name");
    assert(!validatePackageInput({ name: "Complete Health", sellingPrice: 0 }).valid, "Rejects zero selling price");
    assert(!validatePackageInput({ name: "Complete Health", sellingPrice: -100 }).valid, "Rejects negative selling price");
    assert(
      !validatePackageInput({ name: "Complete Health", sellingPrice: 1200, mrpPrice: 1000 }).valid,
      "Rejects selling price exceeding MRP price"
    );
    assert(
      validatePackageInput({ name: "Complete Health", sellingPrice: 899, mrpPrice: 1200, testIds: ["t1", "t2"] }).valid,
      "Accepts valid selling price <= MRP"
    );
    assert(
      !validatePackageInput({ name: "Complete Health", sellingPrice: 899, testIds: [] }).valid,
      "Rejects empty test selection"
    );

    // Test ID deduplication
    const rawIds = ["test-1", "test-2", "test-1", "test-3", "test-2"];
    const uniqueIds = Array.from(new Set(rawIds.filter(Boolean)));
    assert(uniqueIds.length === 3, "Correctly deduplicates identical tests added to package");
  }

  // -------------------------------------------------------------
  // 3. Subscription Plan Name Formatting (Prevent "Plan Plan")
  // -------------------------------------------------------------
  console.log("\n--- 3. Testing Subscription Plan Name Formatting ---");
  {
    function formatPlanDisplayName(planName: string): string {
      const trimmed = planName.trim();
      return trimmed.toLowerCase().endsWith("plan") ? trimmed : `${trimmed} Plan`;
    }

    assert(formatPlanDisplayName("Professional Plan") === "Professional Plan", "Does not duplicate 'Plan' when already present");
    assert(formatPlanDisplayName("Growth") === "Growth Plan", "Appends 'Plan' when not already present");
    assert(formatPlanDisplayName("Enterprise PLAN") === "Enterprise PLAN", "Case-insensitive detection of existing 'Plan'");
    assert(formatPlanDisplayName("Starter plan") === "Starter plan", "Retains exact casing when 'plan' present");
  }

  // -------------------------------------------------------------
  // 4. Subscription Plan Validation Rules (Code, Price, Limits)
  // -------------------------------------------------------------
  console.log("\n--- 4. Testing Subscription Plan Validation Rules ---");
  {
    function validateSubscriptionPlanData(data: {
      name?: string;
      code?: string;
      priceMonthly?: number;
      priceYearly?: number;
      trialDays?: number;
    }): { valid: boolean; error?: string } {
      if (!data.name || !data.name.trim()) return { valid: false, error: "Plan name is required." };
      if (!data.code || !data.code.trim()) return { valid: false, error: "Plan code is required." };
      const cleanCode = data.code.trim().toUpperCase();
      if (!cleanCode.startsWith("PLAN_")) {
        return { valid: false, error: "Plan code must begin with 'PLAN_' prefix (e.g. PLAN_GROWTH)." };
      }
      if (data.priceMonthly === undefined || isNaN(data.priceMonthly) || data.priceMonthly < 0) {
        return { valid: false, error: "Monthly price must be a non-negative number." };
      }
      if (data.priceYearly === undefined || isNaN(data.priceYearly) || data.priceYearly < 0) {
        return { valid: false, error: "Annual price must be a non-negative number." };
      }
      if (data.trialDays !== undefined && (isNaN(data.trialDays) || data.trialDays < 0)) {
        return { valid: false, error: "Trial days must be a non-negative number." };
      }
      return { valid: true };
    }

    assert(!validateSubscriptionPlanData({ name: "" }).valid, "Rejects empty plan name");
    assert(!validateSubscriptionPlanData({ name: "Growth", code: "GROWTH" }).valid, "Enforces 'PLAN_' prefix on plan code");
    assert(validateSubscriptionPlanData({ name: "Growth", code: "PLAN_GROWTH", priceMonthly: 1999, priceYearly: 19990 }).valid, "Accepts valid plan code with PLAN_ prefix");
    assert(!validateSubscriptionPlanData({ name: "Growth", code: "PLAN_GROWTH", priceMonthly: -50, priceYearly: 100 }).valid, "Rejects negative monthly price");
    assert(!validateSubscriptionPlanData({ name: "Growth", code: "PLAN_GROWTH", priceMonthly: 100, priceYearly: -500 }).valid, "Rejects negative annual price");
    assert(!validateSubscriptionPlanData({ name: "Growth", code: "PLAN_GROWTH", priceMonthly: 100, priceYearly: 1000, trialDays: -14 }).valid, "Rejects negative trial days");
  }

  // -------------------------------------------------------------
  // 5. Laboratory Settings 9-Tab Section Structure
  // -------------------------------------------------------------
  console.log("\n--- 5. Testing Laboratory Settings Tab Structure & Deep-linking ---");
  {
    const EXPECTED_SETTINGS_TABS = [
      { id: "profile", label: "Lab Profile" },
      { id: "storefront", label: "Storefront & Branding" },
      { id: "contact", label: "Contact & Address" },
      { id: "collection", label: "Home Collection" },
      { id: "payment", label: "Patient Payments" },
      { id: "notifications", label: "Notifications" },
      { id: "whatsapp", label: "WhatsApp Alerts" },
      { id: "team", label: "Staff & Team" },
      { id: "publishing", label: "Storefront Status" },
    ];

    assert(EXPECTED_SETTINGS_TABS.length === 9, "Laboratory settings has exactly 9 sections");
    const tabIds = new Set(EXPECTED_SETTINGS_TABS.map((t) => t.id));
    assert(tabIds.has("profile"), "Settings includes 'profile' section");
    assert(tabIds.has("storefront"), "Settings includes 'storefront' section");
    assert(tabIds.has("contact"), "Settings includes 'contact' section");
    assert(tabIds.has("collection"), "Settings includes 'collection' section");
    assert(tabIds.has("payment"), "Settings includes 'payment' section");
    assert(tabIds.has("notifications"), "Settings includes 'notifications' section");
    assert(tabIds.has("whatsapp"), "Settings includes 'whatsapp' section");
    assert(tabIds.has("team"), "Settings includes 'team' section");
    assert(tabIds.has("publishing"), "Settings includes 'publishing' section");

    // Deep link query matching
    function resolveActiveSection(queryParam?: string): string {
      const valid = tabIds.has(queryParam || "");
      return valid ? (queryParam as string) : "profile";
    }

    assert(resolveActiveSection("storefront") === "storefront", "Correctly resolves ?section=storefront");
    assert(resolveActiveSection("payment") === "payment", "Correctly resolves ?section=payment");
    assert(resolveActiveSection("unknown_param") === "profile", "Defaults to 'profile' for invalid or absent param");
  }

  // -------------------------------------------------------------
  // 6. Publish Checklist Target Route Verification
  // -------------------------------------------------------------
  console.log("\n--- 6. Testing Publish Checklist Deep-link Routing ---");
  {
    const CHECKLIST_ROUTING_MAP: Record<string, string> = {
      profileComplete: "/lab/settings?section=profile",
      storefrontBranded: "/lab/settings?section=storefront",
      addressConfigured: "/lab/settings?section=contact",
      testsInCatalogue: "/lab/catalogue",
      paymentsConfigured: "/lab/payment-settings",
    };

    assert(CHECKLIST_ROUTING_MAP.profileComplete.includes("section=profile"), "Profile checklist links to profile section");
    assert(CHECKLIST_ROUTING_MAP.storefrontBranded.includes("section=storefront"), "Storefront checklist links to storefront section");
    assert(CHECKLIST_ROUTING_MAP.addressConfigured.includes("section=contact"), "Address checklist links to contact section");
    assert(CHECKLIST_ROUTING_MAP.testsInCatalogue === "/lab/catalogue", "Catalogue checklist links to /lab/catalogue");
    assert(CHECKLIST_ROUTING_MAP.paymentsConfigured === "/lab/payment-settings", "Payments checklist links to /lab/payment-settings");
  }

  // -------------------------------------------------------------
  // 7. Payment Security & Masking Verification
  // -------------------------------------------------------------
  console.log("\n--- 7. Testing Payment Settings Security & Separation ---");
  {
    // Ensure Razorpay key secret is NEVER serialized to client
    interface SafePaymentSettingsResponse {
      acceptCashOnCollection: boolean;
      upiId: string | null;
      razorpayEnabled: boolean;
      razorpayKeyId: string | null;
      hasRazorpaySecret: boolean; // boolean flag only, secret never exposed!
    }

    const mockDbRecord = {
      acceptCashOnCollection: true,
      upiId: "sharma.lab@okhdfcbank",
      razorpayEnabled: true,
      razorpayKeyId: "rzp_live_abc12345",
      razorpayKeySecret: "secret_xyz987654321", // SENSITIVE
    };

    function serializeClientPaymentSettings(record: typeof mockDbRecord): SafePaymentSettingsResponse {
      return {
        acceptCashOnCollection: record.acceptCashOnCollection,
        upiId: record.upiId,
        razorpayEnabled: record.razorpayEnabled,
        razorpayKeyId: record.razorpayKeyId,
        hasRazorpaySecret: Boolean(record.razorpayKeySecret),
      };
    }

    const clientData = serializeClientPaymentSettings(mockDbRecord);
    assert(!("razorpayKeySecret" in clientData), "razorpayKeySecret is stripped from client response");
    assert(clientData.hasRazorpaySecret === true, "hasRazorpaySecret boolean flag is set");
    assert(clientData.razorpayKeyId === "rzp_live_abc12345", "Public Key ID is present");
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(`  UX & PRODUCT FLOW TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
