import { prisma } from "@/lib/db/prisma";
import { UserRole, AuditAction, Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/db/audit";
import { SessionUser } from "@/lib/auth/session";
import { isPlatformRole, ROLE_DEFAULT_PERMISSIONS } from "@/lib/auth/permissions";

export interface PlatformUserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getPlatformUsers(filters: PlatformUserFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};

  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        labUsers: {
          include: {
            lab: { select: { id: true, name: true, slug: true } },
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
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      isPlatformUser: isPlatformRole(u.role),
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      labMemberships: u.labUsers.map((lu) => ({
        labId: lu.lab.id,
        labName: lu.lab.name,
        role: lu.role,
      })),
    })),
  };
}

export async function createPlatformUser(
  data: {
    email: string;
    fullName: string;
    phone?: string;
    role: UserRole;
    tempPassword?: string;
  },
  actor: SessionUser
) {
  // Security rule: Only platform roles can be provisioned via Superadmin
  if (!isPlatformRole(data.role)) {
    throw new Error(`Role '${data.role}' is a tenant laboratory role. Use Lab Admin staff provisioning.`);
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  if (existing) {
    throw new Error(`A user with email '${data.email}' already exists.`);
  }

  const initialPassword = data.tempPassword || "GyrexPlatform2026!";
  const passwordHash = await hashPassword(initialPassword);

  const newUser = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      fullName: data.fullName.trim(),
      phone: data.phone || null,
      role: data.role,
      passwordHash,
      isActive: true,
    },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "User",
    entityId: newUser.id,
    metadata: {
      action: "PROVISION_PLATFORM_USER",
      email: newUser.email,
      assignedRole: newUser.role,
    },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    isActive: newUser.isActive,
  };
}

export async function togglePlatformUserStatus(
  userId: string,
  isActive: boolean,
  actor: SessionUser
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`User '${userId}' not found.`);
  }

  // Prevent self-lockout
  if (user.id === actor.userId && !isActive) {
    throw new Error("You cannot deactivate your own administrative account.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  await recordAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: AuditAction.USER_PERMISSION_CHANGED,
    entityType: "User",
    entityId: userId,
    metadata: {
      action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      targetEmail: user.email,
      targetRole: user.role,
    },
  });

  return updated;
}

export function getRolePermissionsMatrix() {
  const matrix: Array<{
    role: UserRole;
    isPlatform: boolean;
    permissions: string[];
    description: string;
  }> = [
    {
      role: UserRole.SUPERADMIN,
      isPlatform: true,
      permissions: ROLE_DEFAULT_PERMISSIONS.SUPERADMIN,
      description: "Full unrestricted platform administrator with cross-tenant command and emergency controls.",
    },
    {
      role: UserRole.PLATFORM_ADMIN,
      isPlatform: true,
      permissions: ROLE_DEFAULT_PERMISSIONS.PLATFORM_ADMIN,
      description: "Platform operations, lab verification, suspension, and central test master management.",
    },
    {
      role: UserRole.OPERATIONS_ADMIN,
      isPlatform: true,
      permissions: ROLE_DEFAULT_PERMISSIONS.OPERATIONS_ADMIN,
      description: "Operational support, order inspection, and laboratory verification assistance.",
    },
    {
      role: UserRole.FINANCE_ADMIN,
      isPlatform: true,
      permissions: ROLE_DEFAULT_PERMISSIONS.FINANCE_ADMIN,
      description: "Gyrex SaaS subscription billing, platform invoices, and aggregate diagnostic payment oversight.",
    },
    {
      role: UserRole.SUPPORT_ADMIN,
      isPlatform: true,
      permissions: ROLE_DEFAULT_PERMISSIONS.SUPPORT_ADMIN,
      description: "Customer service and laboratory ticket management with read-only operational context.",
    },
    {
      role: UserRole.CATALOGUE_ADMIN,
      isPlatform: true,
      permissions: ROLE_DEFAULT_PERMISSIONS.CATALOGUE_ADMIN,
      description: "Centralized Gyrex Test Master curation, categorization, and LOINC code standardization.",
    },
    {
      role: UserRole.LAB_OWNER,
      isPlatform: false,
      permissions: ROLE_DEFAULT_PERMISSIONS.LAB_OWNER,
      description: "Complete operational ownership of a single laboratory tenant storefront.",
    },
    {
      role: UserRole.LAB_ADMIN,
      isPlatform: false,
      permissions: ROLE_DEFAULT_PERMISSIONS.LAB_ADMIN,
      description: "Operational manager for orders, catalogue pricing, and report uploads for their lab.",
    },
    {
      role: UserRole.LAB_STAFF,
      isPlatform: false,
      permissions: ROLE_DEFAULT_PERMISSIONS.LAB_STAFF,
      description: "Phlebotomist or front-desk staff executing sample collections and viewing orders.",
    },
  ];

  return matrix;
}
