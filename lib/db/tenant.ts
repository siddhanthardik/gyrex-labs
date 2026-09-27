import { prisma } from "./prisma";

/**
 * Multi-Tenancy Security Utilities for Gyrex Labs
 *
 * CRITICAL RULE:
 * Lab A must NEVER be able to retrieve or mutate Lab B data through:
 * - URL manipulation
 * - API requests
 * - Database queries
 * - Frontend state
 * - Predictable IDs
 */

export interface TenantContext {
  labId: string;
  slug?: string;
}

/**
 * Validates that an order belongs to the given tenant.
 * Throws an explicit error if cross-tenant access is attempted.
 */
export async function assertOrderBelongsToTenant(orderId: string, labId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, labId: true, orderNumber: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.labId !== labId) {
    throw new Error(`Access Denied: Cross-tenant access attempted for order ${orderId} by tenant ${labId}`);
  }

  return order;
}

/**
 * Validates that a report belongs to the given tenant.
 */
export async function assertReportBelongsToTenant(reportId: string, labId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, labId: true, orderId: true },
  });

  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }

  if (report.labId !== labId) {
    throw new Error(`Access Denied: Cross-tenant access attempted for report ${reportId} by tenant ${labId}`);
  }

  return report;
}

/**
 * Validates that a lab test belongs to the given tenant.
 */
export async function assertLabTestBelongsToTenant(labTestId: string, labId: string) {
  const labTest = await prisma.labTest.findUnique({
    where: { id: labTestId },
    select: { id: true, labId: true, masterTestId: true },
  });

  if (!labTest) {
    throw new Error(`LabTest not found: ${labTestId}`);
  }

  if (labTest.labId !== labId) {
    throw new Error(`Access Denied: Cross-tenant access attempted for test ${labTestId} by tenant ${labId}`);
  }

  return labTest;
}

/**
 * Scopes a Prisma query filter strictly to the specified tenant.
 */
export function scopeToTenant<T extends Record<string, unknown>>(filter: T, labId: string): T & { labId: string } {
  return {
    ...filter,
    labId,
  };
}
