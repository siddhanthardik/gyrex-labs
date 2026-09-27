import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import {
  ReportStatus,
  FileCategory,
  FileAccessClassification,
  StorageProvider,
  FileStatus,
  AuditAction,
  OrderStatus,
} from "@prisma/client";

export interface UploadReportParams {
  orderId: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  checksumSha256?: string;
  releasedNow?: boolean;
}

function generateReportNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RPT-${year}-${randomSuffix}`;
}

/**
 * Lists diagnostic reports uploaded by this laboratory.
 */
export async function getLabReports(
  labId: string,
  filter?: { search?: string; status?: ReportStatus }
) {
  const where: any = {
    labId, // Strict tenant filter
  };

  if (filter?.status) {
    where.status = filter.status;
  }

  if (filter?.search) {
    const term = filter.search.trim();
    where.OR = [
      { reportNumber: { contains: term, mode: "insensitive" } },
      { order: { orderNumber: { contains: term, mode: "insensitive" } } },
      { patient: { fullName: { contains: term, mode: "insensitive" } } },
      { patient: { phone: { contains: term } } },
    ];
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          items: { select: { itemName: true } },
        },
      },
      patient: {
        select: {
          fullName: true,
          phone: true,
        },
      },
      fileAsset: {
        select: {
          originalFileName: true,
          mimeType: true,
          fileSizeBytes: true,
        },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return reports.map((r) => ({
    id: r.id,
    reportNumber: r.reportNumber,
    orderId: r.orderId,
    orderNumber: r.order.orderNumber,
    orderStatus: r.order.orderStatus,
    patientName: r.patient.fullName,
    patientPhone: r.patient.phone,
    testsSummary: r.order.items.map((i) => i.itemName).join(", "),
    status: r.status,
    uploadedAt: r.uploadedAt,
    releasedAt: r.releasedAt,
    fileName: r.fileAsset.originalFileName,
    fileSize: Number(r.fileAsset.fileSizeBytes),
    viewCount: r.viewCount,
    lastAccessedAt: r.lastAccessedAt,
  }));
}

/**
 * Uploads and associates a diagnostic report with an order.
 * Strictly verifies tenant boundary (order must belong to this labId).
 * Automatically updates order to REPORT_READY when appropriate.
 */
export async function uploadLabReport(
  labId: string,
  params: UploadReportParams,
  actorUserId?: string
) {
  // 1. Verify order belongs to this lab
  const order = await prisma.order.findFirst({
    where: { id: params.orderId, labId },
    include: { patient: true },
  });

  if (!order) {
    throw new Error("Order not found or access denied.");
  }

  const reportNumber = generateReportNumber();

  // 2. Create FileAsset and Report record in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Protected FileAsset
    const fileAsset = await tx.fileAsset.create({
      data: {
        labId,
        category: FileCategory.REPORT,
        storageProvider: StorageProvider.LOCAL_SECURE,
        storagePath: params.storagePath,
        originalFileName: params.originalFileName,
        mimeType: params.mimeType,
        fileSizeBytes: BigInt(params.fileSizeBytes),
        checksumSha256: params.checksumSha256 ?? null,
        accessClassification: FileAccessClassification.RESTRICTED_PATIENT_LAB,
        status: FileStatus.ACTIVE,
        createdByUserId: actorUserId ?? null,
      },
    });

    const isReleased = params.releasedNow ?? true;

    // Report entity
    const report = await tx.report.create({
      data: {
        reportNumber,
        orderId: order.id,
        labId,
        patientId: order.patientId,
        fileAssetId: fileAsset.id,
        status: isReleased ? ReportStatus.FINAL : ReportStatus.DRAFT,
        uploadedByUserId: actorUserId ?? null,
        uploadedAt: new Date(),
        releasedAt: isReleased ? new Date() : null,
      },
    });

    const canAdvanceStatuses: OrderStatus[] = [
      OrderStatus.SAMPLE_COLLECTED,
      OrderStatus.PROCESSING,
      OrderStatus.CONFIRMED,
    ];
    if (isReleased && canAdvanceStatuses.includes(order.orderStatus)) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: OrderStatus.REPORT_READY,
        },
      });
    }

    return report;
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.REPORT_UPLOADED,
    entityType: "Report",
    entityId: result.id,
    labId,
    orderId: order.id,
    metadata: {
      reportNumber: result.reportNumber,
      orderNumber: order.orderNumber,
      fileName: params.originalFileName,
      status: result.status,
    },
  });

  return result;
}

/**
 * Replaces or amends an existing report.
 * Strictly respects tenant bounds and updates status to AMENDED.
 */
export async function amendLabReport(
  labId: string,
  reportId: string,
  params: UploadReportParams,
  reason: string,
  actorUserId?: string
) {
  const existingReport = await prisma.report.findFirst({
    where: { id: reportId, labId },
    include: { order: true },
  });

  if (!existingReport) {
    throw new Error("Report not found or access denied.");
  }

  if (!reason?.trim()) {
    throw new Error("A clinical or operational reason is required to amend a report.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const fileAsset = await tx.fileAsset.create({
      data: {
        labId,
        category: FileCategory.REPORT,
        storageProvider: StorageProvider.LOCAL_SECURE,
        storagePath: params.storagePath,
        originalFileName: params.originalFileName,
        mimeType: params.mimeType,
        fileSizeBytes: BigInt(params.fileSizeBytes),
        checksumSha256: params.checksumSha256 ?? null,
        accessClassification: FileAccessClassification.RESTRICTED_PATIENT_LAB,
        status: FileStatus.ACTIVE,
        createdByUserId: actorUserId ?? null,
      },
    });

    return tx.report.update({
      where: { id: reportId },
      data: {
        fileAssetId: fileAsset.id,
        status: ReportStatus.AMENDED,
        releasedAt: new Date(),
      },
    });
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.REPORT_UPLOADED,
    entityType: "Report",
    entityId: reportId,
    labId,
    orderId: existingReport.orderId,
    metadata: {
      action: "REPORT_AMENDED",
      reportNumber: existingReport.reportNumber,
      reason,
    },
  });

  return result;
}
