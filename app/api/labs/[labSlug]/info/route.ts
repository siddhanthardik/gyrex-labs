import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { LabStatus } from "@prisma/client";

/**
 * Public Laboratory Information Endpoint
 *
 * Exposes a strictly sanitized, safe public DTO of the active laboratory storefront
 * for patient consumption and checkout laboratory verification.
 *
 * Invariants:
 * - Does NOT require patient authentication, LAB_ADMIN session, or SUPERADMIN session.
 * - Does NOT expose any secrets (passwords, API keys, Razorpay secrets, staff, financial or audit data).
 * - Validates labSlug format.
 * - Enforces that the laboratory is published and ACTIVE; returns 404 for unknown/unavailable labs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ labSlug: string }> }
) {
  const { labSlug } = await params;

  // Validate labSlug format
  if (!labSlug || typeof labSlug !== "string" || !/^[a-z0-9-]+$/.test(labSlug)) {
    return NextResponse.json({ error: "Invalid laboratory slug format." }, { status: 400 });
  }

  const lab = await prisma.lab.findUnique({
    where: { slug: labSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      legalName: true,
      phone: true,
      emergencyPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      isVerified: true,
      nablAccreditationNumber: true,
      status: true,
      storeSettings: {
        select: {
          primaryColor: true,
          accentColor: true,
          logoUrl: true,
          bannerUrl: true,
          heroHeadline: true,
          heroSubheadline: true,
          homeCollectionAvailable: true,
          homeCollectionFee: true,
          freeHomeCollectionThreshold: true,
          deliveryPromiseNotice: true,
        },
      },
      paymentSettings: {
        select: {
          cashOnCollectionEnabled: true,
          upiDirectQrUrl: true,
          isConfigured: true,
          razorpayKeyId: true,
          // Explicitly OMIT razorpayKeySecretEncrypted and razorpayWebhookSecretEncrypted!
        },
      },
    },
  });

  // Verify lab existence and published active status
  if (!lab || lab.status !== LabStatus.ACTIVE) {
    return NextResponse.json(
      { error: "Laboratory not found or currently unavailable for public bookings." },
      { status: 404 }
    );
  }

  // Construct safe public DTO
  const publicLabDTO = {
    id: lab.id,
    name: lab.name,
    slug: lab.slug,
    legalName: lab.legalName,
    addressLine1: lab.addressLine1,
    addressLine2: lab.addressLine2,
    city: lab.city,
    state: lab.state,
    postalCode: lab.postalCode,
    phone: lab.phone,
    emergencyPhone: lab.emergencyPhone,
    isVerified: lab.isVerified,
    nablAccreditationNumber: lab.nablAccreditationNumber,
    status: lab.status,
    storeSettings: lab.storeSettings
      ? {
          primaryColor: lab.storeSettings.primaryColor,
          accentColor: lab.storeSettings.accentColor,
          logoUrl: lab.storeSettings.logoUrl,
          bannerUrl: lab.storeSettings.bannerUrl,
          heroHeadline: lab.storeSettings.heroHeadline,
          heroSubheadline: lab.storeSettings.heroSubheadline,
          homeCollectionAvailable: lab.storeSettings.homeCollectionAvailable,
          homeCollectionFee: Number(lab.storeSettings.homeCollectionFee),
          freeHomeCollectionThreshold: lab.storeSettings.freeHomeCollectionThreshold
            ? Number(lab.storeSettings.freeHomeCollectionThreshold)
            : null,
          deliveryPromiseNotice: lab.storeSettings.deliveryPromiseNotice,
        }
      : null,
    paymentSettings: lab.paymentSettings
      ? {
          cashOnCollectionEnabled: lab.paymentSettings.cashOnCollectionEnabled,
          onlinePaymentEnabled: Boolean(
            lab.paymentSettings.isConfigured && lab.paymentSettings.razorpayKeyId
          ),
          upiDirectQrUrl: lab.paymentSettings.upiDirectQrUrl,
        }
      : null,
  };

  return NextResponse.json(publicLabDTO);
}
