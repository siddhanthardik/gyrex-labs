import { prisma } from "@/lib/db/prisma";

export interface PatientFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Lists patients associated specifically with this laboratory via LabPatient.
 * STRICT ISOLATION: Never returns another laboratory's patient records or spend statistics.
 */
export async function getLabPatients(labId: string, filter?: PatientFilter) {
  const where: any = {
    labId, // Mandatory tenant boundary
  };

  if (filter?.search) {
    const term = filter.search.trim();
    where.patient = {
      OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    };
  }

  const page = Math.max(1, filter?.page ?? 1);
  const limit = Math.min(50, Math.max(1, filter?.limit ?? 20));
  const skip = (page - 1) * limit;

  const [associations, totalCount] = await Promise.all([
    prisma.labPatient.findMany({
      where,
      include: {
        patient: {
          include: {
            orders: {
              where: { labId }, // STRICT: Only this lab's orders
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                orderStatus: true,
                totalAmount: true,
              },
            },
            reports: {
              where: { labId }, // STRICT: Only this lab's reports
              select: { id: true, status: true },
            },
          },
        },
      },
      orderBy: { lastVisitAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.labPatient.count({ where }),
  ]);

  return {
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    patients: associations.map((lp) => {
      const lastOrder = lp.patient.orders[0] || null;
      const reportsCount = lp.patient.reports.length;
      const hasReadyReport = lp.patient.reports.some(
        (r) => r.status === "FINAL" || r.status === "AMENDED"
      );

      return {
        labPatientId: lp.id,
        patientId: lp.patientId,
        fullName: lp.patient.fullName,
        phone: lp.patient.phone,
        email: lp.patient.email,
        gender: lp.patient.gender,
        ageYears: lp.patient.ageYears,
        uhid: lp.uhid,
        totalOrdersCount: lp.totalOrdersCount,
        totalSpent: Number(lp.totalSpent),
        firstVisitAt: lp.firstVisitAt,
        lastVisitAt: lp.lastVisitAt,
        lastOrder: lastOrder
          ? {
              orderNumber: lastOrder.orderNumber,
              createdAt: lastOrder.createdAt,
              orderStatus: lastOrder.orderStatus,
              totalAmount: Number(lastOrder.totalAmount),
            }
          : null,
        reportsSummary: {
          totalCount: reportsCount,
          hasReadyReport,
        },
      };
    }),
  };
}

/**
 * Retrieves full details for a patient within this laboratory tenant only.
 */
export async function getLabPatientDetail(labId: string, labPatientId: string) {
  const labPatient = await prisma.labPatient.findFirst({
    where: { id: labPatientId, labId },
    include: {
      patient: {
        include: {
          orders: {
            where: { labId }, // Only this lab's orders!
            include: { items: true, reports: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!labPatient) {
    throw new Error("Patient not found in your laboratory directory.");
  }

  return {
    id: labPatient.id,
    patientId: labPatient.patientId,
    fullName: labPatient.patient.fullName,
    phone: labPatient.patient.phone,
    email: labPatient.patient.email,
    gender: labPatient.patient.gender,
    ageYears: labPatient.patient.ageYears,
    bloodGroup: labPatient.patient.bloodGroup,
    uhid: labPatient.uhid,
    notes: labPatient.notes,
    totalOrdersCount: labPatient.totalOrdersCount,
    totalSpent: Number(labPatient.totalSpent),
    firstVisitAt: labPatient.firstVisitAt,
    lastVisitAt: labPatient.lastVisitAt,
    orders: labPatient.patient.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount),
      tests: o.items.map((i) => i.itemName),
      reports: o.reports.map((r) => ({
        id: r.id,
        reportNumber: r.reportNumber,
        status: r.status,
      })),
    })),
  };
}
