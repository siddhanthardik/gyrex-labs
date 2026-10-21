import { prisma } from "@/lib/db/prisma";
import { DomainStatus, DomainSslStatus, LabDomain, LabStatus } from "@prisma/client";
import { normalizeHostname } from "@/lib/utils/hostname";

export { normalizeHostname };

export interface DomainValidationResult {
  valid: boolean;
  error?: string;
  isApex?: boolean;
}

export interface DomainChallengeDetails {
  token: string;
  recordName: string;
  recordValue: string;
  cnameTarget: string;
}

export interface SafeLabDomain {
  id: string;
  labId: string;
  domain: string;
  isApex: boolean;
  status: DomainStatus;
  sslStatus: DomainSslStatus;
  verificationRecordName: string;
  verificationRecordValue: string;
  cnameTarget: string;
  verificationErrors: string | null;
  lastCheckedAt: Date | null;
  verifiedAt: Date | null;
  activatedAt: Date | null;
  createdAt: Date;
}

// Blocked internal or private TLDs/hostnames
const BLOCKED_INTERNAL_SUFFIXES = [
  "localhost",
  ".local",
  ".internal",
  ".lan",
  ".localdomain",
  ".home",
  ".corp",
  ".test",
  ".example",
  ".invalid",
  ".onion",
];

// Common second-level domains for multi-part ccTLDs (e.g. example.co.in, example.org.uk)
const KNOWN_SECOND_LEVEL_DOMAINS = new Set([
  "co", "com", "org", "net", "gov", "edu", "ac", "res", "gen", "firm", "ind",
]);

/**
 * Validates a custom domain against RFC standards and Gyrex platform security policies.
 * Strict rules:
 * - Rejects IP addresses (v4 and v6)
 * - Rejects Gyrex-owned platform domains (*.gyrex.in, gyrex.in)
 * - Rejects internal / private / reserved hostnames (localhost, .local, .internal)
 * - Rejects invalid characters, excessive lengths, or malformed labels
 */
export function validateCustomHostname(raw: string): DomainValidationResult {
  const rawTrimmed = (raw || "").trim().toLowerCase();

  // Reject IPv6 addresses explicitly (bracketed or raw colon-separated)
  if (
    rawTrimmed.startsWith("[") ||
    rawTrimmed.startsWith(":") ||
    (rawTrimmed.match(/:/g) || []).length >= 2
  ) {
    return { valid: false, error: "IPv6 addresses are not permitted as custom branded domains." };
  }

  const domain = normalizeHostname(raw);

  if (!domain) {
    return { valid: false, error: "Domain name cannot be empty." };
  }

  // Maximum total FQDN length is 253 characters
  if (domain.length > 253) {
    return { valid: false, error: "Domain name exceeds maximum allowed length of 253 characters." };
  }

  // Minimum length (e.g. "a.in" or "a.io" = 4 chars)
  if (domain.length < 4) {
    return { valid: false, error: "Domain name is too short." };
  }

  // Reject IP addresses (IPv4: digits only separated by dots)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) {
    return { valid: false, error: "Direct IP addresses are not permitted as custom branded domains." };
  }

  // Reject IPv6
  if (domain.includes(":")) {
    return { valid: false, error: "IPv6 addresses are not permitted as custom branded domains." };
  }

  // Reject Gyrex platform domains (prevents domain hijacking or spoofing of official endpoints)
  if (domain === "gyrex.in" || domain.endsWith(".gyrex.in")) {
    return { valid: false, error: "Gyrex platform domains cannot be registered as customer custom domains." };
  }

  // Reject internal / private / reserved suffixes
  for (const suffix of BLOCKED_INTERNAL_SUFFIXES) {
    if (domain === suffix || domain.endsWith(suffix)) {
      return { valid: false, error: `Internal or reserved domain '${domain}' is not allowed.` };
    }
  }

  // Check labels separated by dots
  const labels = domain.split(".");
  if (labels.length < 2) {
    return { valid: false, error: "Domain must include a valid Top-Level Domain (TLD) extension (e.g., .in, .com)." };
  }

  // Validate each label (RFC 1035 / 1123)
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];

    if (!label || label.length === 0) {
      return { valid: false, error: "Domain contains empty label (consecutive dots are not allowed)." };
    }

    if (label.length > 63) {
      return { valid: false, error: `Domain label '${label}' exceeds the maximum 63 character limit.` };
    }

    // Must start and end with alphanumeric character
    if (!/^[a-z0-9]/.test(label) || !/[a-z0-9]$/.test(label)) {
      return { valid: false, error: `Domain label '${label}' must start and end with a letter or digit.` };
    }

    // Only alphanumeric and hyphens allowed inside
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { valid: false, error: `Domain label '${label}' contains invalid characters. Only letters, numbers, and hyphens are permitted.` };
    }
  }

  // Validate TLD (last label must be purely alphabetic and at least 2 characters)
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    return { valid: false, error: `Invalid Top-Level Domain '${tld}'. TLD must be alphabetic.` };
  }

  // Detect whether domain is Apex (root) or Subdomain
  let isApex = false;
  if (labels.length === 2) {
    // Standard apex e.g. sharmadiagnostics.in, citylab.com
    isApex = true;
  } else if (labels.length === 3) {
    // Multi-part ccTLD apex check (e.g. sharma.co.in, citylab.org.uk)
    const secondToLast = labels[labels.length - 2];
    if (KNOWN_SECOND_LEVEL_DOMAINS.has(secondToLast) && tld.length === 2) {
      isApex = true;
    }
  }

  return {
    valid: true,
    isApex,
  };
}

