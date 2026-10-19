import { prisma } from "@/lib/db/prisma";
import { AuthorizationError } from "@/lib/auth/context";
import { assertLabCanManageBranches, getLabMaxLocations } from "../subscription/entitlement-service";
import { isValidIndianPincode } from "./service-area-service";
import { BranchAssignmentMode } from "@prisma/client";

export interface CreateBranchInput {
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  operatingHours?: string | null;
  homeCollectionAvailable?: boolean;
  homeCollectionFee?: number | null;
  freeHomeCollectionThreshold?: number | null;
  maxDailyCapacity?: number;
  priority?: number;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  phone?: string;
  email?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  locality?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  operatingHours?: string | null;
  homeCollectionAvailable?: boolean;
  homeCollectionFee?: number | null;
  freeHomeCollectionThreshold?: number | null;
  maxDailyCapacity?: number;
  priority?: number;
  isActive?: boolean;
}

/**
 * Retrieves all branches configured for a laboratory.
 */
export async function getLabBranches(labId: string) {
  const cleanId = (labId || "").trim();

  const branches = await prisma.labBranch.findMany({
    where: { labId: cleanId },
    include: {
      serviceAreas: {
        where: { isActive: true },
        select: { id: true, pincode: true, localityName: true },
      },
      _count: {
        select: { collections: true },
      },
    },
    orderBy: [
      { priority: "desc" },
      { name: "asc" },
    ],
  });

  return branches.map((b) => ({
    id: b.id,
    labId: b.labId,
    name: b.name,
    code: b.code,
    phone: b.phone,
    email: b.email,
    addressLine1: b.addressLine1,
    addressLine2: b.addressLine2,
    locality: b.locality,
    city: b.city,
    state: b.state,
    postalCode: b.postalCode,
    latitude: b.latitude,
    longitude: b.longitude,
    operatingHours: b.operatingHours,
    homeCollectionAvailable: b.homeCollectionAvailable,
    homeCollectionFee: b.homeCollectionFee ? Number(b.homeCollectionFee) : null,
    freeHomeCollectionThreshold: b.freeHomeCollectionThreshold ? Number(b.freeHomeCollectionThreshold) : null,
    maxDailyCapacity: b.maxDailyCapacity,
    priority: b.priority,
    isActive: b.isActive,
    serviceAreasCount: b.serviceAreas.length,
    serviceAreas: b.serviceAreas,
    totalCollectionsCount: b._count.collections,
    createdAt: b.createdAt.toISOString(),
  }));
}

/**
 * Creates a new branch under the laboratory.
 * Strictly enforces Enterprise entitlement and location limit.
 */
export async function createBranch(labId: string, input: CreateBranchInput) {
  const cleanLabId = (labId || "").trim();

  // 1. Enterprise Plan Entitlement Guard
  await assertLabCanManageBranches(cleanLabId);

  // 2. Capacity Limit Guard
  const maxLocations = await getLabMaxLocations(cleanLabId);
  const currentCount = await prisma.labBranch.count({ where: { labId: cleanLabId } });
  if (currentCount >= maxLocations) {
    throw new Error(`Location limit reached. Your plan allows a maximum of ${maxLocations} branches.`);
  }

  // 3. Validation
  const name = (input.name || "").trim();
  const code = (input.code || "").trim().toUpperCase();
  const phone = (input.phone || "").trim();
  const addressLine1 = (input.addressLine1 || "").trim();
  const city = (input.city || "").trim();
  const state = (input.state || "").trim();
  const postalCode = (input.postalCode || "").trim();

  if (!name || name.length < 3) {
    throw new Error("Branch name must be at least 3 characters.");
  }
  if (!code || !/^[A-Z0-9_-]{2,15}$/.test(code)) {
    throw new Error("Branch code must be 2-15 alphanumeric characters (e.g. 'SDPL-JKP').");
  }
  if (phone && phone.replace(/\D/g, "").length < 10) {
    throw new Error("Branch contact phone must be a valid phone number.");
  }
  if (!addressLine1 || !city || !state) {
    throw new Error("Address line 1, city, and state are required for every branch.");
  }
  if (!isValidIndianPincode(postalCode)) {
    throw new Error(`Invalid branch PIN code '${postalCode}'. Must be exactly 6 digits.`);
  }

  // Check unique code per lab
  const existingCode = await prisma.labBranch.findUnique({
    where: { labId_code: { labId: cleanLabId, code } },
  });
  if (existingCode) {
    throw new Error(`A branch with code '${code}' already exists in your laboratory.`);
  }

  return prisma.labBranch.create({
    data: {
      labId: cleanLabId,
      name,
      code,
      phone,
      email: input.email?.trim() || null,
      addressLine1,
      addressLine2: input.addressLine2?.trim() || null,
      locality: input.locality?.trim() || null,
      city,
      state,
      postalCode,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      operatingHours: input.operatingHours?.trim() || "Mon-Sat: 07:00 AM - 08:00 PM",
      homeCollectionAvailable: input.homeCollectionAvailable ?? true,
      homeCollectionFee: input.homeCollectionFee !== undefined && input.homeCollectionFee !== null ? input.homeCollectionFee : null,
      freeHomeCollectionThreshold: input.freeHomeCollectionThreshold !== undefined && input.freeHomeCollectionThreshold !== null ? input.freeHomeCollectionThreshold : null,
      maxDailyCapacity: input.maxDailyCapacity ?? 50,
      priority: input.priority ?? 0,
      isActive: true,
    },
  });
}

