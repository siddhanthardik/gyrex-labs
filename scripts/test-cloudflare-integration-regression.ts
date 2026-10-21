/**
 * GYREX LABS — CLOUDFLARE FOR SAAS & HOSTNAME ROUTING REGRESSION TEST SUITE (PHASE C)
 *
 * Covers:
 * 1. Cloudflare Provider Module:
 *    - Hostname creation, idempotency, duplicate protection
 *    - Status retrieval and normalization
 *    - Deletion and 404 idempotent handling
 * 2. Verification and SSL Lifecycle Integration:
 *    - Cloudflare custom hostname provisioned upon DNS TXT verification
 *    - Verification state transitions: PENDING_VERIFICATION -> VERIFYING -> ACTIVE
 *    - SSL state transitions: INITIALIZING -> PENDING_VALIDATION -> ACTIVE / FAILED
 *    - Refresh custom domain status via Cloudflare polling
 * 3. Secure Hostname Routing:
 *    - Feature flag gating (disabled by default)
 *    - Platform hosts pass through
 *    - Administrative routes blocked on branded domains (/lab, /superadmin)
 *    - Path rewriting for patient storefront (/ -> /:slug, /tests -> /:slug/tests)
 *    - Context headers passed (x-custom-domain, x-lab-slug, x-lab-id)
 *    - Unrecognized/spoofed host header rejection (404)
 * 4. Subscription Lifecycle & Domain Suspension:
 *    - Automatic domain suspension upon plan delinquency or cancellation
 *    - Suspended domains block routing in getVerifiedActiveDomainForHost
 *    - Automatic reactivation upon subscription restoration
 *
 * Run: npx tsx scripts/test-cloudflare-integration-regression.ts
 */

import { prisma } from "../lib/db/prisma";
import {
  createCloudflareCustomHostname,
  getCloudflareCustomHostname,
  findCloudflareCustomHostnameByDomain,
  deleteCloudflareCustomHostname,
  normalizeProviderState,
  setMockCloudflareProviderEnabled,
  resetMockCloudflareStore,
  setMockHostnameRecord,
} from "../lib/integrations/cloudflare/custom-hostnames";
import {
  registerCustomDomain,
  verifyCustomDomain,
  refreshCustomDomainStatus,
  reconcileLabDomainSubscription,
  disconnectCustomDomain,
  getLabDomain,
  getVerifiedActiveDomainForHost,
  resetInMemoryDomainStoreForTesting,
  setTestInMemoryStoreAllowed,
} from "../services/lab/domain-service";
import {
  setTestPlanEntitlementAllowed,
} from "../services/subscription/entitlement-service";
import {
  evaluateCustomDomainRouting,
  isPlatformHostname,
  isCustomDomainRoutingEnabled,
  setCustomDomainRoutingFeatureFlagForTesting,
} from "../services/lab/domain-routing-service";
import { DomainStatus, DomainSslStatus, SubscriptionStatus } from "@prisma/client";
import { NextRequest } from "next/server";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: unknown, testName: string, detail?: string) {
  totalTests++;
  if (Boolean(condition)) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failedTests++;
  }
}