export class ConflictError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}

export class ServiceUnavailableError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
    this.statusCode = 503;
  }
}

/**
 * Extracts the root/apex domain from a normalized hostname.
 * Handles standard TLDs (e.g. sharmadiagnostics.in -> sharmadiagnostics.in)
 * and multi-part ccTLDs (e.g. citylab.co.in -> citylab.co.in).
 */
export function extractApexDomain(rawHostname: string): string {
  const normalized = normalizeHostname(rawHostname);
  if (!normalized) return "";
  const labels = normalized.split(".");
  if (labels.length <= 2) return normalized;

  const tld = labels[labels.length - 1];
  const secondToLast = labels[labels.length - 2];
  if (KNOWN_SECOND_LEVEL_DOMAINS.has(secondToLast) && tld.length === 2) {
    return labels.slice(-3).join(".");
  }

  return labels.slice(-2).join(".");
}

/**
 * Computes the relative DNS host prefix for DNS provider records.
 * For apex domains, returns "@".
 * For subdomains (including multi-level subdomains like patient.portal.example.com),
 * returns the full relative prefix ("patient.portal"), avoiding truncation from simple split(".")[0].
 */
export function getRelativeDnsHost(rawHostname: string, isApex?: boolean): string {
  const normalized = normalizeHostname(rawHostname);
  if (!normalized) return "@";

  const apex = extractApexDomain(normalized);
  if (isApex || normalized === apex) {
    return "@";
  }

  if (normalized.endsWith(`.${apex}`)) {
    return normalized.slice(0, -(apex.length + 1));
  }

  return normalized;
}

export interface DnsRecordInstruction {
  type: string;
  host: string;
  target?: string;
  value?: string;
  recommendedTtl: number;
  note: string;
}

export interface DomainDnsInstructions {
  cname: DnsRecordInstruction;
  txt: DnsRecordInstruction;
}

/**
 * Builds standard, RFC-compliant DNS setup instructions for a laboratory custom domain.
 */
export function buildDnsInstructions(domain: SafeLabDomain | null): DomainDnsInstructions | null {
  if (!domain) return null;

  const host = getRelativeDnsHost(domain.domain, domain.isApex);

  return {
    cname: {
      type: domain.isApex ? "ALIAS / ANAME / CNAME" : "CNAME",
      host,
      target: domain.cnameTarget,
      recommendedTtl: 300,
      note: domain.isApex
        ? `Apex root domains (@) cannot use standard CNAME records under RFC 1034/1912. Your DNS provider must support CNAME Flattening (e.g. Cloudflare), ALIAS (Route 53), or ANAME records to point @ directly to ${domain.cnameTarget}.`
        : `Points ${domain.domain} to the Gyrex Labs edge network.`,
    },
    txt: {
      type: "TXT",
      host: domain.verificationRecordName,
      value: domain.verificationRecordValue,
      recommendedTtl: 300,
      note: "Required by Gyrex Labs to verify domain ownership before edge certificate provisioning.",
    },
  };
}

/**
 * Generates a cryptographically secure random verification token and DNS challenge details.
 */
export function generateDomainVerificationChallenge(domain: string): DomainChallengeDetails {
  const normalized = normalizeHostname(domain);
  const randomBytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(randomBytes);
  const token = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const fallbackOrigin = process.env.CLOUDFLARE_FALLBACK_ORIGIN?.trim() || "fallback.gyrex.in";

  return {
    token,
    recordName: `_gyrex-challenge.${normalized}`,
    recordValue: `gyrex-domain-verification=${token}`,
    cnameTarget: fallbackOrigin,
  };
}

/**
 * Sanitizes domain record for safe presentation to user or API client.
 * Does NOT expose internal database fields or secrets.
 */
