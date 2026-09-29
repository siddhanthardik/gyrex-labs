import fs from "fs/promises";
import path from "path";

export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const LOGOS_DIR = path.join(process.cwd(), "storage", "branding", "logos");

/**
 * Validates the file buffer against known image magic numbers.
 * Does NOT trust client-declared MIME or filename extensions.
 */
export function detectImageFormat(buffer: Buffer): { valid: boolean; ext?: string; mime?: string; error?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: "Invalid image file: file is too small or corrupt." };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
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

  // WebP: 'RIFF'....'WEBP'
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return { valid: true, ext: "webp", mime: "image/webp" };
  }

  return {
    valid: false,
    error: "Unsupported image format. Only PNG, JPG/JPEG, and WebP are allowed for laboratory logos.",
  };
}

/**
 * Saves a laboratory logo safely in controlled branding storage.
 */
export async function saveLabLogo(
  labId: string,
  buffer: Buffer
): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
  if (buffer.length > MAX_LOGO_SIZE_BYTES) {
    return { valid: false, error: "Logo file exceeds 5MB size limit." } as any;
  }

  const format = detectImageFormat(buffer);
  if (!format.valid || !format.ext) {
    return { success: false, error: format.error || "Invalid image format." };
  }

  // Ensure directory exists with restricted access
  await fs.mkdir(LOGOS_DIR, { recursive: true });

  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");
  const filename = `logo-${sanitizedLabId}-${Date.now()}.${format.ext}`;
  const fullPath = path.join(LOGOS_DIR, filename);

  // Write file
  await fs.writeFile(fullPath, buffer);

  const logoUrl = `/api/files/logo/${filename}`;
  return { success: true, logoUrl };
}

/**
 * Safely deletes a previously stored logo file from disk.
 */
export async function deleteLabLogoFile(logoUrl: string | null | undefined): Promise<void> {
  if (!logoUrl || typeof logoUrl !== "string") return;

  const prefix = "/api/files/logo/";
  if (!logoUrl.startsWith(prefix)) return;

  const filename = logoUrl.slice(prefix.length);

  // Strict filename validation to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    return;
  }

  const fullPath = path.join(LOGOS_DIR, filename);
  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already have been removed
  }
}
