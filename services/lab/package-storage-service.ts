import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { detectImageFormat } from "./logo-storage-service";

export const MAX_PACKAGE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const PACKAGES_DIR = path.join(process.cwd(), "storage", "branding", "packages");

/**
 * Saves a package marketing banner/thumbnail safely in controlled storage.
 * Enforces magic-byte validation, 5MB size limits, and path isolation.
 */
export async function savePackageImage(
  labId: string,
  packageId: string,
  buffer: Buffer
): Promise<{ success: boolean; imageUrl?: string; filename?: string; error?: string }> {
  if (buffer.length > MAX_PACKAGE_IMAGE_SIZE_BYTES) {
    return { success: false, error: "Package image exceeds the 5MB size limit." };
  }

  const format = detectImageFormat(buffer);
  if (!format.valid || !format.ext) {
    return {
      success: false,
      error: format.error || "Invalid image format. Only PNG, JPG, and WebP are allowed.",
    };
  }

  await fs.mkdir(PACKAGES_DIR, { recursive: true });

  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");
  const sanitizedPackageId = packageId.replace(/[^a-zA-Z0-9]/g, "");
  const token = crypto.randomBytes(4).toString("hex");
  const filename = `pkg-${sanitizedLabId}-${sanitizedPackageId}-${Date.now()}-${token}.${format.ext}`;
  const fullPath = path.join(PACKAGES_DIR, filename);

  await fs.writeFile(fullPath, buffer);

  const imageUrl = `/api/files/package/${filename}`;
  return { success: true, imageUrl, filename };
}

/**
 * Safely unlinks a stored package image.
 * Prevents directory traversal attacks via strict prefix, regex, and path containment validation.
 */
export async function deletePackageImageFile(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || typeof imageUrl !== "string") return;

  const prefix = "/api/files/package/";
  if (!imageUrl.startsWith(prefix)) return;

  const filename = imageUrl.slice(prefix.length);

  // Strict filename validation
  if (!/^pkg-[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    return;
  }

  const fullPath = path.resolve(PACKAGES_DIR, filename);

  // Ensure path is strictly inside PACKAGES_DIR
  if (!fullPath.startsWith(PACKAGES_DIR + path.sep)) {
    return;
  }

  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already have been removed or does not exist
  }
}
