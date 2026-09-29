import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/integrations/crypto";

export interface UpdatePaymentSettingsInput {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  cashOnCollectionEnabled?: boolean;
  upiDirectQrUrl?: string;
}

export interface SafePaymentSettingsResponse {
  id: string;
  labId: string;
  configured: boolean;
  isConfigured: boolean;
  mode: "test" | "live" | null;
  keyIdMasked: string | null;
  razorpayKeyIdMasked: string | null;
  hasRazorpayKeyId: boolean;
  hasRazorpaySecret: boolean;
  secretConfigured: boolean;
  cashOnCollectionEnabled: boolean;
  upiDirectQrUrl: string | null;
  lastVerifiedAt: Date | null;
  trustNotice: {
    headline: string;
    subheadline: string;
  };
}

/**
 * Masks a Razorpay Key ID for safe presentation to the client browser.
 * e.g. "rzp_test_1234567890ABCD" -> "rzp_test_****ABCD"
 * e.g. "rzp_live_9876543210WXYZ" -> "rzp_live_****WXYZ"
 */
export function maskRazorpayKeyId(keyId: string | null | undefined): string | null {
  if (!keyId || typeof keyId !== "string") return null;
  const trimmed = keyId.trim();
  if (trimmed.length <= 8) return "********";

  if (trimmed.startsWith("rzp_test_")) {
    const suffix = trimmed.slice(-4);
    return `rzp_test_****${suffix}`;
  }

  if (trimmed.startsWith("rzp_live_")) {
    const suffix = trimmed.slice(-4);
    return `rzp_live_****${suffix}`;
  }

  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Detects whether a Razorpay Key ID belongs to Test Mode or Live Mode.
 * Derived dynamically from the standard Razorpay prefix convention.
 */
export function detectRazorpayMode(keyId: string | null | undefined): "test" | "live" | null {
  if (!keyId || typeof keyId !== "string") return null;
  const trimmed = keyId.trim().toLowerCase();
  if (trimmed.startsWith("rzp_live_")) return "live";
  if (trimmed.startsWith("rzp_test_")) return "test";
  return null;
}

/**
 * Validates the basic structural format of a Razorpay Key ID without making external API calls.
 */
export function validateRazorpayKeyId(keyId: string): { valid: boolean; error?: string } {
  const trimmed = keyId.trim();
  if (!trimmed) {
    return { valid: false, error: "Razorpay Key ID cannot be empty." };
  }

  if (!trimmed.startsWith("rzp_test_") && !trimmed.startsWith("rzp_live_")) {
    return {
      valid: false,
      error: "Invalid Razorpay Key ID format. A valid key must start with 'rzp_test_' (Test Mode) or 'rzp_live_' (Live Mode).",
    };
  }

  if (trimmed.length < 16) {
    return {
      valid: false,
      error: "Razorpay Key ID appears truncated or too short.",
    };
  }

  return { valid: true };
}

/**
 * Retrieves the diagnostic patient payment settings for this laboratory.
 * Patient -> Laboratory (Flow A).
 * STRICT SECURITY: Never decrypts or exposes the Key Secret or Webhook Secret.
 */
export async function getLabPaymentSettings(labId: string): Promise<SafePaymentSettingsResponse> {
  let settings = await prisma.labPaymentSettings.findUnique({
    where: { labId },
  });

  if (!settings) {
    settings = await prisma.labPaymentSettings.create({
      data: {
        labId,
        cashOnCollectionEnabled: true,
        isConfigured: false,
      },
    });
  }

  const hasKeyId = Boolean(settings.razorpayKeyId);
  const hasSecret = Boolean(settings.razorpayKeySecretEncrypted);
  const mode = detectRazorpayMode(settings.razorpayKeyId);
  const keyIdMasked = maskRazorpayKeyId(settings.razorpayKeyId);

  return {
    id: settings.id,
    labId: settings.labId,
    configured: settings.isConfigured,
    isConfigured: settings.isConfigured,
    mode,
    keyIdMasked,
    razorpayKeyIdMasked: keyIdMasked,
    hasRazorpayKeyId: hasKeyId,
    hasRazorpaySecret: hasSecret,
    secretConfigured: hasSecret,
    cashOnCollectionEnabled: settings.cashOnCollectionEnabled,
    upiDirectQrUrl: settings.upiDirectQrUrl,
    lastVerifiedAt: settings.lastVerifiedAt,
    trustNotice: {
      headline: "Patients pay your laboratory directly.",
      subheadline: "Gyrex Labs powers your booking platform and never touches patient diagnostic payments.",
    },
  };
}

/**
 * Updates the diagnostic patient payment settings.
 * STRICT SECURITY:
 * - Encrypts sensitive secrets using AES-256-GCM.
 * - Never logs credentials or secrets.
 * - Preserves existing secret if only Key ID is updated.
 * - Preserves existing Key ID if only secret is updated.
 * - Strictly tenant-scoped by labId.
 */
export async function updateLabPaymentSettings(
  labId: string,
  input: UpdatePaymentSettingsInput,
  actorUserId?: string
): Promise<SafePaymentSettingsResponse> {
  // 1. Fetch existing settings to preserve fields not included in this update
  const existing = await prisma.labPaymentSettings.findUnique({
    where: { labId },
  });

  const updateData: any = {};

  // 2. Validate and update Razorpay Key ID
  if (input.razorpayKeyId !== undefined) {
    const trimmedKey = input.razorpayKeyId.trim();
    if (trimmedKey) {
      const validation = validateRazorpayKeyId(trimmedKey);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      updateData.razorpayKeyId = trimmedKey;
    } else {
      // Empty string passed explicitly indicates clearing key
      updateData.razorpayKeyId = null;
    }
  }

  // 3. Encrypt and update Razorpay Key Secret if supplied
  if (input.razorpayKeySecret !== undefined) {
    const trimmedSecret = input.razorpayKeySecret.trim();
    if (trimmedSecret) {
      if (trimmedSecret.length < 8) {
        throw new Error("Razorpay Key Secret appears too short or invalid.");
      }
      updateData.razorpayKeySecretEncrypted = encryptSecret(trimmedSecret);
    } else {
      updateData.razorpayKeySecretEncrypted = null;
    }
  }

  // 4. Update optional payment toggles
  if (input.cashOnCollectionEnabled !== undefined) {
    updateData.cashOnCollectionEnabled = Boolean(input.cashOnCollectionEnabled);
  }

  if (input.upiDirectQrUrl !== undefined) {
    updateData.upiDirectQrUrl = input.upiDirectQrUrl.trim() || null;
  }

  // 5. Determine configured status
  const finalKeyId =
    updateData.razorpayKeyId !== undefined
      ? updateData.razorpayKeyId
      : existing?.razorpayKeyId;

  const finalSecretEncrypted =
    updateData.razorpayKeySecretEncrypted !== undefined
      ? updateData.razorpayKeySecretEncrypted
      : existing?.razorpayKeySecretEncrypted;

  const finalCashEnabled =
    updateData.cashOnCollectionEnabled !== undefined
      ? updateData.cashOnCollectionEnabled
      : (existing?.cashOnCollectionEnabled ?? true);

  const hasCompleteRazorpay = Boolean(finalKeyId && finalSecretEncrypted);
  updateData.isConfigured = hasCompleteRazorpay || finalCashEnabled;

  if (hasCompleteRazorpay) {
    updateData.lastVerifiedAt = new Date();
  }

  // 6. Persist to database
  const updated = await prisma.labPaymentSettings.upsert({
    where: { labId },
    update: updateData,
    create: {
      labId,
      ...updateData,
    },
  });

  const hasKeyId = Boolean(updated.razorpayKeyId);
  const hasSecret = Boolean(updated.razorpayKeySecretEncrypted);
  const mode = detectRazorpayMode(updated.razorpayKeyId);
  const keyIdMasked = maskRazorpayKeyId(updated.razorpayKeyId);

  // 7. Return strictly sanitized response (NEVER return plain or decrypted secret)
  return {
    id: updated.id,
    labId: updated.labId,
    configured: updated.isConfigured,
    isConfigured: updated.isConfigured,
    mode,
    keyIdMasked,
    razorpayKeyIdMasked: keyIdMasked,
    hasRazorpayKeyId: hasKeyId,
    hasRazorpaySecret: hasSecret,
    secretConfigured: hasSecret,
    cashOnCollectionEnabled: updated.cashOnCollectionEnabled,
    upiDirectQrUrl: updated.upiDirectQrUrl,
    lastVerifiedAt: updated.lastVerifiedAt,
    trustNotice: {
      headline: "Patients pay your laboratory directly.",
      subheadline: "Gyrex Labs powers your booking platform and never touches patient diagnostic payments.",
    },
  };
}
