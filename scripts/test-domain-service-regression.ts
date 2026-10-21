/**
 * Gyrex Labs — Custom Branded Domains (Phase A Foundation) Regression Test Suite
 *
 * Verifies:
 * 1. Hostname normalization
 * 2. Hostname validation & RFC/Security checks (IP rejection, platform domain protection, internal hostname rejection)
 * 3. Apex vs subdomain detection
 * 4. Cryptographic verification challenge generation
 * 5. Subscription entitlement logic
 * 6. Verified active domain lookup logic
 *
 * Run via: npx tsx scripts/test-domain-service-regression.ts
 */

import {
  normalizeHostname,
  validateCustomHostname,
  generateDomainVerificationChallenge,
  sanitizeDomainForPublic,
} from "../services/lab/domain-service";
import {
  isLabCustomDomainEntitled,
  assertLabCanConfigureCustomDomain,
  getLabEntitlementsSummary,
} from "../services/subscription/entitlement-service";
import { DomainStatus, DomainSslStatus, LabDomain } from "@prisma/client";

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: unknown, message: string) {
  totalAssertions++;
  if (Boolean(condition)) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTestSuite() {
  console.log("\n==================================================================");
  console.log("   GYREX LABS — CUSTOM BRANDED DOMAINS REGRESSION TEST SUITE");
  console.log("==================================================================\n");

  // ─────────────────────────────────────────────────────────────
  // 1. Hostname Normalization Tests
  // ─────────────────────────────────────────────────────────────
  console.log("── 1. Hostname Normalization ──");
  {
    assert(
      normalizeHostname("https://sharmadiagnostics.in/") === "sharmadiagnostics.in",
      "Strips https:// scheme and trailing slash"
    );
    assert(
      normalizeHostname("http://SHARMADIAGNOSTICS.IN:3005/packages?sort=asc") === "sharmadiagnostics.in",
      "Strips http://, converts uppercase to lowercase, removes port and query params"
    );
    assert(
      normalizeHostname("  portal.diagnostics.co.in.  ") === "portal.diagnostics.co.in",
      "Trims surrounding whitespace and removes trailing FQDN dot"
    );
    assert(
      normalizeHostname("//tests.lab.com/#section") === "tests.lab.com",
      "Strips protocol-relative slashes and URL fragments"
    );
    assert(normalizeHostname("") === "", "Handles empty input safely");
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Hostname Validation & RFC / Security Rejections
  // ─────────────────────────────────────────────────────────────
  console.log("\n── 2. Hostname Security & RFC Validation ──");
  {
    // Rejection of IP Addresses
    const ipRes1 = validateCustomHostname("127.0.0.1");
    assert(!ipRes1.valid && ipRes1.error?.includes("IP"), "Rejects localhost IPv4 (127.0.0.1)");

    const ipRes2 = validateCustomHostname("192.168.1.1");
    assert(!ipRes2.valid && ipRes2.error?.includes("IP"), "Rejects private IPv4 (192.168.1.1)");

    const ipRes3 = validateCustomHostname("8.8.8.8");
    assert(!ipRes3.valid && ipRes3.error?.includes("IP"), "Rejects public IPv4 (8.8.8.8)");

    const ipRes4 = validateCustomHostname("::1");
    assert(!ipRes4.valid && ipRes4.error?.includes("IPv6"), "Rejects IPv6 address (::1)");

    // Rejection of Gyrex Platform Domains (Anti-hijacking)
    const gyrexRes1 = validateCustomHostname("gyrex.in");
    assert(!gyrexRes1.valid && gyrexRes1.error?.includes("Gyrex platform"), "Rejects root platform domain (gyrex.in)");

    const gyrexRes2 = validateCustomHostname("labs.gyrex.in");
    assert(!gyrexRes2.valid && gyrexRes2.error?.includes("Gyrex platform"), "Rejects labs.gyrex.in");

    const gyrexRes3 = validateCustomHostname("admin-labs.gyrex.in");
    assert(!gyrexRes3.valid && gyrexRes3.error?.includes("Gyrex platform"), "Rejects admin-labs.gyrex.in");

    const gyrexRes4 = validateCustomHostname("rogue.labs.gyrex.in");
    assert(!gyrexRes4.valid && gyrexRes4.error?.includes("Gyrex platform"), "Rejects arbitrary *.gyrex.in subdomain");

    // Rejection of Internal & Reserved Domains
    const localRes1 = validateCustomHostname("localhost");
    assert(!localRes1.valid && localRes1.error?.includes("Internal or reserved"), "Rejects localhost");

    const localRes2 = validateCustomHostname("diagnostic.local");
    assert(!localRes2.valid && localRes2.error?.includes("Internal or reserved"), "Rejects .local domain");

    const localRes3 = validateCustomHostname("backend.internal");
    assert(!localRes3.valid && localRes3.error?.includes("Internal or reserved"), "Rejects .internal domain");

    const localRes4 = validateCustomHostname("darklab.onion");
    assert(!localRes4.valid && localRes4.error?.includes("Internal or reserved"), "Rejects .onion domain");

    // Rejection of Malformed / Invalid Hostnames
    const malformed1 = validateCustomHostname("sharma_diagnostics.com");
    assert(!malformed1.valid && malformed1.error?.includes("invalid characters"), "Rejects underscores in hostname");

    const malformed2 = validateCustomHostname("-sharma.com");
    assert(!malformed2.valid && malformed2.error?.includes("start and end with a letter"), "Rejects leading hyphen in label");

    const malformed3 = validateCustomHostname("sharma-.com");
    assert(!malformed3.valid && malformed3.error?.includes("start and end with a letter"), "Rejects trailing hyphen in label");

    const malformed4 = validateCustomHostname("sharma..com");
    assert(!malformed4.valid && malformed4.error?.includes("consecutive dots"), "Rejects consecutive dots");

    const malformed5 = validateCustomHostname("sharma");
    assert(!malformed5.valid && malformed5.error?.includes("TLD"), "Rejects hostname without TLD");

    const malformed6 = validateCustomHostname("sharma.123");
    assert(!malformed6.valid && malformed6.error?.includes("TLD must be alphabetic"), "Rejects numeric TLD");
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Valid Hostnames & Apex vs Subdomain Detection
  // ─────────────────────────────────────────────────────────────
  console.log("\n── 3. Valid Custom Hostnames & Apex Detection ──");
  {
    const apex1 = validateCustomHostname("sharmadiagnostics.in");
    assert(apex1.valid && apex1.isApex === true, "Valid apex domain (sharmadiagnostics.in) detected as isApex: true");

    const apex2 = validateCustomHostname("citylab.org");
    assert(apex2.valid && apex2.isApex === true, "Valid apex domain (citylab.org) detected as isApex: true");

    const apex3 = validateCustomHostname("health-care.co.in");
    assert(apex3.valid && apex3.isApex === true, "Valid multi-part ccTLD apex (health-care.co.in) detected as isApex: true");

    const sub1 = validateCustomHostname("tests.sharmadiagnostics.in");
    assert(sub1.valid && sub1.isApex === false, "Valid subdomain (tests.sharmadiagnostics.in) detected as isApex: false");

    const sub2 = validateCustomHostname("portal.health-care.co.in");
    assert(sub2.valid && sub2.isApex === false, "Valid subdomain on ccTLD (portal.health-care.co.in) detected as isApex: false");

    const sub3 = validateCustomHostname("booking.citylab.org");
    assert(sub3.valid && sub3.isApex === false, "Valid subdomain (booking.citylab.org) detected as isApex: false");
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Cryptographic Verification Challenge Generation
  // ─────────────────────────────────────────────────────────────
  console.log("\n── 4. Verification Challenge Generation ──");
  {
    const challenge1 = generateDomainVerificationChallenge("sharmadiagnostics.in");
    const challenge2 = generateDomainVerificationChallenge("sharmadiagnostics.in");

    assert(challenge1.token.length === 48, "Generated token is 48 hex characters (24 cryptographically random bytes)");
    assert(challenge1.token !== challenge2.token, "Tokens are uniquely generated on consecutive calls (no collisions)");
    assert(
      challenge1.recordName === "_gyrex-challenge.sharmadiagnostics.in",
      "Challenge record name correctly formatted as _gyrex-challenge.<domain>"
    );
    assert(
      challenge1.recordValue === `gyrex-domain-verification=${challenge1.token}`,
      "Challenge record value formatted as gyrex-domain-verification=<token>"
    );
    assert(challenge1.cnameTarget === "fallback.gyrex.in", "CNAME target matches Gyrex fallback origin");
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Public Record Sanitization (Secret Protection)
  // ─────────────────────────────────────────────────────────────
  console.log("\n── 5. Safe Domain Presentation & Secret Protection ──");
  {
    const mockRecord: LabDomain = {
      id: "dom_123456",
      labId: "lab_abc789",
      domain: "sharmadiagnostics.in",
      isApex: true,
      status: DomainStatus.PENDING_VERIFICATION,
      sslStatus: DomainSslStatus.INITIALIZING,
      verificationToken: "secret_token_123",
      verificationRecordName: "_gyrex-challenge.sharmadiagnostics.in",
      verificationRecordValue: "gyrex-domain-verification=secret_token_123",
      cnameTarget: "fallback.gyrex.in",
      cloudflareHostnameId: "cf_host_secret_id",
      cloudflareSslStatus: "pending",
      verificationErrors: null,
      lastCheckedAt: null,
      verifiedAt: null,
      activatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sanitized = sanitizeDomainForPublic(mockRecord);
    assert(sanitized.id === mockRecord.id, "Sanitized record retains id");
    assert(sanitized.domain === mockRecord.domain, "Sanitized record retains domain");
    assert(sanitized.cnameTarget === mockRecord.cnameTarget, "Sanitized record exposes public CNAME target");
    assert(
      !("cloudflareHostnameId" in sanitized),
      "Sanitized record does NOT leak internal cloudflareHostnameId"
    );
    assert(
      !("cloudflareSslStatus" in sanitized),
      "Sanitized record does NOT leak raw cloudflareSslStatus"
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Subscription Entitlement Functions Safety
  // ─────────────────────────────────────────────────────────────
  console.log("\n── 6. Subscription Entitlement Fail-Closed Behavior ──");
  {
    // Empty lab ID should fail closed
    const emptyEntitled = await isLabCustomDomainEntitled("");
    assert(emptyEntitled === false, "Empty labId fails closed (returns false)");

    // Non-existent lab ID should fail closed
    const nonExistentEntitled = await isLabCustomDomainEntitled("non_existent_lab_99999");
    assert(nonExistentEntitled === false, "Non-existent lab fails closed (returns false)");

    // assertLabCanConfigureCustomDomain should throw 403
    let errorThrown = false;
    let statusCode = 0;
    try {
      await assertLabCanConfigureCustomDomain("non_existent_lab_99999");
    } catch (err: any) {
      errorThrown = true;
      statusCode = err.statusCode || 0;
    }
    assert(errorThrown, "assertLabCanConfigureCustomDomain throws AuthorizationError for ineligible lab");
    assert(statusCode === 403, "assertLabCanConfigureCustomDomain returns HTTP 403 status code");

    // Summary test
    const summary = await getLabEntitlementsSummary("non_existent_lab_99999");
    assert(summary.isCustomDomainEntitled === false, "Summary reports isCustomDomainEntitled: false for ineligible lab");
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log("\n==================================================================");
  console.log(`  Tests Passed: ${passedAssertions} / ${totalAssertions}`);
  console.log(`  Tests Failed: ${failedAssertions}`);
  console.log("==================================================================\n");

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite runtime failure:", err);
  process.exit(1);
});