/**
 * Updates an existing branch.
 * Verifies tenant ownership.
 */
export async function updateBranch(labId: string, branchId: string, input: UpdateBranchInput) {
  const cleanLabId = (labId || "").trim();
  const cleanBranchId = (branchId || "").trim();

  const branch = await prisma.labBranch.findUnique({
    where: { id: cleanBranchId },
  });

  if (!branch || branch.labId !== cleanLabId) {
    throw new AuthorizationError("Security Violation: Branch not found or does not belong to this laboratory.", 403);
  }

  const dataToUpdate: any = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 3) throw new Error("Branch name must be at least 3 characters.");
    dataToUpdate.name = name;
  }
  if (input.phone !== undefined) {
    dataToUpdate.phone = input.phone.trim();
  }
  if (input.email !== undefined) {
    dataToUpdate.email = input.email ? input.email.trim() : null;
  }
  if (input.addressLine1 !== undefined) {
    dataToUpdate.addressLine1 = input.addressLine1.trim();
  }
  if (input.addressLine2 !== undefined) {
    dataToUpdate.addressLine2 = input.addressLine2 ? input.addressLine2.trim() : null;
  }
  if (input.locality !== undefined) {
    dataToUpdate.locality = input.locality ? input.locality.trim() : null;
  }
  if (input.city !== undefined) {
    dataToUpdate.city = input.city.trim();
  }
  if (input.state !== undefined) {
    dataToUpdate.state = input.state.trim();
  }
  if (input.postalCode !== undefined) {
    const pin = input.postalCode.trim();
    if (!isValidIndianPincode(pin)) throw new Error(`Invalid PIN code '${pin}'.`);
    dataToUpdate.postalCode = pin;
  }
  if (input.latitude !== undefined) dataToUpdate.latitude = input.latitude;
  if (input.longitude !== undefined) dataToUpdate.longitude = input.longitude;
  if (input.operatingHours !== undefined) dataToUpdate.operatingHours = input.operatingHours?.trim() || null;
  if (input.homeCollectionAvailable !== undefined) dataToUpdate.homeCollectionAvailable = input.homeCollectionAvailable;
  if (input.homeCollectionFee !== undefined) dataToUpdate.homeCollectionFee = input.homeCollectionFee;
  if (input.freeHomeCollectionThreshold !== undefined) dataToUpdate.freeHomeCollectionThreshold = input.freeHomeCollectionThreshold;
  if (input.maxDailyCapacity !== undefined) dataToUpdate.maxDailyCapacity = input.maxDailyCapacity;
  if (input.priority !== undefined) dataToUpdate.priority = input.priority;
  if (input.isActive !== undefined) dataToUpdate.isActive = input.isActive;

  return prisma.labBranch.update({
    where: { id: cleanBranchId },
    data: dataToUpdate,
  });
}

/**
 * Safely deactivates or removes a branch.
 * If historical orders are linked to this branch, it soft-deactivates (isActive: false)
 * to strictly preserve historical order integrity without foreign key violations.
 */
export async function deleteBranch(labId: string, branchId: string) {
  const cleanLabId = (labId || "").trim();
  const cleanBranchId = (branchId || "").trim();

  const branch = await prisma.labBranch.findUnique({
    where: { id: cleanBranchId },
    include: {
      _count: {
        select: { collections: true },
      },
    },
  });

  if (!branch || branch.labId !== cleanLabId) {
    throw new AuthorizationError("Security Violation: Branch not found or does not belong to this laboratory.", 403);
  }

  // If collections are linked, soft-deactivate instead of hard deleting
  if (branch._count.collections > 0) {
    await prisma.labBranch.update({
      where: { id: cleanBranchId },
      data: { isActive: false },
    });
    return {
      success: true,
      action: "DEACTIVATED",
      deactivated: true,
      message: `Branch '${branch.name}' has ${branch._count.collections} historical collection records and has been deactivated.`,
    };
  }

  // If no collections are linked, delete branch and its service areas
  await prisma.labBranch.delete({
    where: { id: cleanBranchId },
  });

  return {
    success: true,
    action: "DELETED",
    message: `Branch '${branch.name}' has been permanently deleted.`,
  };
}

/**
 * Updates the laboratory's branch assignment mode (AUTOMATIC or PATIENT_CHOICE).
 * Guarded by Enterprise entitlement.
 */
export async function updateBranchAssignmentMode(labId: string, mode: BranchAssignmentMode) {
  const cleanLabId = (labId || "").trim();

  await assertLabCanManageBranches(cleanLabId);

  return prisma.labStoreSettings.update({
    where: { labId: cleanLabId },
    data: { branchAssignmentMode: mode },
  });
}
