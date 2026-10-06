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
    homeCollectionAvailable: boolean;
    homeCollectionFee: number;
    freeHomeCollectionThreshold: number | null;
    deliveryPromiseNotice: string | null;
    workingHours: Record<string, unknown> | null;
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
    tests: Array<{
      id: string;
      name: string;
    }>;
  }>;
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
      tests: pkg.packageTests.map((pt) => ({
        id: pt.labTest.id,
        name: pt.labTest.masterTest.name,
      })),
    };
  });

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
      bannerUrl: lab.storeSettings?.bannerUrl || null,
      heroHeadline: lab.storeSettings?.heroHeadline || "Book Diagnostic Tests & Health Packages Online",
      heroSubheadline:
        lab.storeSettings?.heroSubheadline ||
        "Accurate clinical reports, timely home sample collection, and professional care.",
      homeCollectionAvailable: lab.storeSettings?.homeCollectionAvailable ?? true,
      homeCollectionFee: lab.storeSettings?.homeCollectionFee ? Number(lab.storeSettings.homeCollectionFee) : 100,
      freeHomeCollectionThreshold: lab.storeSettings?.freeHomeCollectionThreshold
        ? Number(lab.storeSettings.freeHomeCollectionThreshold)
        : null,
      deliveryPromiseNotice: lab.storeSettings?.deliveryPromiseNotice || "Digital reports delivered in 12-24 hours",
      workingHours: (lab.storeSettings?.workingHours as Record<string, unknown>) || null,
    },
    paymentSettings: {
      cashOnCollectionEnabled: lab.paymentSettings?.cashOnCollectionEnabled ?? true,
      onlinePaymentEnabled: Boolean(lab.paymentSettings?.isConfigured && lab.paymentSettings?.razorpayKeyId),
      upiDirectQrUrl: lab.paymentSettings?.upiDirectQrUrl || null,
    },
    categories,
    popularTests,
    packages,
  };
}
