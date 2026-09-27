import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { LabStatus, AuditAction } from "@prisma/client";

export interface UpdateStoreSettingsInput {
  name?: string;
  phone?: string;
  emergencyPhone?: string; // used for WhatsApp if applicable
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  logoUrl?: string;
  primaryColor?: string;
  homeCollectionAvailable?: boolean;
  homeCollectionFee?: number;
  freeHomeCollectionThreshold?: number;
  workingHours?: any;
  deliveryPromiseNotice?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface PublishReadinessChecklist {
  isReadyToPublish: boolean;
  canPublishImmediately: boolean;
  status: LabStatus;
  isVerified: boolean;
  checklist: {
    labDetailsComplete: boolean;
    testsConfigured: boolean;
    activeTestsCount: number;
    packagesConfigured: boolean;
    activePackagesCount: number;
    paymentConfigured: boolean;
    storeSettingsConfigured: boolean;
    isSuspended: boolean;
  };
  messages: string[];
}

/**
 * Retrieves full store settings and laboratory information.
 */
export async function getLabStoreSettings(labId: string) {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: {
      storeSettings: true,
      paymentSettings: true,
    },
  });

  if (!lab) {
    throw new Error("Laboratory not found.");
  }

  // Ensure store settings exist
  let settings = lab.storeSettings;
  if (!settings) {
    settings = await prisma.labStoreSettings.create({
      data: {
        labId,
        heroHeadline: "Book Diagnostic Tests & Health Packages Online",
        heroSubheadline: "Accurate reports, timely home sample collection, and professional care.",
        homeCollectionAvailable: true,
        homeCollectionFee: 100,
      },
    });
  }

  return {
    lab: {
      id: lab.id,
      name: lab.name,
      slug: lab.slug,
      code: lab.code,
      phone: lab.phone,
      whatsapp: lab.emergencyPhone || lab.phone,
      email: lab.email,
      addressLine1: lab.addressLine1,
      addressLine2: lab.addressLine2,
      city: lab.city,
      state: lab.state,
      postalCode: lab.postalCode,
      status: lab.status,
      isVerified: lab.isVerified,
      verifiedAt: lab.verifiedAt,
    },
    settings: {
      heroHeadline: settings.heroHeadline,
      heroSubheadline: settings.heroSubheadline,
      logoUrl: settings.logoUrl,
      bannerUrl: settings.bannerUrl,
      primaryColor: settings.primaryColor,
      accentColor: settings.accentColor,
      homeCollectionAvailable: settings.homeCollectionAvailable,
      homeCollectionFee: Number(settings.homeCollectionFee),
      freeHomeCollectionThreshold: settings.freeHomeCollectionThreshold
        ? Number(settings.freeHomeCollectionThreshold)
        : null,
      deliveryPromiseNotice: settings.deliveryPromiseNotice,
      workingHours: settings.workingHours,
      metaTitle: settings.metaTitle,
      metaDescription: settings.metaDescription,
    },
    paymentConfigured: lab.paymentSettings?.isConfigured ?? false,
  };
}

/**
 * Updates laboratory and store settings.
 * Lab Admin CANNOT change verification status! Verification is Superadmin only.
 */
export async function updateLabStoreSettings(
  labId: string,
  input: UpdateStoreSettingsInput,
  actorUserId?: string
) {
  const lab = await prisma.lab.findUnique({ where: { id: labId } });
  if (!lab) {
    throw new Error("Laboratory not found.");
  }

  // Update Lab basic information
  const updatedLab = await prisma.lab.update({
    where: { id: labId },
    data: {
      name: input.name !== undefined ? input.name.trim() : undefined,
      phone: input.phone !== undefined ? input.phone.trim() : undefined,
      emergencyPhone:
        input.emergencyPhone !== undefined ? input.emergencyPhone.trim() : undefined,
      email: input.email !== undefined ? input.email.trim().toLowerCase() : undefined,
      addressLine1:
        input.addressLine1 !== undefined ? input.addressLine1.trim() : undefined,
      addressLine2:
        input.addressLine2 !== undefined ? input.addressLine2?.trim() || null : undefined,
      city: input.city !== undefined ? input.city.trim() : undefined,
      state: input.state !== undefined ? input.state.trim() : undefined,
      postalCode:
        input.postalCode !== undefined ? input.postalCode.trim() : undefined,
    },
  });

  // Update Store Settings
  const updatedSettings = await prisma.labStoreSettings.upsert({
    where: { labId },
    update: {
      heroHeadline:
        input.heroHeadline !== undefined ? input.heroHeadline.trim() : undefined,
      heroSubheadline:
        input.heroSubheadline !== undefined ? input.heroSubheadline.trim() : undefined,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl.trim() : undefined,
      primaryColor:
        input.primaryColor !== undefined ? input.primaryColor.trim() : undefined,
      homeCollectionAvailable:
        input.homeCollectionAvailable !== undefined
          ? input.homeCollectionAvailable
          : undefined,
      homeCollectionFee:
        input.homeCollectionFee !== undefined ? input.homeCollectionFee : undefined,
      freeHomeCollectionThreshold:
        input.freeHomeCollectionThreshold !== undefined
          ? input.freeHomeCollectionThreshold
          : undefined,
      deliveryPromiseNotice:
        input.deliveryPromiseNotice !== undefined
          ? input.deliveryPromiseNotice.trim()
          : undefined,
      workingHours: input.workingHours !== undefined ? input.workingHours : undefined,
      metaTitle: input.metaTitle !== undefined ? input.metaTitle.trim() : undefined,
      metaDescription:
        input.metaDescription !== undefined ? input.metaDescription.trim() : undefined,
    },
    create: {
      labId,
      heroHeadline: input.heroHeadline?.trim() || "Book Diagnostic Tests Online",
      heroSubheadline: input.heroSubheadline?.trim() || "Accurate reports, professional care.",
      logoUrl: input.logoUrl?.trim() || null,
      primaryColor: input.primaryColor?.trim() || "#0284c7",
      homeCollectionAvailable: input.homeCollectionAvailable ?? true,
      homeCollectionFee: input.homeCollectionFee ?? 100,
    },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "LabStoreSettings",
    entityId: labId,
    labId,
    metadata: {
      action: "STORE_SETTINGS_UPDATED",
      labName: updatedLab.name,
    },
  });

  return {
    lab: updatedLab,
    settings: updatedSettings,
  };
}

