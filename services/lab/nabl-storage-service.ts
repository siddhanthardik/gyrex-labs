import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const MAX_NABL_CERT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const NABL_CERT_DIR = path.join(process.cwd(), "storage", "compliance", "nabl");

/**
 * Validates document buffer for NABL certificates.
 * Supports PDF, PNG, and JPEG.
 */
export function detectNablCertificateFormat(
  buffer: Buffer
): { valid: boolean; ext?: string; mime?: string; error?: string } {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: "File is too small or corrupt." };
  }

  // PDF: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, ext: "pdf", mime: "application/pdf" };
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, ext: "png", mime: "image/png" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: "jpg", mime: "image/jpeg" };
  }

  return {
    valid: false,
    error: "Invalid document format. Only PDF, PNG, and JPG/JPEG files are accepted for NABL certificates.",
  };
}

/**
 * Saves a NABL certificate safely in compliance storage.
 */
export async function saveNablCertificate(
  labId: string,
  buffer: Buffer
): Promise<{ success: boolean; certificateUrl?: string; filename?: string; error?: string }> {
  if (buffer.length > MAX_NABL_CERT_SIZE_BYTES) {
    return { success: false, error: "Certificate file exceeds 10MB size limit." };
  }

  const format = detectNablCertificateFormat(buffer);
  if (!format.valid || !format.ext) {
    return { success: false, error: format.error || "Invalid file format." };
  }

  await fs.mkdir(NABL_CERT_DIR, { recursive: true });

  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");
  const token = crypto.randomBytes(4).toString("hex");
  const filename = `cert-${sanitizedLabId}-${Date.now()}-${token}.${format.ext}`;
  const fullPath = path.join(NABL_CERT_DIR, filename);

  await fs.writeFile(fullPath, buffer);

  const certificateUrl = `/api/lab/profile/nabl-certificate/${filename}`;
  return { success: true, certificateUrl, filename };
}

/**
 * Safely unlinks a stored NABL certificate file.
 */
export async function deleteNablCertificateFile(certificateUrl: string | null | undefined): Promise<void> {
  if (!certificateUrl || typeof certificateUrl !== "string") return;

  const prefix = "/api/lab/profile/nabl-certificate/";
  if (!certificateUrl.startsWith(prefix)) return;

  const filename = certificateUrl.slice(prefix.length);

  // Strict filename validation
  if (!/^cert-[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg)$/.test(filename)) {
    return;
  }

  const fullPath = path.resolve(NABL_CERT_DIR, filename);

  if (!fullPath.startsWith(NABL_CERT_DIR + path.sep)) {
    return;
  }

  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if already deleted
  }
}
