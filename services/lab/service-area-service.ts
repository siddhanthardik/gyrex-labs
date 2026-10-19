import { prisma } from "@/lib/db/prisma";
import { AuthorizationError } from "@/lib/auth/context";

export interface AddPincodeInput {
  pincode: string;
  localityName?: string | null;
  branchId?: string | null;
}

export interface BulkAddPincodesInput {
  pincodes: Array<{
    pincode: string;
    localityName?: string | null;
  }>;
  branchId?: string | null;
}

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/**
 * Validates Indian 6-digit postal PIN code format.
 * Must not begin with 0 and must be exactly 6 digits.
 */
export function isValidIndianPincode(pincode: string): boolean {
  if (!pincode || typeof pincode !== "string") return false;
  return PINCODE_REGEX.test(pincode.trim());
}

/**
 * Retrieves all configured serviceable areas for a laboratory.
 * Supports optional branch filtering.
 */
export async function getLabServiceAreas(labId: string, branchId?: string | null) {
  if (!labId || !labId.trim()) {
    throw new Error("labId is required");
  }

  const whereClause: any = {
    labId: labId.trim(),
  };

  if (branchId !== undefined) {
    whereClause.branchId = branchId;
  }

  const areas = await prisma.labServiceArea.findMany({
    where: whereClause,
    include: {
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [
      { pincode: "asc" },
      { createdAt: "desc" },
    ],
  });

  return areas.map((a) => ({
    id: a.id,
    labId: a.labId,
    branchId: a.branchId,
    branchName: a.branch?.name || null,
    branchCode: a.branch?.code || null,
    pincode: a.pincode,
    localityName: a.localityName,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  }));
}

/**
 * Adds a single serviceable PIN code to a laboratory or branch.
 * Enforces format validation, tenant boundaries, and duplicate checks.
 */
export async function addPincodeCoverage(labId: string, input: AddPincodeInput) {
  const cleanLabId = labId.trim();
  const cleanPin = (input.pincode || "").trim();

  if (!isValidIndianPincode(cleanPin)) {
    throw new Error(`Invalid Indian PIN code '${cleanPin}'. PIN code must be exactly 6 digits and cannot start with 0.`);
  }

  let cleanBranchId: string | null = null;
  if (input.branchId && input.branchId.trim().length > 0) {
    cleanBranchId = input.branchId.trim();
    // Validate tenant ownership: Branch must belong to this laboratory!
    const branch = await prisma.labBranch.findUnique({
      where: { id: cleanBranchId },
    });
    if (!branch || branch.labId !== cleanLabId) {
      throw new AuthorizationError(`Security Violation: Branch does not belong to laboratory '${cleanLabId}'.`, 403);
    }
  }

  const cleanLocality = input.localityName ? input.localityName.trim().slice(0, 100) : null;

  // Check for duplicate PIN code within the same scope
  const existing = await prisma.labServiceArea.findFirst({
    where: {
      labId: cleanLabId,
      branchId: cleanBranchId,
      pincode: cleanPin,
    },
  });

  if (existing) {
    if (!existing.isActive) {
      // Re-activate if was previously disabled
      return prisma.labServiceArea.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          localityName: cleanLocality || existing.localityName,
        },
      });
    }
    throw new Error(`PIN code ${cleanPin} is already configured in your service area coverage.`);
  }

  return prisma.labServiceArea.create({
    data: {
      labId: cleanLabId,
      branchId: cleanBranchId,
      pincode: cleanPin,
      localityName: cleanLocality,
      isActive: true,
    },
  });
}

/**
 * Removes a serviceable PIN code by ID.
 * Strictly verifies tenant ownership before deletion.
 */
export async function removePincodeCoverage(labId: string, serviceAreaId: string) {
  const cleanLabId = labId.trim();
  const cleanId = serviceAreaId.trim();

  const area = await prisma.labServiceArea.findUnique({
    where: { id: cleanId },
  });

  if (!area) {
    throw new Error("Service area record not found.");
  }

  if (area.labId !== cleanLabId) {
    throw new AuthorizationError("Security Violation: You cannot delete service areas belonging to another laboratory.", 403);
  }

  await prisma.labServiceArea.delete({
    where: { id: cleanId },
  });

  return { success: true };
}

/**
 * Bulk imports multiple PIN codes at once.
 * Skips duplicates and returns summary.
 */
export async function bulkAddPincodes(labId: string, input: BulkAddPincodesInput) {
  const cleanLabId = labId.trim();
  let cleanBranchId: string | null = null;

  if (input.branchId && input.branchId.trim().length > 0) {
    cleanBranchId = input.branchId.trim();
    const branch = await prisma.labBranch.findUnique({
      where: { id: cleanBranchId },
    });
    if (!branch || branch.labId !== cleanLabId) {
      throw new AuthorizationError(`Security Violation: Branch does not belong to laboratory '${cleanLabId}'.`, 403);
    }
  }

  let addedCount = 0;
  let skippedCount = 0;
  const invalidPincodes: string[] = [];

  for (const item of input.pincodes) {
    const pin = (item.pincode || "").trim();
    if (!isValidIndianPincode(pin)) {
      invalidPincodes.push(pin);
      continue;
    }

    try {
      await addPincodeCoverage(cleanLabId, {
        pincode: pin,
        localityName: item.localityName || null,
        branchId: cleanBranchId,
      });
      addedCount++;
    } catch {
      skippedCount++;
    }
  }

  return {
    addedCount,
    skippedCount,
    invalidPincodes,
  };
}
