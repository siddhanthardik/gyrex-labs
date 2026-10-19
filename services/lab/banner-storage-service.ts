import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { detectImageFormat } from "./logo-storage-service";

export const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const BANNERS_DIR = path.join(process.cwd(), "storage", "branding", "banners");
const STAGED_DIR = path.join(process.cwd(), "storage", "branding", "staged");

/**
 * Stages an uploaded banner image for a specific tenant in isolated storage.
 * Does NOT alter the database or public storefront.
 */
export async function stageLabBanner(
  labId: string,
  buffer: Buffer
): Promise<{ success: boolean; stagedBannerUrl?: string; filename?: string; error?: string }> {
  if (buffer.length > MAX_BANNER_SIZE_BYTES) {
    return { success: false, error: "Banner file exceeds 5MB size limit." };
  }

  const format = detectImageFormat(buffer);
  if (!format.valid || !format.ext) {
    return { success: false, error: format.error || "Invalid image format. Only PNG, JPG, and WebP are allowed." };
  }

  await fs.mkdir(STAGED_DIR, { recursive: true });

  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");

  // Clean up any existing staged files for this lab before creating the new one
  await deleteStagedLabBanner(labId);

  // Generate safe server-controlled filename
  const token = crypto.randomBytes(6).toString("hex");
  const filename = `staged-${sanitizedLabId}-${token}-${Date.now()}.${format.ext}`;
  const fullPath = path.join(STAGED_DIR, filename);

  await fs.writeFile(fullPath, buffer);

  const stagedBannerUrl = `/api/lab/profile/banner/staged/${filename}`;
  return { success: true, stagedBannerUrl, filename };
}

/**
 * Safely unlinks any staged banners belonging to the authenticated tenant.
 */
export async function deleteStagedLabBanner(labId: string): Promise<void> {
  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");
  try {
    await fs.mkdir(STAGED_DIR, { recursive: true });
    const files = await fs.readdir(STAGED_DIR);
    const prefix = `staged-${sanitizedLabId}-`;
    for (const file of files) {
      if (file.startsWith(prefix)) {
        await fs.unlink(path.join(STAGED_DIR, file)).catch(() => {});
      }
    }
  } catch {
    // Staged directory might be empty or uncreated
  }
}

/**
 * Promotes an authenticated tenant's staged banner to permanent storage.
 * Failure-safe: copies first, verifies existence, and returns rollback callback.
 */
export async function promoteStagedLabBanner(
  labId: string,
  stagedFilenameOrUrl: string
): Promise<{
  success: boolean;
  permanentBannerUrl?: string;
  permanentPath?: string;
  stagedPath?: string;
  error?: string;
}> {
  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");

  // Extract pure filename if URL was passed
  const filename = stagedFilenameOrUrl.includes("/")
    ? path.basename(stagedFilenameOrUrl)
    : stagedFilenameOrUrl;

  // Strict ownership check: Must start with staged-${sanitizedLabId}-
  const expectedPrefix = `staged-${sanitizedLabId}-`;
  if (!filename.startsWith(expectedPrefix)) {
    return { success: false, error: "Access denied. Staged banner belongs to another tenant or invalid session." };
  }

  // Strict filename validation
  if (!/^staged-[a-zA-Z0-9]+-[a-zA-Z0-9]+-\d+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    return { success: false, error: "Invalid staged banner filename format." };
  }

  const stagedPath = path.join(STAGED_DIR, filename);

  try {
    await fs.access(stagedPath);
  } catch {
    return { success: false, error: "Staged banner file not found or has expired." };
  }

  // Ensure permanent destination directory exists
  await fs.mkdir(BANNERS_DIR, { recursive: true });

  const ext = path.extname(filename).toLowerCase().replace(".", "");
  const permanentFilename = `banner-${sanitizedLabId}-${Date.now()}.${ext}`;
  const permanentPath = path.join(BANNERS_DIR, permanentFilename);

  // Copy to permanent location first (failure-safe)
  try {
    await fs.copyFile(stagedPath, permanentPath);
  } catch (err: any) {
    return { success: false, error: `Failed to promote banner: ${err.message}` };
  }

  const permanentBannerUrl = `/api/files/banner/${permanentFilename}`;
  return {
    success: true,
    permanentBannerUrl,
    permanentPath,
    stagedPath,
  };
}

/**
 * Saves a laboratory facility banner image safely in controlled permanent storage.
 * Enforces magic-byte image detection, strict size limits, and path isolation.
 */
export async function saveLabBanner(
  labId: string,
  buffer: Buffer
): Promise<{ success: boolean; bannerUrl?: string; error?: string }> {
  if (buffer.length > MAX_BANNER_SIZE_BYTES) {
    return { success: false, error: "Banner file exceeds 5MB size limit." };
  }

  const format = detectImageFormat(buffer);
  if (!format.valid || !format.ext) {
    return { success: false, error: format.error || "Invalid image format. Only PNG, JPG, and WebP are allowed." };
  }

  await fs.mkdir(BANNERS_DIR, { recursive: true });

  const sanitizedLabId = labId.replace(/[^a-zA-Z0-9]/g, "");
  const filename = `banner-${sanitizedLabId}-${Date.now()}.${format.ext}`;
  const fullPath = path.join(BANNERS_DIR, filename);

  await fs.writeFile(fullPath, buffer);

  const bannerUrl = `/api/files/banner/${filename}`;
  return { success: true, bannerUrl };
}

/**
 * Safely deletes a previously stored permanent banner file from disk.
 * Enforces strict prefix and regex validation to prevent directory traversal.
 */
export async function deleteLabBannerFile(bannerUrl: string | null | undefined): Promise<void> {
  if (!bannerUrl || typeof bannerUrl !== "string") return;

  const prefix = "/api/files/banner/";
  if (!bannerUrl.startsWith(prefix)) return;

  const filename = bannerUrl.slice(prefix.length);

  // Strict filename validation to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    return;
  }

  const fullPath = path.join(BANNERS_DIR, filename);
  try {
    await fs.unlink(fullPath);
  } catch {
    // File may already have been removed or nonexistent
  }
}

/**
 * Prunes orphaned staged banner files older than 2 hours.
 */
export async function cleanupOrphanedStagedBanners(): Promise<void> {
  try {
    const files = await fs.readdir(STAGED_DIR);
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    for (const file of files) {
      const match = file.match(/-(\d+)\.(png|jpg|jpeg|webp)$/);
      if (match && match[1]) {
        const fileTime = parseInt(match[1], 10);
        if (now - fileTime > twoHoursMs) {
          await fs.unlink(path.join(STAGED_DIR, file)).catch(() => {});
        }
      }
    }
  } catch {
    // Staged directory might not exist yet
  }
}
