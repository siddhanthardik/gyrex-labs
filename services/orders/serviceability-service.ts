import { prisma } from "@/lib/db/prisma";
import { isValidIndianPincode } from "../lab/service-area-service";
import { BranchAssignmentMode } from "@prisma/client";

export interface ServiceabilityCheckResult {
  serviceable: boolean;
  reason?: "INVALID_PINCODE" | "LAB_NOT_FOUND" | "HOME_COLLECTION_DISABLED" | "OUT_OF_COVERAGE";
  message?: string;
  labId?: string;
  labName?: string;
  pincode?: string;
  isEnterprise?: boolean;
  assignmentMode?: BranchAssignmentMode;
  defaultFee?: number;
  defaultFreeThreshold?: number | null;
  homeCollectionFee?: number;
  eligibleBranches?: Array<{
    id: string;
    name: string;
    code: string;
    locality: string | null;
    addressLine1: string;
    operatingHours: string | null;
    fee: number;
    freeThreshold: number | null;
  }>;
}

/**
 * Server-authoritative serviceability checker.
 * Validates whether a patient's confirmed PIN code is actively covered by the laboratory.
 * Never assumes entire cities or neighbouring PIN codes are covered.
 */
export async function checkHomeCollectionServiceability(
  labSlugOrId: string,
  pincode: string,
  orderSubtotal?: number
): Promise<ServiceabilityCheckResult> {
  const cleanPin = (pincode || "").trim();

  if (!isValidIndianPincode(cleanPin)) {
    return {
      serviceable: false,
      reason: "INVALID_PINCODE",
      message: "Please enter a valid 6-digit Indian PIN code.",
    };
  }

  const lab = await prisma.lab.findFirst({
    where: {
      OR: [{ slug: labSlugOrId.trim() }, { id: labSlugOrId.trim() }],
    },
    include: {
      storeSettings: true,
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!lab) {
    return {
      serviceable: false,
      reason: "LAB_NOT_FOUND",
      message: "Laboratory not found.",
    };
  }

  // Check if laboratory has disabled home collection globally
  if (!lab.storeSettings?.homeCollectionAvailable) {
    return {
      serviceable: false,
      reason: "HOME_COLLECTION_DISABLED",
      message: `${lab.name} does not currently offer home sample collection. Laboratory visit is available.`,
      labId: lab.id,
      labName: lab.name,
      pincode: cleanPin,
    };
  }

  // Query explicit service area coverage for this PIN code
  const serviceAreas = await prisma.labServiceArea.findMany({
    where: {
      labId: lab.id,
      pincode: cleanPin,
      isActive: true,
    },
    include: {
      branch: true,
    },
  });

  if (serviceAreas.length === 0) {
    return {
      serviceable: false,
      reason: "OUT_OF_COVERAGE",
      message: `${lab.name} does not currently provide home sample collection in PIN code ${cleanPin}. You can still book an in-person laboratory visit.`,
      labId: lab.id,
      labName: lab.name,
      pincode: cleanPin,
    };
  }

  const isEnterprise = lab.subscription?.plan?.code === "PLAN_ENTERPRISE";
  const assignmentMode = lab.storeSettings.branchAssignmentMode || BranchAssignmentMode.AUTOMATIC;
  const labDefaultFee = Number(lab.storeSettings.homeCollectionFee ?? 100);
  const labDefaultFreeThreshold = lab.storeSettings.freeHomeCollectionThreshold
    ? Number(lab.storeSettings.freeHomeCollectionThreshold)
    : null;

  // Filter branches that are active and offer home collection
  const branchMap = new Map<string, any>();
  for (const sa of serviceAreas) {
    if (sa.branch && sa.branch.isActive && sa.branch.homeCollectionAvailable) {
      if (!branchMap.has(sa.branch.id)) {
        branchMap.set(sa.branch.id, {
          id: sa.branch.id,
          name: sa.branch.name,
          code: sa.branch.code,
          locality: sa.branch.locality,
          addressLine1: sa.branch.addressLine1,
          operatingHours: sa.branch.operatingHours,
          maxDailyCapacity: sa.branch.maxDailyCapacity,
          fee: sa.branch.homeCollectionFee ? Number(sa.branch.homeCollectionFee) : labDefaultFee,
          freeThreshold: sa.branch.freeHomeCollectionThreshold
            ? Number(sa.branch.freeHomeCollectionThreshold)
            : labDefaultFreeThreshold,
        });
      }
    }
  }

  const eligibleBranches = Array.from(branchMap.values());

  // If there are specific branch service areas defined, but none of the branches are active:
  const hasBranchSpecificAreas = serviceAreas.some((sa) => sa.branchId !== null);
  const hasLabWideArea = serviceAreas.some((sa) => sa.branchId === null);

  if (hasBranchSpecificAreas && !hasLabWideArea && eligibleBranches.length === 0) {
    return {
      serviceable: false,
      reason: "OUT_OF_COVERAGE",
      message: `Home collection branches serving PIN code ${cleanPin} are currently inactive or unavailable.`,
      labId: lab.id,
      labName: lab.name,
      pincode: cleanPin,
    };
  }

  let calculatedFee = labDefaultFee;
  if (
    orderSubtotal !== undefined &&
    labDefaultFreeThreshold !== null &&
    orderSubtotal >= labDefaultFreeThreshold
  ) {
    calculatedFee = 0;
  }

  return {
    serviceable: true,
    labId: lab.id,
    labName: lab.name,
    pincode: cleanPin,
    isEnterprise,
    assignmentMode,
    defaultFee: labDefaultFee,
    defaultFreeThreshold: labDefaultFreeThreshold,
    homeCollectionFee: calculatedFee,
    eligibleBranches,
  };
}
