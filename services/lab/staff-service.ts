import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { hashPassword } from "@/lib/auth/password";
import { isPlatformRole } from "@/lib/auth/permissions";
import { UserRole, AuditAction } from "@prisma/client";

export interface InviteStaffInput {
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  permissions?: string[];
  initialPassword?: string;
}

const ALLOWED_STAFF_ROLES: UserRole[] = [
  UserRole.LAB_OWNER,
  UserRole.LAB_ADMIN,
  UserRole.LAB_STAFF,
];

/**
 * Lists all staff members associated with this laboratory.
 */
export async function getLabStaffMembers(labId: string) {
  const staff = await prisma.labUser.findMany({
    where: { labId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          lastLoginAt: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return staff.map((s) => ({
    labUserId: s.id,
    userId: s.user.id,
    email: s.user.email,
    fullName: s.user.fullName,
    phone: s.user.phone,
    role: s.role,
    permissions: s.permissions,
    isActive: s.isActive && s.user.isActive,
    lastLoginAt: s.user.lastLoginAt,
    joinedAt: s.createdAt,
  }));
}

/**
 * Invites or registers a new staff member to the laboratory.
 * STRICT SECURITY: Rejects platform roles (SUPERADMIN, PLATFORM_ADMIN, etc.)!
 */
export async function addOrInviteStaff(
  labId: string,
  input: InviteStaffInput,
  actorUserId?: string
) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  // 1. Role validation: Must be a lab role
  if (!ALLOWED_STAFF_ROLES.includes(input.role) || isPlatformRole(input.role)) {
    throw new Error(
      `Security Violation: Cannot assign platform role '${input.role}' to laboratory staff.`
    );
  }

  // 2. Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const password = input.initialPassword || "GyrexStaff2026!";
    const passwordHash = await hashPassword(password);

    user = await prisma.user.create({
      data: {
        email,
        fullName,
        phone: input.phone?.trim() || null,
        role: input.role,
        passwordHash,
        isActive: true,
      },
    });
  }

  // 3. Check existing membership
  const existingMembership = await prisma.labUser.findUnique({
    where: {
      labId_userId: {
        labId,
        userId: user.id,
      },
    },
  });

  if (existingMembership) {
    if (existingMembership.isActive) {
      throw new Error(`User with email '${email}' is already an active member of this laboratory.`);
    }

    // Re-activate
    const reactivated = await prisma.labUser.update({
      where: { id: existingMembership.id },
      data: {
        isActive: true,
        role: input.role,
        permissions: input.permissions ?? [],
      },
    });

    await recordAuditLog({
      actorUserId: actorUserId ?? null,
      action: AuditAction.USER_PERMISSION_CHANGED,
      entityType: "LabUser",
      entityId: reactivated.id,
      labId,
      metadata: {
        action: "STAFF_REACTIVATED",
        email,
        role: input.role,
      },
    });

    return reactivated;
  }

  // 4. Create new LabUser membership
  const membership = await prisma.labUser.create({
    data: {
      labId,
      userId: user.id,
      role: input.role,
      permissions: input.permissions ?? [],
      isActive: true,
    },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "LabUser",
    entityId: membership.id,
    labId,
    metadata: {
      action: "STAFF_INVITED",
      email,
      role: input.role,
    },
  });

  return membership;
}

/**
 * Toggles a staff member's active status within this laboratory.
 */
export async function toggleStaffStatus(
  labId: string,
  labUserId: string,
  isActive: boolean,
  actorUserId?: string
) {
  const membership = await prisma.labUser.findFirst({
    where: { id: labUserId, labId },
    include: { user: true },
  });

  if (!membership) {
    throw new Error("Staff member not found in your laboratory.");
  }

  // Prevent self-deactivation if owner
  if (actorUserId && membership.userId === actorUserId && !isActive) {
    throw new Error("You cannot deactivate your own administrative account.");
  }

  const updated = await prisma.labUser.update({
    where: { id: labUserId },
    data: { isActive },
  });

  await recordAuditLog({
    actorUserId: actorUserId ?? null,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "LabUser",
    entityId: labUserId,
    labId,
    metadata: {
      action: isActive ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
      staffEmail: membership.user.email,
    },
  });

  return updated;
}