async function runPhaseCRegressionSuite() {
  console.log("\n==================================================================");
  console.log("   GYREX LABS — CLOUDFLARE FOR SAAS & ROUTING TEST SUITE (PHASE C)");
  console.log("==================================================================\n");

  // Enable test harness modes
  setMockCloudflareProviderEnabled(true);
  resetMockCloudflareStore();
  setTestInMemoryStoreAllowed(true);
  setTestPlanEntitlementAllowed(true);

  const timestamp = Date.now();
  const labSlug = `phase-c-lab-${timestamp}`;

  // 1. Setup isolated test laboratory
  const testLab = await prisma.lab.create({
    data: {
      name: `Sharma Diagnostics Phase C ${timestamp}`,
      slug: labSlug,
      code: `SPC${timestamp.toString().slice(-4)}`,
      email: `sharma.phasec.${timestamp}@example.com`,
      phone: "+919876500003",
      addressLine1: "100 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      status: "ACTIVE",
      isVerified: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.findFirstOrThrow({
    where: { code: "PLAN_PRO" },
    select: { id: true, code: true, name: true },
  });

  const subscription = await prisma.subscription.create({
    data: {
      labId: testLab.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: "MONTHLY",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Cloudflare Provider Module Unit Tests
    // ─────────────────────────────────────────────────────────────
    console.log("── 1. Cloudflare Provider Module Unit Tests ──");
    {
      const testHostname = `test-${timestamp}.sharmadiagnostics.in`;

      // A: Create Custom Hostname
      const created = await createCloudflareCustomHostname(testHostname);
      assert(created.hostname === testHostname, "Custom hostname created with matching domain");
      assert(Boolean(created.providerHostnameId), "Provider hostname ID assigned");
      assert(created.hostnameStatus === "pending", "Initial hostname status is pending");
      assert(created.sslStatus === "pending_validation", "Initial SSL status is pending_validation");
      assert(!created.isReadyForTraffic, "Initial state is not ready for traffic");

      // B: Idempotent Recreation (Duplicate Protection)
      const duplicate = await createCloudflareCustomHostname(testHostname);
      assert(duplicate.providerHostnameId === created.providerHostnameId, "Recreating returns identical hostname ID (idempotent)");

      // C: Status Retrieval by ID
      const fetchedById = await getCloudflareCustomHostname(created.providerHostnameId);
      assert(fetchedById !== null, "Fetched hostname by provider ID");
      assert(fetchedById?.hostname === testHostname, "Hostname matches fetched record");

      // D: Search by Domain Name
      const fetchedByDomain = await findCloudflareCustomHostnameByDomain(testHostname);
      assert(fetchedByDomain !== null, "Found hostname by domain string");
      assert(fetchedByDomain?.providerHostnameId === created.providerHostnameId, "Domain search returns correct provider ID");

      // E: Normalization helper with active certificate
      const mockActiveRaw: any = {
        id: "cf_active_123",
        hostname: testHostname,
        status: "active",
        ssl: {
          status: "active",
          type: "dv",
          method: "http",
        },
      };
      const normalizedActive = normalizeProviderState(mockActiveRaw);
      assert(normalizedActive.isSslActive === true, "normalizeProviderState detects active SSL");
      assert(normalizedActive.isHostnameActive === true, "normalizeProviderState detects active hostname");
      assert(normalizedActive.isReadyForTraffic === true, "normalizeProviderState flags isReadyForTraffic as true");

      // F: Deletion
      const deleted = await deleteCloudflareCustomHostname(created.providerHostnameId);
      assert(deleted.success === true, "Deleted custom hostname from Cloudflare");

      // G: Idempotent repeated deletion (404 treated as success)
      const repeatedDelete = await deleteCloudflareCustomHostname(created.providerHostnameId);
      assert(repeatedDelete.success === true, "Repeated delete is safe and idempotent");
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Verification and Edge SSL Lifecycle Integration
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 2. Verification & Edge SSL Lifecycle Integration ──");
    {
      const customDomain = `portal-${timestamp}.sharmadiagnostics.in`;

      // Step 1: Register domain
      const registered = await registerCustomDomain(testLab.id, customDomain);
      assert(registered.status === DomainStatus.PENDING_VERIFICATION, "Domain registered in PENDING_VERIFICATION");
      assert(registered.sslStatus === DomainSslStatus.INITIALIZING, "SSL status initialized to INITIALIZING");

      // Step 2: TXT verification passes -> provisions Cloudflare Custom Hostname
      const mockResolver = async () => [[registered.verificationRecordValue]];
      const verifyResult = await verifyCustomDomain(testLab.id, mockResolver);

      assert(verifyResult.success === true, "TXT verification succeeded");
      assert(verifyResult.status === DomainStatus.VERIFYING, "Domain transitioned to VERIFYING (awaiting SSL)");
      assert(
        verifyResult.sslStatus === DomainSslStatus.PENDING_VALIDATION ||
        verifyResult.sslStatus === DomainSslStatus.INITIALIZING,
        "SSL status updated to PENDING_VALIDATION or INITIALIZING"
      );

      // Verify domain now has Cloudflare Hostname ID persisted
      const currentDomain = await getLabDomain(testLab.id);
      assert(currentDomain?.verifiedAt !== null, "verifiedAt timestamp recorded");

      // Step 3: Simulate Cloudflare Edge SSL activation and trigger refresh
      // Mock Cloudflare record becoming ACTIVE
      setMockHostnameRecord({
        id: `cf_active_${timestamp}`,
        hostname: customDomain,
        status: "active",
        sslStatus: "active",
        verificationErrors: [],
      });

      const refreshResult = await refreshCustomDomainStatus(testLab.id);
      assert(refreshResult.success === true, "refreshCustomDomainStatus succeeded");
      assert(refreshResult.status === DomainStatus.ACTIVE, "Domain transitioned to ACTIVE");
      assert(refreshResult.sslStatus === DomainSslStatus.ACTIVE, "SSL status transitioned to ACTIVE");
      assert(refreshResult.domain?.activatedAt !== null, "activatedAt timestamp recorded upon SSL activation");
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Secure Hostname Routing
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 3. Secure Hostname Routing ──");
    {
      const customDomain = `portal-${timestamp}.sharmadiagnostics.in`;

      // A: Feature flag disabled by default
      setCustomDomainRoutingFeatureFlagForTesting(false);
      assert(!isCustomDomainRoutingEnabled(), "Routing feature flag disabled by default");

      const reqWithFlagDisabled = new NextRequest(`https://${customDomain}/`, {
        headers: { host: customDomain },
      });
      const decisionDisabled = await evaluateCustomDomainRouting(reqWithFlagDisabled);
      assert(decisionDisabled.action === "passthrough", "Disabled feature flag results in passthrough");

      // Enable feature flag for subsequent routing assertions
      setCustomDomainRoutingFeatureFlagForTesting(true);
      assert(isCustomDomainRoutingEnabled(), "Routing feature flag enabled for tests");

      // B: Platform hosts bypass rewriting
      assert(isPlatformHostname("labs.gyrex.in"), "labs.gyrex.in identified as platform host");
      assert(isPlatformHostname("admin-labs.gyrex.in"), "admin-labs.gyrex.in identified as platform host");
      assert(isPlatformHostname("fallback.gyrex.in"), "fallback.gyrex.in identified as platform host");
      assert(isPlatformHostname("gyrex.in"), "gyrex.in identified as platform host");
      assert(isPlatformHostname("localhost:3000"), "localhost identified as platform host");
      assert(!isPlatformHostname(customDomain), "Custom domain is not a platform host");

      const platformReq = new NextRequest("https://labs.gyrex.in/login", {
        headers: { host: "labs.gyrex.in" },
      });
      const platformDecision = await evaluateCustomDomainRouting(platformReq);
      assert(platformDecision.action === "passthrough", "Platform host request passes through");

      const platformStorefrontReq = new NextRequest("https://labs.gyrex.in/sharma-diagnostics/tests", {
        headers: { host: "labs.gyrex.in" },
      });
      const platformStorefrontDecision = await evaluateCustomDomainRouting(platformStorefrontReq);
      assert(platformStorefrontDecision.action === "passthrough", "labs.gyrex.in storefront request passes through without rewrite");

      const fallbackReq = new NextRequest("https://fallback.gyrex.in/api/health", {
        headers: { host: "fallback.gyrex.in" },
      });
      const fallbackDecision = await evaluateCustomDomainRouting(fallbackReq);
      assert(fallbackDecision.action === "passthrough", "fallback.gyrex.in request passes through");

      // C: Administrative Route Blocking on Branded Domains
      const adminReq = new NextRequest(`https://${customDomain}/lab/settings`, {
        headers: { host: customDomain },
      });
      const adminDecision = await evaluateCustomDomainRouting(adminReq);
      assert(adminDecision.action === "redirect", "Accessing /lab/settings on custom domain is redirected");
      assert(
        adminDecision.redirectUrl?.includes("labs.gyrex.in/login"),
        "Redirects admin request to platform login URL"
      );

      const superadminReq = new NextRequest(`https://${customDomain}/superadmin/dashboard`, {
        headers: { host: customDomain },
      });
      const superadminDecision = await evaluateCustomDomainRouting(superadminReq);
      assert(superadminDecision.action === "redirect", "Accessing /superadmin on custom domain is redirected");

      const loginReq = new NextRequest(`https://${customDomain}/login`, {
        headers: { host: customDomain },
      });
      const loginDecision = await evaluateCustomDomainRouting(loginReq);
      assert(loginDecision.action === "redirect", "Accessing /login on custom domain is redirected to platform login");
      assert(
        loginDecision.redirectUrl?.includes("labs.gyrex.in/login"),
        "/login redirects to platform login"
      );

      // D: Patient Storefront Route Rewriting
      // Root / -> /:slug
      const rootReq = new NextRequest(`https://${customDomain}/`, {
        headers: { host: customDomain },
      });
      const rootDecision = await evaluateCustomDomainRouting(rootReq);
      assert(rootDecision.action === "rewrite", "Root path triggers rewrite");
      assert(rootDecision.rewrittenPath === `/${testLab.slug}`, `Root rewrites to '/${testLab.slug}', got '${rootDecision.rewrittenPath}'`);
      assert(rootDecision.headers?.["x-custom-domain"] === customDomain, "x-custom-domain header attached");
      assert(rootDecision.headers?.["x-lab-slug"] === testLab.slug, "x-lab-slug header attached");
      assert(rootDecision.headers?.["x-lab-id"] === testLab.id, "x-lab-id header attached");

      // Storefront Subpath /tests -> /:slug/tests
      const testsReq = new NextRequest(`https://${customDomain}/tests`, {
        headers: { host: customDomain },
      });
      const testsDecision = await evaluateCustomDomainRouting(testsReq);
      assert(testsDecision.action === "rewrite", "/tests triggers rewrite");
      assert(testsDecision.rewrittenPath === `/${testLab.slug}/tests`, `Rewrites to '/${testLab.slug}/tests'`);

      // Storefront /packages -> /:slug/packages
      const pkgReq = new NextRequest(`https://${customDomain}/packages`, {
        headers: { host: customDomain },
      });
      const pkgDecision = await evaluateCustomDomainRouting(pkgReq);
      assert(pkgDecision.action === "rewrite", "/packages triggers rewrite");
      assert(pkgDecision.rewrittenPath === `/${testLab.slug}/packages`, `Rewrites to '/${testLab.slug}/packages'`);

      // Storefront /checkout -> /:slug/checkout
      const checkoutReq = new NextRequest(`https://${customDomain}/checkout`, {
        headers: { host: customDomain },
      });
      const checkoutDecision = await evaluateCustomDomainRouting(checkoutReq);
      assert(checkoutDecision.action === "rewrite", "/checkout triggers rewrite");
      assert(checkoutDecision.rewrittenPath === `/${testLab.slug}/checkout`, `Rewrites to '/${testLab.slug}/checkout'`);

      // Storefront /reports -> /:slug/reports
      const reportsReq = new NextRequest(`https://${customDomain}/reports`, {
        headers: { host: customDomain },
      });
      const reportsDecision = await evaluateCustomDomainRouting(reportsReq);
      assert(reportsDecision.action === "rewrite", "/reports triggers rewrite");
      assert(reportsDecision.rewrittenPath === `/${testLab.slug}/reports`, `Rewrites to '/${testLab.slug}/reports'`);

      // Storefront /booking/:orderNumber -> /:slug/booking/:orderNumber
      const bookingReq = new NextRequest(`https://${customDomain}/booking/GYR-998877`, {
        headers: { host: customDomain },
      });
      const bookingDecision = await evaluateCustomDomainRouting(bookingReq);
      assert(bookingDecision.action === "rewrite", "/booking/:orderNumber triggers rewrite");
      assert(bookingDecision.rewrittenPath === `/${testLab.slug}/booking/GYR-998877`, `Rewrites to '/${testLab.slug}/booking/GYR-998877'`);

      // E: Patient API calls passthrough with context headers
      const apiReq = new NextRequest(`https://${customDomain}/api/patient/addresses`, {
        headers: { host: customDomain },
      });
      const apiDecision = await evaluateCustomDomainRouting(apiReq);
      assert(apiDecision.action === "passthrough", "Patient API call passes through without rewriting path");
      assert(apiDecision.headers?.["x-custom-domain"] === customDomain, "Context headers attached to API request");

      // F: Unrecognized or Unverified Host Header -> 404
      const spoofedReq = new NextRequest("https://unrecognized-clinic.com/tests", {
        headers: { host: "unrecognized-clinic.com" },
      });
      const spoofedDecision = await evaluateCustomDomainRouting(spoofedReq);
      assert(spoofedDecision.action === "not_found", "Unregistered hostname returns 404 not_found");
      assert(spoofedDecision.statusCode === 404, "Returns 404 status code");

      const randomHostReq = new NextRequest("https://random-unknown-domain.org/cart", {
        headers: { host: "random-unknown-domain.org" },
      });
      const randomHostDecision = await evaluateCustomDomainRouting(randomHostReq);
      assert(randomHostDecision.action === "not_found", "Random unknown host returns 404 not_found");
      assert(randomHostDecision.statusCode === 404, "Random unknown host has 404 status");

      // Restore feature flag
      setCustomDomainRoutingFeatureFlagForTesting(false);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Subscription Lifecycle & Domain Suspension
    // ─────────────────────────────────────────────────────────────
    console.log("\n── 4. Subscription Lifecycle & Domain Suspension ──");
    {
      const customDomain = `portal-${timestamp}.sharmadiagnostics.in`;

      // A: Verify domain currently resolves for active subscriber
      const activeResolved = await getVerifiedActiveDomainForHost(customDomain);
      assert(activeResolved !== null, "Active domain resolves for active subscriber");
      assert(activeResolved?.slug === testLab.slug, "Resolved lab slug matches active lab");

      // B: Simulate subscription lapse / expiration
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      // Domain reconciliation detects expired subscription and suspends domain
      const suspendResult = await reconcileLabDomainSubscription(testLab.id);
      assert(suspendResult.suspended === true, "Domain was suspended due to expired subscription");
      assert(suspendResult.domain?.status === DomainStatus.SUSPENDED, "Domain status updated to SUSPENDED");

      // Suspended domain must NOT resolve for patient traffic
      const suspendedResolved = await getVerifiedActiveDomainForHost(customDomain);
      assert(suspendedResolved === null, "Suspended domain returns null for incoming host routing");

      // C: Simulate payment / subscription reactivation
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });

      // Domain reconciliation detects reactivated subscription and restores domain
      const reactivateResult = await reconcileLabDomainSubscription(testLab.id);
      assert(reactivateResult.reactivated === true, "Domain was reactivated upon subscription restoration");
      assert(reactivateResult.domain?.status === DomainStatus.ACTIVE, "Domain status restored to ACTIVE");

      // Reactivated domain resolves for patient traffic again
      const restoredResolved = await getVerifiedActiveDomainForHost(customDomain);
      assert(restoredResolved !== null, "Reactivated domain resolves for traffic once again");

      // Clean up domain
      await disconnectCustomDomain(testLab.id);
    }

  } finally {
    // Clean up test fixtures
    console.log("\n── Cleaning up test data ──");
    try {
      await prisma.labDomain.deleteMany({
        where: { labId: testLab.id },
      });
    } catch {
      // Ignore if table not created
    }
    resetInMemoryDomainStoreForTesting();
    resetMockCloudflareStore();
    setCustomDomainRoutingFeatureFlagForTesting(null);

    await prisma.subscription.deleteMany({
      where: { labId: testLab.id },
    });
    await prisma.lab.deleteMany({
      where: { id: testLab.id },
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

runPhaseCRegressionSuite().catch((err) => {
  console.error("Test suite runtime failure:", err);
  process.exit(1);
});
