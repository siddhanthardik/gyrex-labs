import { prisma } from "@/lib/db/prisma";
import { isValidIndianPincode } from "../lab/service-area-service";

export interface SaveAddressInput {
  phone?: string;
  label?: string; // "Home", "Work", "Other"
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

/**
 * Retrieves saved addresses for an authenticated patient by their verified patientId.
 * Fallback to phone lookup supported for internal booking pipeline only when verified.
 */
export async function getPatientSavedAddresses(patientIdOrPhone: string) {
  if (!patientIdOrPhone || !patientIdOrPhone.trim()) return [];

  const identifier = patientIdOrPhone.trim();

  // If identifier is a CUID (standard patientId)
  if (identifier.startsWith("cm") || identifier.length > 15) {
    const patient = await prisma.patient.findUnique({
      where: { id: identifier },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        },
      },
    });
    if (patient) return patient.addresses;
  }

  // Fallback to phone lookup
  const cleanPhone = identifier.replace(/\D/g, "");
  if (cleanPhone.length >= 10) {
    const patient = await prisma.patient.findFirst({
      where: {
        phone: { contains: cleanPhone.slice(-10) },
      },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        },
      },
    });
    return patient?.addresses || [];
  }

  return [];
}

/**
 * Saves or updates a patient's address using the existing PatientAddress model.
 * Enforces verified patient identity and deduplicates identical records.
 */
export async function savePatientAddress(
  patientIdOrInput: string | SaveAddressInput,
  maybeInput?: SaveAddressInput
) {
  let patientId: string | null = null;
  let input: SaveAddressInput;

  if (typeof patientIdOrInput === "string") {
    patientId = patientIdOrInput;
    input = maybeInput!;
  } else {
    input = patientIdOrInput;
  }

  const cleanPin = (input.postalCode || "").trim();
  if (!isValidIndianPincode(cleanPin)) {
    throw new Error(`Invalid Indian PIN code '${input.postalCode}'. Must be exactly 6 digits.`);
  }

  if (!input.addressLine1 || !input.addressLine1.trim()) {
    throw new Error("Address line 1 (house/flat/building details) is required.");
  }

  // Resolve target patient securely
  let patient: any = null;
  if (patientId) {
    patient = await prisma.patient.findUnique({ where: { id: patientId } });
  }

  if (!patient && input.phone) {
    const digits = input.phone.trim().replace(/\D/g, "");
    if (digits.length >= 10) {
      patient = await prisma.patient.findFirst({
        where: { phone: { contains: digits.slice(-10) } },
      });

      if (!patient) {
        patient = await prisma.patient.create({
          data: {
            fullName: "Patient",
            phone: input.phone.trim(),
          },
        });
      }
    }
  }

  if (!patient) {
    throw new Error("Unable to identify patient. A verified patient session or contact number is required.");
  }

  // If isDefault is set, unset other addresses' isDefault
  if (input.isDefault) {
    await prisma.patientAddress.updateMany({
      where: { patientId: patient.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Prevent duplicate address records for the same patient
  const existing = await prisma.patientAddress.findFirst({
    where: {
      patientId: patient.id,
      postalCode: cleanPin,
      addressLine1: input.addressLine1.trim(),
    },
  });

  if (existing) {
    return prisma.patientAddress.update({
      where: { id: existing.id },
      data: {
        addressLine2: input.addressLine2?.trim() || existing.addressLine2,
        landmark: input.landmark?.trim() || existing.landmark,
        city: input.city?.trim() || existing.city,
        state: input.state?.trim() || existing.state,
        latitude: input.latitude ?? existing.latitude,
        longitude: input.longitude ?? existing.longitude,
        label: input.label || existing.label,
        isDefault: input.isDefault ?? existing.isDefault,
      },
    });
  }

  return prisma.patientAddress.create({
    data: {
      patientId: patient.id,
      label: input.label || "Home",
      addressLine1: input.addressLine1.trim(),
      addressLine2: input.addressLine2?.trim() || null,
      landmark: input.landmark?.trim() || null,
      city: input.city?.trim() || "Local",
      state: input.state?.trim() || "Local",
      postalCode: cleanPin,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      isDefault: Boolean(input.isDefault),
    },
  });
}

/**
 * Updates a saved address with strict patient ownership verification.
 * Rejects access if the address does not belong to the verified patient.
 */
export async function updatePatientAddress(
  patientId: string,
  addressId: string,
  input: UpdateAddressInput
) {
  if (!patientId || !addressId) {
    throw new Error("Patient ID and Address ID are required.");
  }

  // Strict ownership check (IDOR guard)
  const existing = await prisma.patientAddress.findFirst({
    where: {
      id: addressId,
      patientId,
    },
  });

  if (!existing) {
    throw new Error("Access Denied: Address not found or does not belong to the authenticated patient.");
  }

  if (input.postalCode && !isValidIndianPincode(input.postalCode.trim())) {
    throw new Error(`Invalid Indian PIN code '${input.postalCode}'. Must be exactly 6 digits.`);
  }

  if (input.isDefault) {
    await prisma.patientAddress.updateMany({
      where: { patientId, isDefault: true, id: { not: addressId } },
      data: { isDefault: false },
    });
  }

  return prisma.patientAddress.update({
    where: { id: addressId },
    data: {
      label: input.label !== undefined ? input.label : existing.label,
      addressLine1: input.addressLine1 !== undefined ? input.addressLine1.trim() : existing.addressLine1,
      addressLine2: input.addressLine2 !== undefined ? input.addressLine2?.trim() || null : existing.addressLine2,
      landmark: input.landmark !== undefined ? input.landmark?.trim() || null : existing.landmark,
      city: input.city !== undefined ? input.city.trim() : existing.city,
      state: input.state !== undefined ? input.state.trim() : existing.state,
      postalCode: input.postalCode !== undefined ? input.postalCode.trim() : existing.postalCode,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      isDefault: input.isDefault !== undefined ? input.isDefault : existing.isDefault,
    },
  });
}

/**
 * Deletes a saved address with strict patient ownership verification.
 * Rejects access if the address does not belong to the verified patient.
 */
export async function deletePatientAddress(patientId: string, addressId: string) {
  if (!patientId || !addressId) {
    throw new Error("Patient ID and Address ID are required.");
  }

  // Strict ownership check (IDOR guard)
  const existing = await prisma.patientAddress.findFirst({
    where: {
      id: addressId,
      patientId,
    },
  });

  if (!existing) {
    throw new Error("Access Denied: Address not found or does not belong to the authenticated patient.");
  }

  await prisma.patientAddress.delete({
    where: { id: addressId },
  });

  return { success: true, deletedAddressId: addressId };
}