/**
 * Checks all readiness requirements for publishing the laboratory's digital storefront.
 */
export async function getPublishReadiness(labId: string): Promise<PublishReadinessChecklist> {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: {
      storeSettings: true,
      paymentSettings: true,
      labTests: { where: { isActive: true }, select: { id: true } },
      packages: { where: { isActive: true }, select: { id: true } },
    },
  });

  if (!lab) {
    throw new Error("Laboratory not found.");
  }

  const isSuspended = lab.status === LabStatus.SUSPENDED;

  const labDetailsComplete = !!(
    lab.name?.trim() &&
    lab.email?.trim() &&
    lab.phone?.trim() &&
    lab.addressLine1?.trim() &&
    lab.city?.trim() &&
    lab.state?.trim() &&
    lab.postalCode?.trim()
  );

  const activeTestsCount = lab.labTests.length;
  const testsConfigured = activeTestsCount > 0;

  const activePackagesCount = lab.packages.length;
  const packagesConfigured = activePackagesCount > 0;

  const paymentConfigured = !!(
    lab.paymentSettings?.isConfigured ||
    lab.paymentSettings?.cashOnCollectionEnabled ||
    lab.paymentSettings?.razorpayKeyId
  );

  const storeSettingsConfigured = !!lab.storeSettings;

  const messages: string[] = [];
  if (!labDetailsComplete) messages.push("Complete laboratory name, contact details, and postal address.");
  if (!testsConfigured) messages.push("Add at least one active diagnostic test to your catalogue.");
  if (!paymentConfigured) messages.push("Configure payment settings or enable Pay at Collection.");
  if (isSuspended) messages.push("Your laboratory is suspended by platform administration. Contact Gyrex Support.");

  const isReadyToPublish =
    labDetailsComplete && testsConfigured && paymentConfigured && !isSuspended;

  // If verified by superadmin, can publish directly to ACTIVE. Otherwise PENDING_VERIFICATION.
  const canPublishImmediately = isReadyToPublish && lab.isVerified;

  return {
    isReadyToPublish,
    canPublishImmediately,
    status: lab.status,
    isVerified: lab.isVerified,
    checklist: {
      labDetailsComplete,
      testsConfigured,
      activeTestsCount,
      packagesConfigured,
      activePackagesCount,
      paymentConfigured,
      storeSettingsConfigured,
      isSuspended,
    },
    messages,
  };
}

/**
 * Publishes the laboratory's storefront.
 * STRICT SECURITY RULE:
 * 1. A laboratory CANNOT bypass platform suspension.
 * 2. A laboratory CANNOT mark itself as verified.
 */
export async function publishLabStore(labId: string, actorUserId?: string) {
  const readiness = await getPublishReadiness(labId);

  if (!readiness.isReadyToPublish) {
    throw new Error(
      `Cannot publish storefront. Incomplete requirements: ${readiness.messages.join(" ")}`
    );
  }

  if (readiness.checklist.isSuspended) {
    throw new Error(
      "Security Violation: Suspended laboratories cannot publish or alter their storefront status."
    );
  }

  // If verified by platform, activate. If unverified, submit to PENDING_VERIFICATION.
  const newStatus = readiness.isVerified ? LabStatus.ACTIVE : LabStatus.PENDING_VERIFICATION;

  const updated = await prisma.lab.update({
    where: { id: labId },
    data: { status: newStatus },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "Lab",
    entityId: labId,
    labId,
    metadata: {
      action: "STORE_PUBLISHED",
      status: newStatus,
      isVerified: readiness.isVerified,
    },
  });

  return {
    success: true,
    status: updated.status,
    message: readiness.isVerified
      ? "Your digital laboratory store is now ACTIVE and accepting patient bookings!"
      : "Your store setup is complete and submitted for Gyrex verification.",
  };
}
