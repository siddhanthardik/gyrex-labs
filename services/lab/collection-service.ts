import { prisma } from "@/lib/db/prisma";

export interface CollectionFilter {
  scheduledDate?: Date;
  search?: string;
  isPending?: boolean;
}

/**
 * Lists home collections scheduled for this laboratory.
 */
export async function getLabCollections(labId: string, filter?: CollectionFilter) {
  const where: any = {
    labId, // Strict tenant verification
  };

  if (filter?.isPending) {
    where.sampleCollectedAt = null;
  }

  if (filter?.scheduledDate) {
    const start = new Date(filter.scheduledDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.scheduledDate);
    end.setHours(23, 59, 59, 999);
    where.scheduledDate = { gte: start, lte: end };
  }

  const collections = await prisma.collection.findMany({
    where,
    include: {
      order: {
        include: {
          patient: true,
          items: true,
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  return collections.map((c) => ({
    id: c.id,
    orderId: c.orderId,
    orderNumber: c.order.orderNumber,
    orderStatus: c.order.orderStatus,
    collectionType: c.collectionType,
    scheduledDate: c.scheduledDate,
    scheduledSlot: c.scheduledSlot,
    addressLine1: c.collectionAddressLine1,
    addressLine2: c.collectionAddressLine2,
    landmark: c.landmark,
    city: c.city,
    state: c.state,
    postalCode: c.postalCode,
    phlebotomistName: c.phlebotomistName,
    phlebotomistPhone: c.phlebotomistPhone,
    sampleCollectedAt: c.sampleCollectedAt,
    specialInstructions: c.specialInstructions,
    patientName: c.order.patient.fullName,
    patientPhone: c.order.patient.phone,
    testsSummary: c.order.items.map((i) => i.itemName).join(", "),
  }));
}

/**
 * Updates sample collection details (scheduling, phlebotomist assignment, collection timestamp).
 */
export async function updateLabCollection(
  labId: string,
  collectionId: string,
  data: {
    scheduledDate?: Date;
    scheduledSlot?: string;
    phlebotomistName?: string;
    phlebotomistPhone?: string;
    sampleCollectedAt?: Date;
    specialInstructions?: string;
  }
) {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, labId },
  });

  if (!existing) {
    throw new Error("Collection record not found or access denied.");
  }

  return prisma.collection.update({
    where: { id: collectionId },
    data: {
      scheduledDate: data.scheduledDate ?? undefined,
      scheduledSlot: data.scheduledSlot ?? undefined,
      phlebotomistName: data.phlebotomistName !== undefined ? data.phlebotomistName.trim() : undefined,
      phlebotomistPhone: data.phlebotomistPhone !== undefined ? data.phlebotomistPhone.trim() : undefined,
      sampleCollectedAt: data.sampleCollectedAt ?? undefined,
      specialInstructions: data.specialInstructions !== undefined ? data.specialInstructions.trim() : undefined,
    },
  });
}
