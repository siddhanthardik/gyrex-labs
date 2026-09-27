import { prisma } from "./prisma";
import { AuditAction, Prisma } from "@prisma/client";

export interface CreateAuditLogParams {
  actorUserId?: string | null;
  actorRole?: string | null;
  actorIp?: string | null;
  actorUserAgent?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  labId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Creates an append-only audit log entry.
 * Audit records must NEVER be updated or deleted by normal application workflows.
 */
export async function recordAuditLog(params: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole ?? null,
        actorIp: params.actorIp ?? null,
        actorUserAgent: params.actorUserAgent ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        labId: params.labId ?? null,
        orderId: params.orderId ?? null,
        metadata: params.metadata ? (JSON.parse(JSON.stringify(params.metadata)) as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (error) {
    // Avoid dropping main transactions if non-critical audit log logging encounters transient issues,
    // but log visibly to stderr for observability.
    console.error("FATAL AUDIT LOG FAILURE:", error, params);
    throw error;
  }
}
