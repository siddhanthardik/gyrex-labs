import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export interface PlatformPatientFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAllPlatformPatients(filters: PlatformPatientFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.PatientWhereInput = {};

  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        labAssociations: {
          include: {
            lab: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: {
          select: {
            orders: true,
            reports: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    patients: patients.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      phone: p.phone,
      email: p.email,
      gender: p.gender,
      ageYears: p.ageYears,
      labsUsed: p.labAssociations.map((la) => ({
        labId: la.lab.id,
        labName: la.lab.name,
        labSlug: la.lab.slug,
        ordersCount: la.totalOrdersCount,
      })),
      totalOrdersCount: p._count.orders,
      totalReportsCount: p._count.reports,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}