export function sanitizeDomainForPublic(domainRecord: LabDomain): SafeLabDomain {
  return {
    id: domainRecord.id,
    labId: domainRecord.labId,
    domain: domainRecord.domain,
    isApex: domainRecord.isApex,
    status: domainRecord.status,
    sslStatus: domainRecord.sslStatus,
    verificationRecordName: domainRecord.verificationRecordName,
    verificationRecordValue: domainRecord.verificationRecordValue,
    cnameTarget: domainRecord.cnameTarget,
    verificationErrors: domainRecord.verificationErrors,
    lastCheckedAt: domainRecord.lastCheckedAt,
    verifiedAt: domainRecord.verifiedAt,
    activatedAt: domainRecord.activatedAt,
    createdAt: domainRecord.createdAt,
  };
}
// ============================================================
// DATABASE ACCESS & FALLBACK LAYER
// ============================================================

// In-memory fallback storage for testing environments only
const inMemoryDomains = new Map<string, LabDomain>();

let testInMemoryStoreAllowed: boolean =
  process.env.NODE_ENV === "test" || process.env.GYREX_TEST_IN_MEMORY_DOMAINS === "true";

export function setTestInMemoryStoreAllowed(allowed: boolean): void {
  testInMemoryStoreAllowed = allowed;
}

export function isTestInMemoryStoreAllowed(): boolean {
  return testInMemoryStoreAllowed;
}

export function resetInMemoryDomainStoreForTesting() {
  inMemoryDomains.clear();
}

function isTableMissingError(err: any): boolean {
  return (
    err?.code === "P2021" ||
    err?.code === "42P01" ||
    (typeof err?.message === "string" &&
      (err.message.includes("does not exist") ||
        err.message.includes("LabDomain") ||
        err.message.includes("TableNotFound")))
  );
}

function ensureTableOrThrowServiceUnavailable(err: any): void {
  if (isTableMissingError(err) && !testInMemoryStoreAllowed) {
    throw new ServiceUnavailableError(
      "Custom branded domain services are temporarily unavailable. Database migration is pending."
    );
  }
}

async function dbFindUniqueDomain(domain: string): Promise<LabDomain | null> {
  try {
    return await prisma.labDomain.findUnique({
      where: { domain },
    });
  } catch (err: any) {
    if (isTableMissingError(err)) {
      ensureTableOrThrowServiceUnavailable(err);
      return inMemoryDomains.get(domain) || null;
    }
    throw err;
  }
}

