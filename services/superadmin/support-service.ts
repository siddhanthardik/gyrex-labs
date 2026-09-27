import { prisma } from "@/lib/db/prisma";
import { TicketStatus, TicketPriority, Prisma, AuditAction } from "@prisma/client";
import { SessionUser } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/db/audit";

export interface SupportTicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  labId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getSupportTickets(filters: SupportTicketFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SupportTicketWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.labId) {
    where.labId = filters.labId;
  }

  if (filters.search) {
    where.OR = [
      { ticketNumber: { contains: filters.search, mode: "insensitive" } },
      { subject: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        lab: { select: { id: true, name: true, slug: true } },
        createdByUser: { select: { fullName: true, email: true } },
        assignedToUser: { select: { fullName: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    tickets: tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      labId: t.lab?.id || null,
      labName: t.lab?.name || "Direct Platform Support",
      createdByName: t.createdByUser?.fullName || "System/Guest",
      assignedToName: t.assignedToUser?.fullName || "Unassigned",
      assignedToUserId: t.assignedToUserId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      closedAt: t.closedAt?.toISOString() || null,
    })),
  };
}

export async function updateSupportTicket(
  ticketId: string,
  data: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToUserId?: string | null;
  },
  actor: SessionUser
) {
  const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!existing) {
    throw new Error(`Support ticket '${ticketId}' not found.`);
  }

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      ...(data.status && {
        status: data.status,
        closedAt: data.status === TicketStatus.RESOLVED || data.status === TicketStatus.CLOSED ? new Date() : null,
      }),
      ...(data.priority && { priority: data.priority }),
      ...(data.assignedToUserId !== undefined && { assignedToUserId: data.assignedToUserId }),
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "SupportTicket",
    entityId: ticketId,
    labId: existing.labId || undefined,
    metadata: {
      previousStatus: existing.status,
      newStatus: updated.status,
      priority: updated.priority,
    },
  });

  return updated;
}
