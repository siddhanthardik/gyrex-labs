import { prisma } from "@/lib/db/prisma";
import { ReportStatus } from "@prisma/client";

export interface SecurePatientReportItem {
  id: string;
  reportNumber: string;
  orderNumber: string;
  labName: string;
  patientName: string;
  status: ReportStatus;
  releasedAt: Date | null;
  uploadedAt: Date;
  testNames: string[];
}

/**
 * Clean phone number to digits only for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Securely retrieves reports for a patient after verifying order number & patient phone.
 * STRICT SECURITY: Never displays reports without verifying patient identity.
 */
export async function getAuthorizedPatientReports(
  orderNumber: string,
  verificationPhone: string
): Promise<SecurePatientReportItem[]> {
  const cleanPhone = normalizePhone(verificationPhone);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error("Invalid phone number. Please enter a valid 10-digit mobile number.");
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      patient: true,
      lab: {
        select: {
          name: true,
          slug: true,
        },
      },
      items: {
        select: {
          itemName: true,
        },
      },
      reports: {
        where: {
          status: {
            in: [ReportStatus.FINAL, ReportStatus.AMENDED],
          },
        },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found with the provided booking ID.");
  }

  const orderPhone = normalizePhone(order.patient.phone);
  if (!orderPhone.endsWith(cleanPhone) && !cleanPhone.endsWith(orderPhone)) {
    throw new Error("Access Denied: Phone number does not match this booking record.");
  }

  return order.reports.map((report) => ({
    id: report.id,
    reportNumber: report.reportNumber,
    orderNumber: order.orderNumber,
    labName: order.lab.name,
    patientName: order.patient.fullName,
    status: report.status,
    releasedAt: report.releasedAt,
    uploadedAt: report.uploadedAt,
    testNames: order.items.map((i) => i.itemName),
  }));
}

/**
 * Securely authorizes and downloads a diagnostic report.
 * Strictly verifies patient authorization before returning report content.
 */
export async function getAuthorizedReportDownload(
  reportId: string,
  verificationPhone: string
) {
  const cleanPhone = normalizePhone(verificationPhone);
  if (!cleanPhone) {
    throw new Error("Phone number verification required to access this diagnostic report.");
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      order: true,
      patient: true,
      lab: true,
      fileAsset: true,
    },
  });

  if (!report) {
    throw new Error("Report not found.");
  }

  const orderPhone = normalizePhone(report.patient.phone);
  if (!orderPhone.endsWith(cleanPhone) && !cleanPhone.endsWith(orderPhone)) {
    throw new Error("Security Violation: Unauthorized attempt to access another patient's diagnostic report.");
  }

  // Audit access and increment view count
  await prisma.report.update({
    where: { id: reportId },
    data: {
      viewCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  return {
    reportNumber: report.reportNumber,
    orderNumber: report.order.orderNumber,
    labName: report.lab.name,
    patientName: report.patient.fullName,
    mimeType: report.fileAsset.mimeType,
    fileName: report.fileAsset.originalFileName,
    status: report.status,
    releasedAt: report.releasedAt,
  };
}