async function dbFindFirstForLab(labId: string): Promise<LabDomain | null> {
  try {
    return await prisma.labDomain.findFirst({
      where: {
        labId,
        status: { not: DomainStatus.REMOVED },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err: any) {
    if (isTableMissingError(err)) {
      ensureTableOrThrowServiceUnavailable(err);
      const records = Array.from(inMemoryDomains.values())
        .filter((d) => d.labId === labId && d.status !== DomainStatus.REMOVED)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return records[0] || null;
    }
    throw err;
  }
}

async function dbRegisterDomainSafely(
  domain: string,
  labId: string,
  isApex: boolean,
  challenge: DomainChallengeDetails
): Promise<LabDomain> {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Check if domain already exists in any status
      const existingDomain = await tx.labDomain.findUnique({
        where: { domain },
      });

      if (existingDomain) {
        // Domain registered by another lab
        if (existingDomain.labId !== labId && existingDomain.status !== DomainStatus.REMOVED) {
          throw new ConflictError(`Domain '${domain}' is already registered by another laboratory.`);
        }

        // Domain previously removed by another lab: enforce 7-day cooldown
        if (existingDomain.status === DomainStatus.REMOVED && existingDomain.labId !== labId) {
          const cooldownMs = 7 * 24 * 60 * 60 * 1000;
          const timeSinceRemoval = Date.now() - existingDomain.updatedAt.getTime();
          if (timeSinceRemoval < cooldownMs) {
            throw new ConflictError(
              `Domain '${domain}' was recently released and is in a cooldown period. Please try again later.`
            );
          }
        }

        // If claiming a released domain, verify current lab does not already have an active domain
        if (existingDomain.labId !== labId) {
          const activeForLab = await tx.labDomain.findFirst({
            where: {
              labId,
              status: { not: DomainStatus.REMOVED },
            },
          });
          if (activeForLab) {
            throw new ConflictError(
              `Your laboratory already has custom domain '${activeForLab.domain}' configured. Please disconnect it before connecting a different domain.`
            );
          }
        }

        // Idempotent re-registration by the same lab or claiming released domain after cooldown
        return await tx.labDomain.update({
          where: { id: existingDomain.id },
          data: {
            labId,
            isApex,
            status: DomainStatus.PENDING_VERIFICATION,
            sslStatus: DomainSslStatus.INITIALIZING,
            verificationToken: challenge.token,
            verificationRecordName: challenge.recordName,
            verificationRecordValue: challenge.recordValue,
            cnameTarget: challenge.cnameTarget,
            verificationErrors: null,
            lastCheckedAt: null,
            verifiedAt: null,
            activatedAt: null,
          },
        });
      }

      // 2. Domain doesn't exist yet: check if this lab already has an active or pending domain
      const activeForLab = await tx.labDomain.findFirst({
        where: {
          labId,
          status: { not: DomainStatus.REMOVED },
        },
      });

      if (activeForLab) {
        throw new ConflictError(
          `Your laboratory already has custom domain '${activeForLab.domain}' configured. Please disconnect it before connecting a different domain.`
        );
      }

      // 3. Create new domain record
      return await tx.labDomain.create({
        data: {
          labId,
          domain,
          isApex,
          status: DomainStatus.PENDING_VERIFICATION,
          sslStatus: DomainSslStatus.INITIALIZING,
          verificationToken: challenge.token,
          verificationRecordName: challenge.recordName,
          verificationRecordValue: challenge.recordValue,
          cnameTarget: challenge.cnameTarget,
        },
      });
    });
  } catch (err: any) {
    if (err instanceof ConflictError) {
      throw err;
    }

    // Map Prisma unique constraint violation code P2002 to ConflictError
    if (err?.code === "P2002") {
      const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(", ") : String(err?.meta?.target || "");
      if (target.includes("domain")) {
        throw new ConflictError(`Domain '${domain}' is already registered by another laboratory.`);
      }
      if (target.includes("labId")) {
        throw new ConflictError(`Your laboratory already has a custom domain configured. Please disconnect it first.`);
      }
      throw new ConflictError(`A conflict occurred while registering domain '${domain}'.`);
    }

    if (isTableMissingError(err)) {
      ensureTableOrThrowServiceUnavailable(err);

      // In-memory atomic fallback for tests
      const existingDomain = inMemoryDomains.get(domain);
      const now = new Date();

      if (existingDomain) {
        if (existingDomain.labId !== labId && existingDomain.status !== DomainStatus.REMOVED) {
          throw new ConflictError(`Domain '${domain}' is already registered by another laboratory.`);
        }

        if (existingDomain.status === DomainStatus.REMOVED && existingDomain.labId !== labId) {
          const cooldownMs = 7 * 24 * 60 * 60 * 1000;
          const timeSinceRemoval = now.getTime() - existingDomain.updatedAt.getTime();
          if (timeSinceRemoval < cooldownMs) {
            throw new ConflictError(
              `Domain '${domain}' was recently released and is in a cooldown period. Please try again later.`
            );
          }
        }

        if (existingDomain.labId !== labId) {
          const activeForLab = Array.from(inMemoryDomains.values()).find(
            (d) => d.labId === labId && d.status !== DomainStatus.REMOVED
          );
          if (activeForLab) {
            throw new ConflictError(
              `Your laboratory already has custom domain '${activeForLab.domain}' configured. Please disconnect it before connecting a different domain.`
            );
          }
        }

        const updated: LabDomain = {
          ...existingDomain,
          labId,
          isApex,
          status: DomainStatus.PENDING_VERIFICATION,
          sslStatus: DomainSslStatus.INITIALIZING,
          verificationToken: challenge.token,
          verificationRecordName: challenge.recordName,
          verificationRecordValue: challenge.recordValue,
          cnameTarget: challenge.cnameTarget,
          verificationErrors: null,
          lastCheckedAt: null,
          verifiedAt: null,
          activatedAt: null,
          updatedAt: now,
        };
        inMemoryDomains.set(domain, updated);
        return updated;
      }

      // Check single domain limit for this lab
      const activeForLab = Array.from(inMemoryDomains.values()).find(
        (d) => d.labId === labId && d.status !== DomainStatus.REMOVED
      );
      if (activeForLab) {
        throw new ConflictError(
          `Your laboratory already has custom domain '${activeForLab.domain}' configured. Please disconnect it before connecting a different domain.`
        );
      }

      const newRecord: LabDomain = {
        id: `domain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        labId,
        domain,
        isApex,
        status: DomainStatus.PENDING_VERIFICATION,
        sslStatus: DomainSslStatus.INITIALIZING,
        verificationToken: challenge.token,
        verificationRecordName: challenge.recordName,
        verificationRecordValue: challenge.recordValue,
        cnameTarget: challenge.cnameTarget,
        cloudflareHostnameId: null,
        cloudflareSslStatus: null,
        verificationErrors: null,
        lastCheckedAt: null,
        verifiedAt: null,
        activatedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryDomains.set(domain, newRecord);
      return newRecord;
    }

    throw err;
  }
}

async function dbUpdateDomain(
  id: string,
  domainName: string,
  data: Partial<LabDomain>
): Promise<LabDomain> {
  try {
    return await prisma.labDomain.update({
      where: { id },
      data,
    });
  } catch (err: any) {
    if (isTableMissingError(err)) {
      ensureTableOrThrowServiceUnavailable(err);
      const existing = inMemoryDomains.get(domainName);
      if (!existing) {
        throw new Error(`Domain '${domainName}' not found in fallback storage.`);
      }
      const updated: LabDomain = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      inMemoryDomains.set(domainName, updated);
      return updated;
    }
    throw err;
  }
}

/**
 * Resolves an incoming hostname to an active laboratory tenant for custom domain routing.
 * Strictly checks:
 * 1. Normalized hostname exists in LabDomain
 * 2. Domain status is ACTIVE
 * 3. Associated laboratory exists and status is ACTIVE
 *
 * Never trusts unverified, pending, suspended, or removed domains.
 */
export async function getVerifiedActiveDomainForHost(
  rawHostname: string
): Promise<{ labId: string; slug: string; domain: string } | null> {
  const normalized = normalizeHostname(rawHostname);
  if (!normalized) return null;

  try {
    const domainRecord = await prisma.labDomain.findUnique({
      where: { domain: normalized },
      include: {
        lab: {
          select: {
            id: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (domainRecord) {
      if (domainRecord.status !== DomainStatus.ACTIVE) return null;
      if (domainRecord.sslStatus !== DomainSslStatus.ACTIVE) return null;
      if (!domainRecord.lab || domainRecord.lab.status !== LabStatus.ACTIVE) return null;

      // Verify active subscription entitlement; suspend if lapsed
      const { isLabCustomDomainEntitled } = await import(
        "@/services/subscription/entitlement-service"
      );
      const isEntitled = await isLabCustomDomainEntitled(domainRecord.labId);
      if (!isEntitled) {
        await reconcileLabDomainSubscription(domainRecord.labId);
        return null;
      }

      return {
        labId: domainRecord.lab.id,
        slug: domainRecord.lab.slug,
        domain: domainRecord.domain,
      };
    }
  } catch (err: any) {
    if (!isTableMissingError(err)) {
      return null;
    }
  }

  // Fallback to in-memory store if table is not yet migrated AND in-memory test store is allowed
  if (!testInMemoryStoreAllowed) return null;
  const mem = inMemoryDomains.get(normalized);
  if (!mem || mem.status !== DomainStatus.ACTIVE || mem.sslStatus !== DomainSslStatus.ACTIVE) return null;

  try {
    const lab = await prisma.lab.findUnique({
      where: { id: mem.labId },
      select: { id: true, slug: true, status: true },
    });
    if (!lab || lab.status !== LabStatus.ACTIVE) return null;

    const { isLabCustomDomainEntitled } = await import(
      "@/services/subscription/entitlement-service"
    );
    const isEntitled = await isLabCustomDomainEntitled(mem.labId);
    if (!isEntitled) {
      await reconcileLabDomainSubscription(mem.labId);
      return null;
    }

    return { labId: lab.id, slug: lab.slug, domain: mem.domain };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current configured custom domain for a laboratory (excluding REMOVED).
 */
export async function getLabDomain(labId: string): Promise<SafeLabDomain | null> {
  const cleanId = (labId || "").trim();
  if (!cleanId) return null;

  const domainRecord = await dbFindFirstForLab(cleanId);
  return domainRecord ? sanitizeDomainForPublic(domainRecord) : null;
}

/**
 * Registers a new custom domain for an entitled laboratory.
 * Validates hostname, verifies tenant subscription entitlement, enforces global uniqueness,
 * and generates a cryptographically secure verification challenge.
 */
export async function registerCustomDomain(
  labId: string,
  rawDomain: string
): Promise<SafeLabDomain> {
  const cleanLabId = (labId || "").trim();
  if (!cleanLabId) {
    throw new Error("Laboratory ID is required.");
  }

  // 1. Enforce subscription plan entitlement
  const { assertLabCanConfigureCustomDomain } = await import(
    "@/services/subscription/entitlement-service"
  );
  await assertLabCanConfigureCustomDomain(cleanLabId);

  // 2. Validate custom hostname format & security
  const validation = validateCustomHostname(rawDomain);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid custom domain name.");
  }

  const domain = normalizeHostname(rawDomain);

  // 3. Generate cryptographic verification challenge
  const challenge = generateDomainVerificationChallenge(domain);

  // 4. Safely register or re-register domain inside transaction
  // Enforces global uniqueness, single active domain per lab, ownership checks, and cooldown
  const domainRecord = await dbRegisterDomainSafely(
    domain,
    cleanLabId,
    Boolean(validation.isApex),
    challenge
  );

  return sanitizeDomainForPublic(domainRecord);
}

export type DnsTxtResolver = (recordName: string) => Promise<string[][]>;

/**
 * Rechecks DNS TXT ownership verification for a laboratory's custom domain.
 * When TXT verification succeeds, provisions the Cloudflare Custom Hostname.
 */
export async function verifyCustomDomain(
  labId: string,
  customTxtResolver?: DnsTxtResolver
): Promise<{
  success: boolean;
  status: DomainStatus;
  sslStatus: DomainSslStatus;
  message: string;
  domain: SafeLabDomain | null;
}> {
  const cleanLabId = (labId || "").trim();
  if (!cleanLabId) {
    throw new Error("Laboratory ID is required.");
  }

  // 1. Enforce subscription entitlement
  const { assertLabCanConfigureCustomDomain } = await import(
    "@/services/subscription/entitlement-service"
  );
  await assertLabCanConfigureCustomDomain(cleanLabId);

  // 2. Fetch current domain
  const domainRecord = await dbFindFirstForLab(cleanLabId);

  if (!domainRecord) {
    throw new Error("No custom domain is currently configured for this laboratory.");
  }

  // 3. Perform DNS TXT lookup
  let dnsMatched = false;
  let dnsError: string | null = null;

  try {
    const resolver =
      customTxtResolver ||
      (await (Function('return import("dns/promises")')() as Promise<any>)).resolveTxt;
    const txtRecords: string[][] = await resolver(domainRecord.verificationRecordName);
    const flatTxt = txtRecords.map((chunks: string[]) => chunks.join("")).map((t: string) => t.trim());

    if (flatTxt.includes(domainRecord.verificationRecordValue.trim())) {
      dnsMatched = true;
    } else {
      dnsError = `TXT record found at '${domainRecord.verificationRecordName}', but its value did not match the expected challenge value.`;
    }
  } catch (err: any) {
    if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
      dnsError = `Verification record '${domainRecord.verificationRecordName}' was not detected in public DNS. DNS changes can take a few minutes to propagate.`;
    } else {
      dnsError = `DNS lookup failed: ${err.message || "Network error"}`;
    }
  }

  const now = new Date();

  // 4. Update status based on DNS lookup
  if (dnsMatched) {
    let cloudflareHostnameId = domainRecord.cloudflareHostnameId;
    let cloudflareSslStatus = domainRecord.cloudflareSslStatus;
    let nextStatus: DomainStatus = DomainStatus.VERIFYING;
    let nextSslStatus: DomainSslStatus = DomainSslStatus.INITIALIZING;
    let cfErrors: string | null = null;
    let activatedAt = domainRecord.activatedAt;

    try {
      const { createCloudflareCustomHostname } = await import(
        "@/lib/integrations/cloudflare/custom-hostnames"
      );
      const cfResult = await createCloudflareCustomHostname(domainRecord.domain);
      cloudflareHostnameId = cfResult.providerHostnameId;
      cloudflareSslStatus = cfResult.sslStatus;

      if (cfResult.isReadyForTraffic) {
        nextStatus = DomainStatus.ACTIVE;
        nextSslStatus = DomainSslStatus.ACTIVE;
        activatedAt = activatedAt || now;
      } else {
        nextStatus = DomainStatus.VERIFYING;
        nextSslStatus =
          cfResult.sslStatus === "pending_validation"
            ? DomainSslStatus.PENDING_VALIDATION
            : DomainSslStatus.INITIALIZING;
      }

      if (cfResult.diagnosticErrors.length > 0) {
        cfErrors = cfResult.diagnosticErrors.join("; ");
      }
    } catch (cfErr: any) {
      cfErrors = `DNS ownership verified, but Cloudflare Custom Hostname creation encountered: ${cfErr.message || "Provider error"}`;
      nextStatus = DomainStatus.VERIFYING;
      nextSslStatus = DomainSslStatus.INITIALIZING;
    }

    const updated = await dbUpdateDomain(domainRecord.id, domainRecord.domain, {
      status: nextStatus,
      sslStatus: nextSslStatus,
      cloudflareHostnameId,
      cloudflareSslStatus,
      verifiedAt: now,
      activatedAt,
      lastCheckedAt: now,
      verificationErrors: cfErrors,
    });

    return {
      success: true,
      status: nextStatus,
      sslStatus: nextSslStatus,
      message:
        nextStatus === DomainStatus.ACTIVE
          ? "Domain ownership and Edge SSL verified successfully! Your custom domain is now active."
          : "DNS ownership verified! Edge SSL certificate provisioning has been initiated with Cloudflare.",
      domain: sanitizeDomainForPublic(updated),
    };
  }

  // Verification pending / failed
  const updated = await dbUpdateDomain(domainRecord.id, domainRecord.domain, {
    lastCheckedAt: now,
    verificationErrors: dnsError,
  });

  return {
    success: false,
    status: domainRecord.status,
    sslStatus: domainRecord.sslStatus,
    message: dnsError || "DNS verification is pending. Please check that your DNS TXT record is configured correctly.",
    domain: sanitizeDomainForPublic(updated),
  };
}

/**
 * Refreshes the Cloudflare Edge SSL certificate and verification status for a laboratory's custom domain.
 */
export async function refreshCustomDomainStatus(
  labId: string
): Promise<{
  success: boolean;
  status: DomainStatus;
  sslStatus: DomainSslStatus;
  message: string;
  domain: SafeLabDomain | null;
}> {
  const cleanLabId = (labId || "").trim();
  if (!cleanLabId) {
    throw new Error("Laboratory ID is required.");
  }

  // 1. Enforce subscription entitlement
  const { assertLabCanConfigureCustomDomain } = await import(
    "@/services/subscription/entitlement-service"
  );
  await assertLabCanConfigureCustomDomain(cleanLabId);

  // 2. Fetch current domain
  const domainRecord = await dbFindFirstForLab(cleanLabId);
  if (!domainRecord) {
    throw new Error("No custom domain is currently configured for this laboratory.");
  }

  // If domain is not verified yet, recommend running DNS verification first
  if (!domainRecord.verifiedAt && domainRecord.status === DomainStatus.PENDING_VERIFICATION) {
    return {
      success: false,
      status: domainRecord.status,
      sslStatus: domainRecord.sslStatus,
      message: "DNS ownership verification is required before Edge SSL can be queried. Please verify your TXT record first.",
      domain: sanitizeDomainForPublic(domainRecord),
    };
  }

  const { getCloudflareCustomHostname, createCloudflareCustomHostname } = await import(
    "@/lib/integrations/cloudflare/custom-hostnames"
  );

  let cfState = null;
  const now = new Date();

  try {
    if (domainRecord.cloudflareHostnameId) {
      cfState = await getCloudflareCustomHostname(domainRecord.cloudflareHostnameId);
    }

    // If no provider ID recorded or not found upstream, try finding or creating it
    if (!cfState) {
      cfState = await createCloudflareCustomHostname(domainRecord.domain);
    }
  } catch (err: any) {
    const errorMsg = `Unable to refresh Cloudflare status: ${err.message || "Provider error"}`;
    const updated = await dbUpdateDomain(domainRecord.id, domainRecord.domain, {
      lastCheckedAt: now,
      verificationErrors: errorMsg,
    });
    return {
      success: false,
      status: domainRecord.status,
      sslStatus: domainRecord.sslStatus,
      message: errorMsg,
      domain: sanitizeDomainForPublic(updated),
    };
  }

  let nextStatus: DomainStatus = domainRecord.status;
  let nextSslStatus: DomainSslStatus = domainRecord.sslStatus;
  let activatedAt = domainRecord.activatedAt;
  let diagnosticErrors: string | null = null;

  if (cfState) {
    if (cfState.isReadyForTraffic) {
      nextStatus = DomainStatus.ACTIVE;
      nextSslStatus = DomainSslStatus.ACTIVE;
      activatedAt = activatedAt || now;
    } else if (cfState.sslStatus === "failed") {
      nextSslStatus = DomainSslStatus.FAILED;
      diagnosticErrors = cfState.diagnosticErrors.join("; ") || "Cloudflare SSL certificate issuance failed.";
    } else if (cfState.hostnameStatus === "blocked") {
      nextStatus = DomainStatus.FAILED;
      diagnosticErrors = "Custom hostname has been blocked by Cloudflare.";
    } else {
      nextStatus = DomainStatus.VERIFYING;
      nextSslStatus =
        cfState.sslStatus === "pending_validation"
          ? DomainSslStatus.PENDING_VALIDATION
          : DomainSslStatus.INITIALIZING;
    }
  }

  const updated = await dbUpdateDomain(domainRecord.id, domainRecord.domain, {
    status: nextStatus,
    sslStatus: nextSslStatus,
    cloudflareHostnameId: cfState?.providerHostnameId || domainRecord.cloudflareHostnameId,
    cloudflareSslStatus: cfState?.sslStatus || domainRecord.cloudflareSslStatus,
    activatedAt,
    lastCheckedAt: now,
    verificationErrors: diagnosticErrors,
  });

  return {
    success: nextStatus === DomainStatus.ACTIVE,
    status: nextStatus,
    sslStatus: nextSslStatus,
    message:
      nextStatus === DomainStatus.ACTIVE
        ? "Edge SSL is active and verified! Your branded domain is ready to serve patient traffic."
        : `Cloudflare status: Hostname ${cfState?.hostnameStatus || "pending"}, SSL ${cfState?.sslStatus || "initializing"}.`,
    domain: sanitizeDomainForPublic(updated),
  };
}

/**
 * Reconciles custom domain status against the laboratory's current subscription entitlement.
 * Suspends active/verifying domains if the subscription lapses, cancels, or expires.
 * Automatically reactivates suspended domains once a valid subscription is restored.
 */
export async function reconcileLabDomainSubscription(
  labId: string
): Promise<{ suspended: boolean; reactivated: boolean; domain: SafeLabDomain | null }> {
  const cleanLabId = (labId || "").trim();
  if (!cleanLabId) return { suspended: false, reactivated: false, domain: null };

  const { isLabCustomDomainEntitled } = await import(
    "@/services/subscription/entitlement-service"
  );
  const isEntitled = await isLabCustomDomainEntitled(cleanLabId);
  const domainRecord = await dbFindFirstForLab(cleanLabId);

  if (!domainRecord) {
    return { suspended: false, reactivated: false, domain: null };
  }

  const now = new Date();

  // If lab is not entitled but domain is active or verifying -> SUSPEND
  if (!isEntitled) {
    if (domainRecord.status === DomainStatus.ACTIVE || domainRecord.status === DomainStatus.VERIFYING) {
      const updated = await dbUpdateDomain(domainRecord.id, domainRecord.domain, {
        status: DomainStatus.SUSPENDED,
        verificationErrors:
          "Custom domain suspended: Subscription plan does not include custom branded domain entitlement or is inactive.",
        lastCheckedAt: now,
      });
      return { suspended: true, reactivated: false, domain: sanitizeDomainForPublic(updated) };
    }
    return { suspended: false, reactivated: false, domain: sanitizeDomainForPublic(domainRecord) };
  }

  // If lab is entitled and domain was SUSPENDED -> REACTIVATE
  if (isEntitled && domainRecord.status === DomainStatus.SUSPENDED) {
    let isSslActive = domainRecord.sslStatus === DomainSslStatus.ACTIVE;
    if (isSslActive && domainRecord.cloudflareHostnameId) {
      try {
        const { getCloudflareCustomHostname } = await import(
          "@/lib/integrations/cloudflare/custom-hostnames"
        );
        const cfState = await getCloudflareCustomHostname(domainRecord.cloudflareHostnameId);
        if (cfState && !cfState.isReadyForTraffic) {
          isSslActive = false;
        }
      } catch {
        isSslActive = false;
      }
    }

    const nextStatus = isSslActive ? DomainStatus.ACTIVE : DomainStatus.VERIFYING;
    const nextSslStatus = isSslActive ? DomainSslStatus.ACTIVE : DomainSslStatus.PENDING_VALIDATION;

    const updated = await dbUpdateDomain(domainRecord.id, domainRecord.domain, {
      status: nextStatus,
      sslStatus: nextSslStatus,
      verificationErrors: null,
      lastCheckedAt: now,
    });
    return { suspended: false, reactivated: true, domain: sanitizeDomainForPublic(updated) };
  }

  return { suspended: false, reactivated: false, domain: sanitizeDomainForPublic(domainRecord) };
}

/**
 * Disconnects a laboratory's custom domain.
 * Idempotent: returns success if no domain is connected.
 * Applies safe removal lifecycle state (REMOVED) to prevent instant takeover.
 */
export async function disconnectCustomDomain(
  labId: string
): Promise<{ success: boolean; message: string }> {
  const cleanLabId = (labId || "").trim();
  if (!cleanLabId) {
    throw new Error("Laboratory ID is required.");
  }

  const domainRecord = await dbFindFirstForLab(cleanLabId);

  if (!domainRecord) {
    return {
      success: true,
      message: "No custom domain was configured for this laboratory.",
    };
  }

  // If a Cloudflare hostname was registered, delete it upstream
  if (domainRecord.cloudflareHostnameId) {
    try {
      const { deleteCloudflareCustomHostname } = await import(
        "@/lib/integrations/cloudflare/custom-hostnames"
      );
      await deleteCloudflareCustomHostname(domainRecord.cloudflareHostnameId);
    } catch (err: any) {
      console.warn(`[Cloudflare] Failed to delete hostname ${domainRecord.cloudflareHostnameId}:`, err.message);
    }
  }

  await dbUpdateDomain(domainRecord.id, domainRecord.domain, {
    status: DomainStatus.REMOVED,
    sslStatus: DomainSslStatus.EXPIRED,
    verificationErrors: null,
  });

  return {
    success: true,
    message: `Domain '${domainRecord.domain}' has been disconnected.`,
  };
}
