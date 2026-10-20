import { prisma } from "@/lib/db/prisma";
import { LabStatus } from "@prisma/client";

export interface LabStorefrontData {
  lab: {
    id: string;
    slug: string;
    name: string;
    legalName: string | null;
    code: string;
    email: string;
    phone: string;
    emergencyPhone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    nablAccreditationNumber: string | null;
    status: LabStatus;
    isVerified: boolean;
  };
  settings: {
    primaryColor: string;
    accentColor: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    heroHeadline: string;
    heroSubheadline: string;
    metaDescription?: string | null;
    homeCollectionAvailable: boolean;
    homeCollectionFee: number;
    freeHomeCollectionThreshold: number | null;
    deliveryPromiseNotice: string | null;
    workingHours: Record<string, unknown> | null;
    about: string;
    services: string[];
    schedule: string;
    team: Array<{
      name: string;
      role: string;
      qualifications?: string;
      photoUrl?: string | null;
    }>;
    nabl: {
      isAccredited: boolean;
      accreditationNumber: string | null;
      validFrom: string | null;
      validUntil: string | null;
      isCurrentlyValid: boolean;
      certificateUrl?: string | null;
    };
  };
  paymentSettings: {
    cashOnCollectionEnabled: boolean;
    onlinePaymentEnabled: boolean;
    upiDirectQrUrl: string | null;
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    testCount: number;
  }>;
  popularTests: Array<{
    id: string;
    code: string;
    name: string;
    slug: string;
    sellingPrice: number;
    mrpPrice: number | null;
    sampleType: string;
    tatHours: number;
    fastingRequired: boolean;
    preparationInstructions: string | null;
    categoryName: string;
    homeCollectionAvailable: boolean;
    isHomeCollectionAvailable: boolean;
    homeCollectionEligible: boolean;
  }>;
  packages: Array<{
    id: string;
    name: string;
    slug: string;
    code: string | null;
    description: string | null;
    sellingPrice: number;
    mrpPrice: number | null;
    testCount: number;
    sampleTypes: string[];
    estimatedTatHours: number | null;
    isPopular: boolean;
    homeCollectionAvailable: boolean;
    isHomeCollectionAvailable: boolean;
    imageUrl: string | null;
    tests: Array<{
      id: string;
      name: string;
    }>;
  }>;
  galleryImages: Array<{
    id: string;
    imageUrl: string;
    caption: string | null;
    displayOrder: number;
  }>;
}

/**
 * Validates and sanitizes banner image URLs.
 * Strictly filters out legacy hotel or unrelated hospitality imagery.
 */
export function sanitizeBannerUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Strict check: reject known legacy hotel/resort imagery
  if (
    trimmed.includes("photo-1582719478250-c89cae4dc85b") ||
    trimmed.toLowerCase().includes("hotel") ||
    trimmed.toLowerCase().includes("resort")
  ) {
    return null;
  }

  return trimmed;
}

/**
 * Fetches complete public storefront information for a given laboratory slug.
 * Strictly guarantees tenant isolation.
 */
