/**
 * GYREX LABS — CLOUDFLARE FOR SAAS CUSTOM HOSTNAMES PROVIDER MODULE
 *
 * Implements server-side lifecycle integration with Cloudflare Custom Hostnames API v4.
 * - Idempotent hostname creation and retrieval
 * - Edge SSL certificate status polling
 * - Graceful deletion and failure recovery
 * - Secret protection: Never logs or exposes API tokens
 * - Mock provider support for local testing and offline verification
 */

import {
  CloudflareApiResponse,
  CloudflareCustomHostnameResult,
  CloudflareHostnameStatus,
  CloudflareSslStatus,
  CreateHostnameOptions,
  NormalizedProviderHostnameState,
} from "./types";

// Configuration from environment variables
function getCloudflareConfig() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim() || "";
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() || "";
  const fallbackOrigin = process.env.CLOUDFLARE_FALLBACK_ORIGIN?.trim() || "fallback.gyrex.in";
  const isConfigured = Boolean(zoneId && apiToken);

  return {
    zoneId,
    apiToken,
    fallbackOrigin,
    isConfigured,
  };
}

// ============================================================
// TEST / MOCK PROVIDER SUPPORT
// ============================================================

export interface MockCloudflareRecord {
  id: string;
  hostname: string;
  status: CloudflareHostnameStatus;
  sslStatus: CloudflareSslStatus;
  verificationErrors: string[];
}

const mockHostnamesStore = new Map<string, MockCloudflareRecord>();
let mockProviderEnabled = false;

export function setMockCloudflareProviderEnabled(enabled: boolean): void {
  mockProviderEnabled = enabled;
}

export function isMockCloudflareProviderActive(): boolean {
  const config = getCloudflareConfig();
  return mockProviderEnabled || !config.isConfigured;
}

export function resetMockCloudflareStore(): void {
  mockHostnamesStore.clear();
}

export function setMockHostnameRecord(record: MockCloudflareRecord): void {
  mockHostnamesStore.set(record.hostname.toLowerCase(), record);
}

// ============================================================
// NORMALIZATION HELPERS
// ============================================================

export function normalizeProviderState(
  raw: CloudflareCustomHostnameResult
): NormalizedProviderHostnameState {
  const sslStatus: CloudflareSslStatus = raw.ssl?.status || "initializing";
  const hostnameStatus: CloudflareHostnameStatus = raw.status || "pending";
  const isSslActive = sslStatus === "active";
  const isHostnameActive = hostnameStatus === "active";
  const isReadyForTraffic = isSslActive && isHostnameActive;

  const diagnosticErrors: string[] = [];
  if (Array.isArray(raw.verification_errors) && raw.verification_errors.length > 0) {
    diagnosticErrors.push(...raw.verification_errors);
  }
  if (Array.isArray(raw.ssl?.validation_errors) && raw.ssl.validation_errors.length > 0) {
    diagnosticErrors.push(...raw.ssl.validation_errors);
  }

  return {
    providerHostnameId: raw.id,
    hostname: raw.hostname,
    hostnameStatus,
    sslStatus,
    sslValidationRecords: raw.ssl?.validation_records,
    isSslActive,
    isHostnameActive,
    isReadyForTraffic,
    diagnosticErrors,
  };
}

// ============================================================
// CLOUDFLARE API OPERATIONS
// ============================================================

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

