import { prisma } from "@/lib/db/prisma";
import { ReportStatus, AuditAction, Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";

export interface ReportCentreFilters {
  search?: string;
  labId?: string;
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
}

export async function getReportCentreData(filters: ReportCentreFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ReportWhereInput = {};

  if (filters.search) {
    where.OR = [
      { reportNumber: { contains: filters.search, mode: "insensitive" } },
      { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
      { patient: { fullName: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  if (filters.labId) {
    where.labId = filters.labId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const [total, draftCount, finalCount, amendedCount, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.count({ where: { status: ReportStatus.DRAFT } }),
    prisma.report.count({ where: { status: ReportStatus.FINAL } }),
    prisma.report.count({ where: { status: ReportStatus.AMENDED } }),
    prisma.report.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lab: { select: { id: true, name: true, slug: true } },
        order: { select: { id: true, orderNumber: true, orderStatus: true } },
        patient: { select: { id: true, fullName: true, phone: true } },
        fileAsset: {
          select: {
            id: true,
            originalFileName: true,
            mimeType: true,
            fileSizeBytes: true,
            storageProvider: true,
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
    stats: {
      total,
      draftCount,
      finalCount,
      amendedCount,
    },
    reports: reports.map((r) => ({
      id: r.id,
      reportNumber: r.reportNumber,
      orderId: r.order.id,
      orderNumber: r.order.orderNumber,
      orderStatus: r.order.orderStatus,
      labId: r.lab.id,
      labName: r.lab.name,
      patientName: r.patient.fullName,
      patientPhone: r.patient.phone,
      fileName: r.fileAsset.originalFileName,
      fileSize: Number(r.fileAsset.fileSizeBytes),
      mimeType: r.fileAsset.mimeType,
      status: r.status,
      uploadedAt: r.uploadedAt.toISOString(),
      releasedAt: r.releasedAt?.toISOString() || null,
      deliveredViaEmailAt: r.deliveredViaEmailAt?.toISOString() || null,
      deliveredViaWhatsappAt: r.deliveredViaWhatsappAt?.toISOString() || null,
      viewCount: r.viewCount,
      lastAccessedAt: r.lastAccessedAt?.toISOString() || null,
    })),
  };
}

export async function auditReportInspection(
  reportId: string,
  actor: SessionUser,
  reason: string
) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      lab: { select: { id: true, name: true } },
      order: { select: { orderNumber: true } },
    },
  });

  if (!report) {
    throw new Error(`Report '${reportId}' not found`);
  }

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.REPORT_ACCESSED,
    entityType: "Report",
    entityId: reportId,
    labId: report.labId,
    orderId: report.orderId,
    metadata: {
      reportNumber: report.reportNumber,
      orderNumber: report.order.orderNumber,
      reason,
      inspectedByPlatformRole: actor.role,
    },
  });

  return {
    success: true,
    reportNumber: report.reportNumber,
  };
}
