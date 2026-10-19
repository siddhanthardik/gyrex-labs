import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { detectImageFormat } from "./logo-storage-service";

export const MAX_TEAM_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const TEAM_PHOTOS_DIR = path.join(process.cwd(), "storage", "branding", "team");

/**
 * Saves a clinical team member photo safely in controlled storage.
 * Enforces magic-byte validation, 5MB size limits, and path isolation.
 */
export async function saveTeamPhoto(
  labId: string,
  buffer: Buffer
): Promise<{ success: boolean; photoUrl?: string; filename?: string; error?: string }> {
  if (buffer.length > MAX_TEAM_PHOTO_SIZE_BYTES) {
    return { success: false, error: "Team photo exceeds the 5MB size limit." };
  }

  const format = detectImageFormat(buffer);
  if (!format.valid || !format.ext) {
    return {
      success: false,
      error: format.error || "Invalid image format. Only PNG, JPG, and WebP are allowed.",
    };
  }

  await fs.mkdir(TEAM_PHOTOS_DIR, { recursive: true });

  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");
  const token = crypto.randomBytes(4).toString("hex");
  const filename = `team-${sanitizedLabId}-${Date.now()}-${token}.${format.ext}`;
  const fullPath = path.join(TEAM_PHOTOS_DIR, filename);

  await fs.writeFile(fullPath, buffer);

  const photoUrl = `/api/files/team/${filename}`;
  return { success: true, photoUrl, filename };
}

/**
 * Safely unlinks a stored team member photo.
 * Prevents directory traversal attacks via strict prefix and regex validation.
 */
export async function deleteTeamPhotoFile(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl || typeof photoUrl !== "string") return;

  const prefix = "/api/files/team/";
  if (!photoUrl.startsWith(prefix)) return;

  const filename = photoUrl.slice(prefix.length);

  // Strict filename validation
  if (!/^team-[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    return;
  }

  const fullPath = path.resolve(TEAM_PHOTOS_DIR, filename);

  // Ensure path is inside TEAM_PHOTOS_DIR
  if (!fullPath.startsWith(TEAM_PHOTOS_DIR + path.sep)) {
    return;
  }

  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already have been removed or does not exist
  }
}