async function executeCloudflareRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "DELETE",
  body?: unknown
): Promise<CloudflareApiResponse<T>> {
  const config = getCloudflareConfig();
  if (!config.isConfigured) {
    throw new Error(
      "Cloudflare for SaaS credentials are not configured. Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN."
    );
  }

  const url = `${CF_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as CloudflareApiResponse<T>;

  if (!response.ok || !data.success) {
    const errorDetails = data.errors?.map((e) => e.message).join(", ") || response.statusText;
    const err = new Error(`Cloudflare API error (${response.status}): ${errorDetails}`);
    (err as any).statusCode = response.status;
    (err as any).errors = data.errors;
    throw err;
  }

  return data;
}

/**
 * Creates a Custom Hostname on Cloudflare for SaaS.
 * Idempotent: If the hostname already exists on the zone, returns the existing record.
 */
export async function createCloudflareCustomHostname(
  hostname: string,
  options?: CreateHostnameOptions
): Promise<NormalizedProviderHostnameState> {
  const cleanHostname = hostname.trim().toLowerCase();

  // Handle Mock Mode
  if (isMockCloudflareProviderActive()) {
    const existing = mockHostnamesStore.get(cleanHostname);
    if (existing) {
      return {
        providerHostnameId: existing.id,
        hostname: existing.hostname,
        hostnameStatus: existing.status,
        sslStatus: existing.sslStatus,
        isSslActive: existing.sslStatus === "active",
        isHostnameActive: existing.status === "active",
        isReadyForTraffic: existing.status === "active" && existing.sslStatus === "active",
        diagnosticErrors: existing.verificationErrors,
      };
    }

    const mockRecord: MockCloudflareRecord = {
      id: `cf_mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      hostname: cleanHostname,
      status: "pending",
      sslStatus: "pending_validation",
      verificationErrors: [],
    };
    mockHostnamesStore.set(cleanHostname, mockRecord);

    return {
      providerHostnameId: mockRecord.id,
      hostname: mockRecord.hostname,
      hostnameStatus: mockRecord.status,
      sslStatus: mockRecord.sslStatus,
      isSslActive: false,
      isHostnameActive: false,
      isReadyForTraffic: false,
      diagnosticErrors: [],
    };
  }

  const config = getCloudflareConfig();

  // 1. Check if hostname already exists on the zone to avoid 409 collisions
  const existing = await findCloudflareCustomHostnameByDomain(cleanHostname);
  if (existing) {
    return existing;
  }

  // 2. POST create custom hostname
  const payload = {
    hostname: cleanHostname,
    ssl: {
      method: options?.sslMethod || "http",
      type: "dv",
      settings: {
        min_tls_version: options?.minTlsVersion || "1.2",
      },
    },
    ...(options?.customOriginServer ? { custom_origin_server: options.customOriginServer } : {}),
  };

  try {
    const response = await executeCloudflareRequest<CloudflareCustomHostnameResult>(
      `/zones/${config.zoneId}/custom_hostnames`,
      "POST",
      payload
    );

    return normalizeProviderState(response.result);
  } catch (err: any) {
    const hasAlreadyExistsError =
      (err?.statusCode === 400 || err?.statusCode === 409) &&
      Array.isArray(err?.errors) &&
      err.errors.some(
        (e: any) =>
          e.code === 1406 || String(e.message || "").toLowerCase().includes("already exists")
      );

    if (hasAlreadyExistsError) {
      const existing = await findCloudflareCustomHostnameByDomain(cleanHostname);
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Retrieves the current status and SSL state of a Custom Hostname by Cloudflare ID.
 */
export async function getCloudflareCustomHostname(
  hostnameId: string
): Promise<NormalizedProviderHostnameState | null> {
  if (!hostnameId) return null;

  if (isMockCloudflareProviderActive()) {
    for (const record of mockHostnamesStore.values()) {
      if (record.id === hostnameId) {
        return {
          providerHostnameId: record.id,
          hostname: record.hostname,
          hostnameStatus: record.status,
          sslStatus: record.sslStatus,
          isSslActive: record.sslStatus === "active",
          isHostnameActive: record.status === "active",
          isReadyForTraffic: record.status === "active" && record.sslStatus === "active",
          diagnosticErrors: record.verificationErrors,
        };
      }
    }
    return null;
  }

  const config = getCloudflareConfig();

  try {
    const response = await executeCloudflareRequest<CloudflareCustomHostnameResult>(
      `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
      "GET"
    );
    return normalizeProviderState(response.result);
  } catch (err: any) {
    if (err?.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Searches for a Custom Hostname by domain string.
 */
export async function findCloudflareCustomHostnameByDomain(
  hostname: string
): Promise<NormalizedProviderHostnameState | null> {
  const cleanHostname = hostname.trim().toLowerCase();

  if (isMockCloudflareProviderActive()) {
    const record = mockHostnamesStore.get(cleanHostname);
    if (!record) return null;
    return {
      providerHostnameId: record.id,
      hostname: record.hostname,
      hostnameStatus: record.status,
      sslStatus: record.sslStatus,
      isSslActive: record.sslStatus === "active",
      isHostnameActive: record.status === "active",
      isReadyForTraffic: record.status === "active" && record.sslStatus === "active",
      diagnosticErrors: record.verificationErrors,
    };
  }

  const config = getCloudflareConfig();

  try {
    const response = await executeCloudflareRequest<CloudflareCustomHostnameResult[]>(
      `/zones/${config.zoneId}/custom_hostnames?hostname=${encodeURIComponent(cleanHostname)}`,
      "GET"
    );

    if (Array.isArray(response.result) && response.result.length > 0) {
      return normalizeProviderState(response.result[0]);
    }
    return null;
  } catch (err: any) {
    if (err?.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Deletes a Custom Hostname from Cloudflare for SaaS.
 * Idempotent: If the hostname is already gone (404), returns success.
 */
export async function deleteCloudflareCustomHostname(
  hostnameId: string
): Promise<{ success: boolean; message: string }> {
  if (!hostnameId) {
    return { success: true, message: "No provider hostname ID specified." };
  }

  if (isMockCloudflareProviderActive()) {
    for (const [key, record] of mockHostnamesStore.entries()) {
      if (record.id === hostnameId) {
        mockHostnamesStore.delete(key);
        break;
      }
    }
    return { success: true, message: "Custom hostname removed from Cloudflare." };
  }

  const config = getCloudflareConfig();

  try {
    await executeCloudflareRequest<{ id: string }>(
      `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
      "DELETE"
    );
    return { success: true, message: "Custom hostname removed from Cloudflare." };
  } catch (err: any) {
    if (err?.statusCode === 404) {
      return { success: true, message: "Custom hostname was already removed from Cloudflare." };
    }
    throw err;
  }
}
