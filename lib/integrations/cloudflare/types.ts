/**
 * GYREX LABS — CLOUDFLARE FOR SAAS TYPES
 *
 * Types and interfaces for Cloudflare Custom Hostname API v4 integration.
 */

export type CloudflareHostnameStatus =
  | "pending"
  | "active"
  | "pending_deletion"
  | "pending_blocked"
  | "blocked"
  | "moved";

export type CloudflareSslStatus =
  | "initializing"
  | "pending_validation"
  | "pending_issuance"
  | "pending_deployment"
  | "active"
  | "failed"
  | "expired"
  | "deleted";

export type CloudflareSslMethod = "http" | "txt" | "email" | "cname";

export interface CloudflareSslValidationRecord {
  status?: string;
  txt_name?: string;
  txt_value?: string;
  http_url?: string;
  http_body?: string;
  cname?: string;
  cname_target?: string;
}

export interface CloudflareSslDetails {
  id?: string;
  type?: string;
  method?: CloudflareSslMethod;
  status?: CloudflareSslStatus;
  hosts?: string[];
  validation_records?: CloudflareSslValidationRecord[];
  validation_errors?: string[];
  bundle_method?: string;
  wildcard?: boolean;
  certificate_authority?: string;
}

export interface CloudflareCustomHostnameResult {
  id: string;
  hostname: string;
  status: CloudflareHostnameStatus;
  ssl?: CloudflareSslDetails;
  verification_errors?: string[];
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  created_at?: string;
}

export interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
  };
}

export interface CreateHostnameOptions {
  sslMethod?: CloudflareSslMethod;
  minTlsVersion?: "1.0" | "1.1" | "1.2" | "1.3";
  customOriginServer?: string;
}

export interface NormalizedProviderHostnameState {
  providerHostnameId: string;
  hostname: string;
  hostnameStatus: CloudflareHostnameStatus;
  sslStatus: CloudflareSslStatus;
  sslValidationRecords?: CloudflareSslValidationRecord[];
  isSslActive: boolean;
  isHostnameActive: boolean;
  isReadyForTraffic: boolean;
  diagnosticErrors: string[];
}
