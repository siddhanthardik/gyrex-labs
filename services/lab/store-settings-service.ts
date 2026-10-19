import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { LabStatus, AuditAction } from "@prisma/client";
import { sanitizeBannerUrl } from "@/services/labs/storefront";
import {
  promoteStagedLabBanner,
  deleteLabBannerFile,
} from "@/services/lab/banner-storage-service";
import fs from "fs/promises";

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
  logoUrl?: string | null;
  bannerUrl?: string | null;
  stagedBannerFilename?: string;
  removeBanner?: boolean;
  primaryColor?: string;
  accentColor?: string;
  homeCollectionAvailable?: boolean;
  homeCollectionFee?: number;
  freeHomeCollectionThreshold?: number;
  workingHours?: any;
  deliveryPromiseNotice?: string;
  isNablAccredited?: boolean;
  nablAccreditationNumber?: string | null;
  nablValidFrom?: string | null;
  nablValidUntil?: string | null;
  nablCertificateUrl?: string | null;
  licenseNumber?: string | null;
  metaTitle?: string;
  metaDescription?: string;
}

export function isValidHexColor(color: string | undefined): boolean {
  if (!color) return true;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.trim());
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

    const rawWorkingHours = (settings.workingHours as Record<string, any>) || {};
    const nablMeta = rawWorkingHours.nabl || {};

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
        licenseNumber: lab.licenseNumber,
        nablAccreditationNumber: lab.nablAccreditationNumber,
        isNablAccredited:
          nablMeta.isAccredited !== undefined
            ? Boolean(nablMeta.isAccredited)
            : Boolean(lab.nablAccreditationNumber),
        nablValidFrom: nablMeta.validFrom || null,
        nablValidUntil: nablMeta.validUntil || null,
        nablCertificateUrl: nablMeta.certificateUrl || null,
        status: lab.status,
        isVerified: lab.isVerified,
        verifiedAt: lab.verifiedAt,
      },
    settings: {
      heroHeadline: settings.heroHeadline,
      heroSubheadline: settings.heroSubheadline,
      logoUrl: settings.logoUrl,
      bannerUrl: sanitizeBannerUrl(settings.bannerUrl),
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
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: { storeSettings: true },
  });
  if (!lab) {
    throw new Error("Laboratory not found.");
  }

  // Validate hex colors
  if (input.primaryColor && !isValidHexColor(input.primaryColor)) {
    throw new Error("Invalid primary color hex code. Must be #RGB or #RRGGBB.");
  }
  if (input.accentColor && !isValidHexColor(input.accentColor)) {
    throw new Error("Invalid accent color hex code. Must be #RGB or #RRGGBB.");
  }

  // Validate NABL accreditation if specified
  if (input.isNablAccredited === true) {
    if (!input.nablAccreditationNumber || !input.nablAccreditationNumber.trim()) {
      throw new Error("NABL Accreditation Number is required when NABL accreditation is enabled.");
    }
    if (!input.nablValidFrom || !input.nablValidFrom.trim()) {
      throw new Error("Validity start date is required when NABL accreditation is enabled.");
    }
    if (!input.nablValidUntil || !input.nablValidUntil.trim()) {
      throw new Error("Validity end date is required when NABL accreditation is enabled.");
    }

    const fromDate = new Date(input.nablValidFrom.trim());
    const untilDate = new Date(input.nablValidUntil.trim());
    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      throw new Error("Invalid NABL validity date format.");
    }
    if (untilDate < fromDate) {
      throw new Error("Accreditation valid until date cannot be earlier than valid from date.");
    }
  }

  // Resolve target NABL number for Lab model
  let targetNablNumber: string | null | undefined = undefined;
  if (input.isNablAccredited === false) {
    targetNablNumber = null;
  } else if (input.isNablAccredited === true) {
    targetNablNumber = input.nablAccreditationNumber?.trim().toUpperCase() || null;
  } else if (input.nablAccreditationNumber !== undefined) {
    targetNablNumber =
      input.nablAccreditationNumber && input.nablAccreditationNumber.trim().length > 0
        ? input.nablAccreditationNumber.trim().toUpperCase()
        : null;
  }

  // Failure-safe banner resolution
  const previousBannerUrl = lab.storeSettings?.bannerUrl ?? null;
  let targetBannerUrl: string | null | undefined = undefined;
  let promotedPermanentPath: string | null = null;
  let stagedFileToCleanup: string | null = null;

  // Staged banner promotion
  const stagedCandidate = input.stagedBannerFilename || (input.bannerUrl?.includes("staged-") ? input.bannerUrl : null);
  if (stagedCandidate) {
    const promo = await promoteStagedLabBanner(labId, stagedCandidate);
    if (!promo.success || !promo.permanentBannerUrl) {
      throw new Error(promo.error || "Failed to promote staged banner file.");
    }
    targetBannerUrl = promo.permanentBannerUrl;
    promotedPermanentPath = promo.permanentPath || null;
    stagedFileToCleanup = promo.stagedPath || null;
  } else if (input.removeBanner === true || input.bannerUrl === null) {
    targetBannerUrl = null;
  } else if (input.bannerUrl !== undefined) {
    targetBannerUrl = sanitizeBannerUrl(input.bannerUrl);
  }

  // Resolve workingHours metadata (preserving existing About/Services/Team/NABL)
  const currentWorkingHours = (lab.storeSettings?.workingHours as Record<string, any>) || {};
  let targetWorkingHours =
    input.workingHours !== undefined
      ? { ...currentWorkingHours, ...input.workingHours }
      : { ...currentWorkingHours };

  if (
    input.isNablAccredited !== undefined ||
    input.nablValidFrom !== undefined ||
    input.nablValidUntil !== undefined ||
    input.nablCertificateUrl !== undefined ||
    targetNablNumber !== undefined
  ) {
    const existingNabl = currentWorkingHours.nabl || {};
    const isAccredited =
      input.isNablAccredited !== undefined
        ? input.isNablAccredited
        : existingNabl.isAccredited !== undefined
        ? Boolean(existingNabl.isAccredited)
        : Boolean(targetNablNumber ?? lab.nablAccreditationNumber);

    targetWorkingHours.nabl = {
      isAccredited,
      accreditationNumber: isAccredited
        ? (targetNablNumber !== undefined ? targetNablNumber : lab.nablAccreditationNumber)
        : null,
      validFrom:
        input.nablValidFrom !== undefined ? input.nablValidFrom : (existingNabl.validFrom || null),
      validUntil:
        input.nablValidUntil !== undefined ? input.nablValidUntil : (existingNabl.validUntil || null),
      certificateUrl:
        input.nablCertificateUrl !== undefined
          ? input.nablCertificateUrl
          : (existingNabl.certificateUrl || null),
    };
  } else if (!targetWorkingHours.nabl && currentWorkingHours.nabl) {
    targetWorkingHours.nabl = currentWorkingHours.nabl;
  }

  let updatedLab;
  let updatedSettings;

  try {
    // Update Lab basic information
    updatedLab = await prisma.lab.update({
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
        licenseNumber:
          input.licenseNumber !== undefined
            ? input.licenseNumber
              ? input.licenseNumber.trim()
              : null
            : undefined,
        nablAccreditationNumber:
          targetNablNumber !== undefined ? targetNablNumber : undefined,
      },
    });

    // Update Store Settings
    updatedSettings = await prisma.labStoreSettings.upsert({
      where: { labId },
      update: {
        heroHeadline:
          input.heroHeadline !== undefined ? input.heroHeadline.trim() : undefined,
        heroSubheadline:
          input.heroSubheadline !== undefined ? input.heroSubheadline.trim() : undefined,
        logoUrl:
          input.logoUrl !== undefined
            ? input.logoUrl
              ? input.logoUrl.trim()
              : null
            : undefined,
        bannerUrl: targetBannerUrl !== undefined ? targetBannerUrl : undefined,
        primaryColor:
          input.primaryColor !== undefined ? input.primaryColor.trim() : undefined,
        accentColor:
          input.accentColor !== undefined ? input.accentColor.trim() : undefined,
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
        workingHours: targetWorkingHours,
        metaTitle: input.metaTitle !== undefined ? input.metaTitle.trim() : undefined,
        metaDescription:
          input.metaDescription !== undefined ? input.metaDescription.trim() : undefined,
      },
      create: {
        labId,
        heroHeadline: input.heroHeadline?.trim() || "Book Diagnostic Tests Online",
        heroSubheadline: input.heroSubheadline?.trim() || "Accurate reports, professional care.",
        logoUrl: input.logoUrl?.trim() || null,
        bannerUrl: targetBannerUrl !== undefined ? targetBannerUrl : null,
        primaryColor: input.primaryColor?.trim() || "#0369a1",
        accentColor: input.accentColor?.trim() || "#0ea5e9",
        homeCollectionAvailable: input.homeCollectionAvailable ?? true,
        homeCollectionFee: input.homeCollectionFee ?? 100,
      },
    });
  } catch (dbError: any) {
    // Failure Recovery: If DB persistence fails, rollback the newly promoted file!
    if (promotedPermanentPath) {
      await fs.unlink(promotedPermanentPath).catch(() => {});
    }
    throw dbError;
  }

  // Post-Commit Cleanup: Now that database is updated safely, clean up staging and old files
  if (stagedFileToCleanup) {
    await fs.unlink(stagedFileToCleanup).catch(() => {});
  }
  if (
    targetBannerUrl !== undefined &&
    previousBannerUrl &&
    previousBannerUrl !== targetBannerUrl
  ) {
    await deleteLabBannerFile(previousBannerUrl);
  }

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
