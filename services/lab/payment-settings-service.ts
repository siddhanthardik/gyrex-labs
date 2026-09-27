import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction } from "@prisma/client";
import { encryptSecret } from "@/lib/integrations/crypto";

export interface UpdatePaymentSettingsInput {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  cashOnCollectionEnabled?: boolean;
  upiDirectQrUrl?: string;
}

/**
 * Retrieves the diagnostic patient payment settings for this laboratory.
 * Patient -> Laboratory (Flow A)
 */
export async function getLabPaymentSettings(labId: string) {
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

  return {
    id: settings.id,
    labId: settings.labId,
    razorpayKeyId: settings.razorpayKeyId,
    hasRazorpaySecret: !!settings.razorpayKeySecretEncrypted,
    cashOnCollectionEnabled: settings.cashOnCollectionEnabled,
    upiDirectQrUrl: settings.upiDirectQrUrl,
    isConfigured: settings.isConfigured,
    lastVerifiedAt: settings.lastVerifiedAt,
    trustNotice: {
      headline: "Patients pay your laboratory directly.",
      subheadline: "Gyrex Labs powers your booking platform and never touches patient diagnostic payments.",
    },
  };
}

/**
 * Updates the diagnostic patient payment settings.
 * Audits setting changes. Never logs plain secret keys.
 */
export async function updateLabPaymentSettings(
  labId: string,
  input: UpdatePaymentSettingsInput,
  actorUserId?: string
) {
  const updateData: any = {
    cashOnCollectionEnabled: input.cashOnCollectionEnabled ?? undefined,
    upiDirectQrUrl: input.upiDirectQrUrl !== undefined ? input.upiDirectQrUrl.trim() : undefined,
  };

  if (input.razorpayKeyId !== undefined) {
    updateData.razorpayKeyId = input.razorpayKeyId.trim() || null;
  }

  if (input.razorpayKeySecret !== undefined && input.razorpayKeySecret.trim()) {
    updateData.razorpayKeySecretEncrypted = encryptSecret(input.razorpayKeySecret.trim());
  }

  // Determine if payment gateway or cash is configured
  const hasKey = !!input.razorpayKeyId || !!(await prisma.labPaymentSettings.findUnique({ where: { labId } }))?.razorpayKeyId;
  const cashEnabled = input.cashOnCollectionEnabled ?? true;
  updateData.isConfigured = hasKey || cashEnabled;
  updateData.lastVerifiedAt = new Date();

  const settings = await prisma.labPaymentSettings.upsert({
    where: { labId },
    update: updateData,
    create: {
      labId,
      ...updateData,
    },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "LabPaymentSettings",
    entityId: settings.id,
    labId,
    metadata: {
      action: "PATIENT_PAYMENT_SETTINGS_UPDATED",
      cashOnCollectionEnabled: settings.cashOnCollectionEnabled,
      hasRazorpayKey: !!settings.razorpayKeyId,
      isConfigured: settings.isConfigured,
    },
  });

  return {
    id: settings.id,
    cashOnCollectionEnabled: settings.cashOnCollectionEnabled,
    razorpayKeyId: settings.razorpayKeyId,
    upiDirectQrUrl: settings.upiDirectQrUrl,
    isConfigured: settings.isConfigured,
  };
}
