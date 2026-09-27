/**
 * Gyrex Labs - Secure Private File Storage Service
 *
 * Implements strict healthcare data storage rules:
 * - Prescriptions, Diagnostic Reports, and Invoices are NEVER publicly accessible.
 * - Authorization happens FIRST, then a short-lived signed access URL or stream is issued.
 * - Path traversal defense (rejects absolute paths and '../' segments).
 * - MIME and extension whitelist validation.
 * - Restrictive filesystem permissions on disk (0o600 / 0o700).
 * - SHA-256 integrity checksum calculation.
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
} from "@/lib/integrations/types";
import { calculateSha256Checksum } from "@/lib/integrations/crypto";

// Allowed MIME types & extensions
export const ALLOWED_PRESCRIPTION_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const ALLOWED_REPORT_MIMES = ["application/pdf"];

export const MAX_PRESCRIPTION_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_REPORT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export class LocalSecureStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = path.resolve(baseDir);
    } else if (process.env.STORAGE_LOCAL_DIR) {
      this.baseDir = path.resolve(process.env.STORAGE_LOCAL_DIR);
    } else {
      this.baseDir = path.join(process.cwd(), "storage", "secure");
    }
  }

  /**
   * Returns the configured base directory for secure storage.
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Sanitizes relative storage path to prevent directory traversal attacks.
   * Strictly forbids absolute paths, path traversal, or paths resolving outside the base directory.
   */
  private sanitizePath(relPath: string): string {
    if (!relPath || typeof relPath !== "string") {
      throw new Error("Security Violation: Invalid storage path.");
    }

    // Reject absolute paths across POSIX and Windows
    if (
      path.isAbsolute(relPath) ||
      relPath.startsWith("/") ||
      relPath.startsWith("\\") ||
      /^[a-zA-Z]:/.test(relPath)
    ) {
      throw new Error("Security Violation: Absolute storage paths are strictly prohibited.");
    }

    // Normalize path and detect traversal tokens
    const normalized = path.normalize(relPath);
    if (
      normalized.startsWith("..") ||
      normalized.includes(`..${path.sep}`) ||
      normalized.includes("/..") ||
      normalized.includes("\\..") ||
      normalized === ".."
    ) {
      throw new Error("Security Violation: Path traversal attack detected.");
    }

    const resolved = path.resolve(this.baseDir, normalized);

    // Verify resolved path is strictly within baseDir
    if (!resolved.startsWith(this.baseDir + path.sep) && resolved !== this.baseDir) {
      throw new Error("Security Violation: Path traversal attack detected.");
    }

    return resolved;
  }

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const fullPath = this.sanitizePath(params.destinationPath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists with restrictive permissions
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });

    // Write file with restrictive permissions (read/write by owner only)
    await fs.writeFile(fullPath, params.fileBuffer, { mode: 0o600 });

    const checksumSha256 = calculateSha256Checksum(params.fileBuffer);

    return {
      storagePath: params.destinationPath,
      fileSizeBytes: params.fileBuffer.length,
      mimeType: params.mimeType,
      checksumSha256,
    };
  }

  async getDownloadStream(storagePath: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.sanitizePath(storagePath);
    const exists = await this.exists(storagePath);
    if (!exists) {
      throw new Error(`File not found at storage path: ${storagePath}`);
    }

    const { createReadStream } = await import("fs");
    return createReadStream(fullPath);
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const fullPath = this.sanitizePath(storagePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(storagePath: string): Promise<void> {
    try {
      const fullPath = this.sanitizePath(storagePath);
      await fs.unlink(fullPath);
    } catch {
      // Ignored if file doesn't exist
    }
  }

  /**
   * Generates a time-limited signed URL with HMAC-SHA256 token.
   * Authorization must be verified before calling this method.
   */
  async generateSignedAccessUrl(storagePath: string, expiresInSeconds = 900): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const secret =
      process.env.STORAGE_SIGNING_SECRET ||
      process.env.AUTH_SECRET ||
      "gyrex-secret-key-for-signing-urls";

    const payload = `${storagePath}:${expires}`;
    const token = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return `/api/files/download?path=${encodeURIComponent(storagePath)}&expires=${expires}&token=${token}`;
  }

  /**
   * Verifies the authenticity and expiration of a signed access URL.
   */
  verifySignedAccessUrl(storagePath: string, expires: number, token: string): boolean {
    if (!storagePath || !expires || !token) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false; // Expired
    }

    const secret =
      process.env.STORAGE_SIGNING_SECRET ||
      process.env.AUTH_SECRET ||
      "gyrex-secret-key-for-signing-urls";

    const payload = `${storagePath}:${expires}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    try {
      return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  }
}

export const fileStorageService = new LocalSecureStorageProvider();

/**
 * Validates an upload file before persisting.
 */
export function validateFileUpload(
  buffer: Buffer,
  fileName: string,
  declaredMimeType: string,
  category: "PRESCRIPTION" | "REPORT"
): { valid: boolean; error?: string } {
  const ext = path.extname(fileName).toLowerCase();

  // Executable prevention
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".php",
    ".js",
    ".vbs",
    ".msi",
    ".dll",
    ".com",
    ".scr",
    ".hta",
  ];
  if (dangerousExtensions.includes(ext)) {
    return { valid: false, error: "Executable or scripted file formats are strictly prohibited." };
  }

  if (category === "PRESCRIPTION") {
    if (!ALLOWED_PRESCRIPTION_MIMES.includes(declaredMimeType)) {
      return { valid: false, error: "Invalid prescription format. Allowed: JPEG, PNG, WEBP, PDF." };
    }
    if (buffer.length > MAX_PRESCRIPTION_SIZE_BYTES) {
      return { valid: false, error: "Prescription file exceeds 10MB limit." };
    }
  } else if (category === "REPORT") {
    if (!ALLOWED_REPORT_MIMES.includes(declaredMimeType) || ext !== ".pdf") {
      return { valid: false, error: "Invalid report format. Only PDF files are supported." };
    }
    if (buffer.length > MAX_REPORT_SIZE_BYTES) {
      return { valid: false, error: "Report file exceeds 25MB limit." };
    }
  }

  return { valid: true };
}
