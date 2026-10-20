import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { detectImageFormat } from "./logo-storage-service";

export const MAX_GALLERY_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const GALLERY_DIR = path.join(process.cwd(), "storage", "branding", "gallery");

/**
 * Saves a clinical facility gallery photo safely in controlled storage.
 * Enforces magic-byte validation, 5MB size limits, and path isolation.
 */
export async function saveGalleryImage(
  labId: string,
  buffer: Buffer
): Promise<{ success: boolean; imageUrl?: string; filename?: string; error?: string }> {
  if (buffer.length > MAX_GALLERY_IMAGE_SIZE_BYTES) {
    return { success: false, error: "Gallery image exceeds the 5MB size limit." };
  }

  const format = detectImageFormat(buffer);
  if (!format.valid || !format.ext) {
    return {
      success: false,
      error: format.error || "Invalid image format. Only PNG, JPG, and WebP are allowed.",
    };
  }

  await fs.mkdir(GALLERY_DIR, { recursive: true });

  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");
  const token = crypto.randomBytes(4).toString("hex");
  const filename = `gal-${sanitizedLabId}-${Date.now()}-${token}.${format.ext}`;
  const fullPath = path.join(GALLERY_DIR, filename);

  await fs.writeFile(fullPath, buffer);

  const imageUrl = `/api/files/gallery/${filename}`;
  return { success: true, imageUrl, filename };
}

/**
 * Safely unlinks a stored gallery photo.
 * Prevents directory traversal attacks via strict prefix, regex, and path containment validation.
 */
export async function deleteGalleryImageFile(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || typeof imageUrl !== "string") return;

  const prefix = "/api/files/gallery/";
  if (!imageUrl.startsWith(prefix)) return;

  const filename = imageUrl.slice(prefix.length);

  // Strict filename validation
  if (!/^gal-[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    return;
  }

  const fullPath = path.resolve(GALLERY_DIR, filename);

  // Ensure path is strictly inside GALLERY_DIR
  if (!fullPath.startsWith(GALLERY_DIR + path.sep)) {
    return;
  }

  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already have been removed or does not exist
  }
}