export async function getLabStorefront(slug: string): Promise<LabStorefrontData | null> {
  const lab = await prisma.lab.findUnique({
    where: { slug },
    include: {
      storeSettings: true,
      paymentSettings: true,
      labTests: {
        where: { isActive: true },
        include: {
          masterTest: {
            include: {
              category: true,
            },
          },
        },
      },
      packages: {
        where: { isActive: true },
        include: {
          packageTests: {
            include: {
              labTest: {
                include: {
                  masterTest: true,
                },
              },
            },
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }],
      },
      galleryImages: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!lab) {
    return null;
  }

  // Parse categories from active tests
  const categoryMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
  for (const lt of lab.labTests) {
    const cat = lt.masterTest.category;
    if (cat) {
      const existing = categoryMap.get(cat.id);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(cat.id, { id: cat.id, name: cat.name, slug: cat.slug, count: 1 });
      }
    }
  }

  const categories = Array.from(categoryMap.values()).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    testCount: c.count,
  }));

  const labHomeServiceAvailable = lab.storeSettings?.homeCollectionAvailable ?? true;

  const popularTests = lab.labTests.map((lt) => {
    const isAvailable = Boolean(
      labHomeServiceAvailable &&
      lt.masterTest.homeCollectionEligible &&
      lt.isHomeCollectionAvailable
    );
    return {
      id: lt.id,
      code: lt.masterTest.code,
      name: lt.masterTest.name,
      slug: lt.masterTest.slug,
      sellingPrice: Number(lt.sellingPrice),
      mrpPrice: lt.mrpPrice ? Number(lt.mrpPrice) : null,
      sampleType: lt.masterTest.sampleType,
      tatHours: lt.customTatHours || lt.masterTest.standardTatHours,
      fastingRequired: lt.masterTest.fastingRequired,
      preparationInstructions: lt.customPreparation || lt.masterTest.preparationInstructions,
      categoryName: lt.masterTest.category.name,
      homeCollectionAvailable: isAvailable,
      isHomeCollectionAvailable: isAvailable,
      homeCollectionEligible: lt.masterTest.homeCollectionEligible,
    };
  });

  const packages = lab.packages.map((pkg) => {
    const allTestsEligible = pkg.packageTests.every(
      (pt) => pt.labTest.masterTest.homeCollectionEligible && pt.labTest.isHomeCollectionAvailable
    );
    const isAvailable = Boolean(
      labHomeServiceAvailable &&
      pkg.isHomeCollectionAvailable &&
      allTestsEligible
    );
    return {
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      code: pkg.code,
      description: pkg.description,
      sellingPrice: Number(pkg.sellingPrice),
      mrpPrice: pkg.mrpPrice ? Number(pkg.mrpPrice) : null,
      testCount: pkg.packageTests.length,
      sampleTypes: pkg.sampleTypes,
      estimatedTatHours: pkg.estimatedTatHours,
      isPopular: pkg.isPopular,
      homeCollectionAvailable: isAvailable,
      isHomeCollectionAvailable: isAvailable,
      imageUrl: pkg.imageUrl || null,
      tests: pkg.packageTests.map((pt) => ({
        id: pt.labTest.id,
        name: pt.labTest.masterTest.name,
      })),
    };
  });

  // Resolve structured storefront metadata safely from workingHours & settings
  const rawWorkingHours = (lab.storeSettings?.workingHours as Record<string, any>) || {};

  const about =
    (typeof rawWorkingHours.about === "string" && rawWorkingHours.about.trim().length > 0
      ? rawWorkingHours.about.trim()
      : null) ||
    lab.storeSettings?.metaDescription ||
    `${lab.name} is a trusted clinical pathology and diagnostic testing center dedicated to providing high-accuracy laboratory investigations, preventive health checkups, and rapid digital report delivery.`;

  let services: string[] = [];
  if (Array.isArray(rawWorkingHours.services) && rawWorkingHours.services.length > 0) {
    services = rawWorkingHours.services.map((s: any) => String(s).trim()).filter(Boolean);
  }
  if (services.length === 0) {
    services = [
      "Clinical Pathology & Hematology",
      "Biochemistry & Metabolic Panels",
      "Preventive Full Body Checkups",
      ...(labHomeServiceAvailable ? ["Home Sample Collection at Doorstep"] : []),
      "Secure Digital Reports via WhatsApp & Email",
    ];
  }

  let schedule = "";
  if (typeof rawWorkingHours.schedule === "string" && rawWorkingHours.schedule.trim().length > 0) {
    schedule = rawWorkingHours.schedule.trim();
  } else if (rawWorkingHours.schedule && typeof rawWorkingHours.schedule === "object") {
    const s = rawWorkingHours.schedule;
    schedule = s.weekdays ? `Mon - Sat: ${s.weekdays}${s.sunday ? ` | Sun: ${s.sunday}` : ""}` : "";
  } else if (rawWorkingHours.monday && typeof rawWorkingHours.monday === "object") {
    schedule = "Mon - Sat: 07:00 AM - 08:00 PM | Sun: 07:00 AM - 02:00 PM";
  }
  if (!schedule) {
    schedule = "Monday - Saturday: 7:00 AM - 8:00 PM | Sunday: 7:00 AM - 2:00 PM";
  }

  let team: Array<{
    name: string;
    role: string;
    qualifications?: string;
    photoUrl?: string | null;
  }> = [];
  if (Array.isArray(rawWorkingHours.team) && rawWorkingHours.team.length > 0) {
    team = rawWorkingHours.team
      .map((m: any) => ({
        name: String(m.name || "").trim(),
        role: String(m.role || "").trim(),
        qualifications: m.qualifications ? String(m.qualifications).trim() : undefined,
        photoUrl: m.photoUrl ? String(m.photoUrl).trim() : null,
      }))
      .filter((m: any) => m.name && m.role);
  }

  // Resolve NABL Accreditation & Strict Date Validity
  const nablRaw = (rawWorkingHours.nabl as Record<string, any>) || {};
  const isAccredited = Boolean(
    nablRaw.isAccredited ??
      (lab.nablAccreditationNumber && lab.nablAccreditationNumber.trim().length > 0)
  );
  const accreditationNumber = isAccredited
    ? lab.nablAccreditationNumber || nablRaw.accreditationNumber || null
    : null;
  const validFrom = nablRaw.validFrom ? String(nablRaw.validFrom).trim() : null;
  const validUntil = nablRaw.validUntil ? String(nablRaw.validUntil).trim() : null;

  let isCurrentlyValid = false;
  // Accreditation trust invariant: Badges must ONLY display when laboratory is explicitly verified by Superadmin
  if (lab.isVerified && isAccredited && accreditationNumber && validFrom && validUntil) {
    const fromTime = new Date(validFrom).getTime();
    const untilDate = new Date(validUntil);
    untilDate.setHours(23, 59, 59, 999);
    const untilTime = untilDate.getTime();
    const nowTime = Date.now();

    if (!isNaN(fromTime) && !isNaN(untilTime) && nowTime >= fromTime && nowTime <= untilTime) {
      isCurrentlyValid = true;
    }
  }

  const nabl = {
    isAccredited,
    accreditationNumber,
    validFrom,
    validUntil,
    isCurrentlyValid,
    certificateUrl: nablRaw.certificateUrl || null,
  };

  return {
    lab: {
      id: lab.id,
      slug: lab.slug,
      name: lab.name,
      legalName: lab.legalName,
      code: lab.code,
      email: lab.email,
      phone: lab.phone,
      emergencyPhone: lab.emergencyPhone,
      addressLine1: lab.addressLine1,
      addressLine2: lab.addressLine2,
      city: lab.city,
      state: lab.state,
      postalCode: lab.postalCode,
      nablAccreditationNumber: lab.nablAccreditationNumber,
      status: lab.status,
      isVerified: lab.isVerified,
    },
    settings: {
      primaryColor: lab.storeSettings?.primaryColor || "#0284c7",
      accentColor: lab.storeSettings?.accentColor || "#0ea5e9",
      logoUrl: lab.storeSettings?.logoUrl || null,
      bannerUrl: sanitizeBannerUrl(lab.storeSettings?.bannerUrl),
      heroHeadline: lab.storeSettings?.heroHeadline || "Book Diagnostic Tests & Health Packages Online",
      heroSubheadline:
        lab.storeSettings?.heroSubheadline ||
        "Accurate clinical reports, timely home sample collection, and professional care.",
      metaDescription: lab.storeSettings?.metaDescription || null,
      homeCollectionAvailable: lab.storeSettings?.homeCollectionAvailable ?? true,
      homeCollectionFee: lab.storeSettings?.homeCollectionFee ? Number(lab.storeSettings.homeCollectionFee) : 100,
      freeHomeCollectionThreshold: lab.storeSettings?.freeHomeCollectionThreshold
        ? Number(lab.storeSettings.freeHomeCollectionThreshold)
        : null,
      deliveryPromiseNotice: lab.storeSettings?.deliveryPromiseNotice || "Digital reports delivered in 12-24 hours",
      workingHours: (lab.storeSettings?.workingHours as Record<string, unknown>) || null,
      about,
      services,
      schedule,
      team,
      nabl,
    },
    paymentSettings: {
      cashOnCollectionEnabled: lab.paymentSettings?.cashOnCollectionEnabled ?? true,
      onlinePaymentEnabled: Boolean(lab.paymentSettings?.isConfigured && lab.paymentSettings?.razorpayKeyId),
      upiDirectQrUrl: lab.paymentSettings?.upiDirectQrUrl || null,
    },
    categories,
    popularTests,
    packages,
    galleryImages: lab.galleryImages.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      caption: img.caption,
      displayOrder: img.displayOrder,
    })),
  };
}
