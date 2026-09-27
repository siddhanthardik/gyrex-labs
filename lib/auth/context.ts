import { getSessionFromCookies, SessionUser, LabMembership } from "./session";
import { UserRole } from "@prisma/client";
import { hasEffectivePermission, isPlatformRole } from "./permissions";
import { recordAuditLog } from "../db/audit";
import { AuditAction } from "@prisma/client";

/**
 * Standard Security Error thrown when an unauthorized action is attempted.
 */
export class AuthorizationError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

/**
 * Returns the currently authenticated user, or null if unauthenticated.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionFromCookies();
}

/**
 * Enforces that a request has an active, valid session.
 * Throws AuthorizationError(401) if unauthenticated.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError("Authentication required. Please sign in.", 401);
  }
  return user;
}

/**
 * Enforces that the authenticated user possesses one of the specified roles.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    await recordAuditLog({
      actorUserId: user.userId,
      actorRole: user.role,
      action: AuditAction.SECURITY_ALERT,
      entityType: "RoleGuard",
      entityId: user.userId,
      metadata: {
        attemptedRoles: allowedRoles,
        userRole: user.role,
        reason: "Insufficient role privileges",
      },
    });

    throw new AuthorizationError(
      `Access denied: Role '${user.role}' is not authorized for this resource.`,
      403
    );
  }

  return user;
}

/**
 * Enforces that the user has a platform-level role (e.g. SUPERADMIN, PLATFORM_ADMIN, etc.).
 * Strictly blocks laboratory tenant users (LAB_OWNER, LAB_ADMIN, LAB_STAFF).
 */
export async function requirePlatformAccess(): Promise<SessionUser> {
  const user = await requireAuth();

  if (!isPlatformRole(user.role)) {
    await recordAuditLog({
      actorUserId: user.userId,
      actorRole: user.role,
      action: AuditAction.SECURITY_ALERT,
      entityType: "PlatformGuard",
      entityId: user.userId,
      metadata: {
        userRole: user.role,
        reason: "Tenant user attempted to access platform-level resource",
      },
    });

    throw new AuthorizationError(
      "Access denied: Platform administrator privileges required.",
      403
    );
  }

  return user;
}

/**
 * Enforces that the user is specifically a SUPERADMIN.
 */
export async function requireSuperadmin(): Promise<SessionUser> {
  return requireRole([UserRole.SUPERADMIN]);
}

/**
 * Enforces that the user is authorized to access a specific laboratory (or their active lab).
 * 
 * CRITICAL TENANT ISOLATION RULE:
 * A LAB_OWNER/LAB_ADMIN/LAB_STAFF user of Lab A must NEVER access Lab B data.
 * Platform admins (SUPERADMIN, PLATFORM_ADMIN) are permitted across labs for administrative support.
 */
export async function requireLabAccess(
  targetLabId?: string
): Promise<{ user: SessionUser; labMembership: LabMembership }> {
  const user = await requireAuth();

  // If user is a Platform Admin / Superadmin, they have cross-tenant platform visibility
  if (isPlatformRole(user.role)) {
    const primaryLab = targetLabId || user.activeLabId || "PLATFORM_SUPERADMIN";
    return {
      user,
      labMembership: {
        labId: primaryLab,
        slug: "platform",
        name: "Platform Administrative Context",
        role: user.role,
        permissions: ["*"],
      },
    };
  }

  // For laboratory users, find the matching membership
  const labIdToCheck = targetLabId || user.activeLabId || user.labMemberships[0]?.labId;

  if (!labIdToCheck) {
    throw new AuthorizationError("No laboratory context found for this user.", 403);
  }

  const membership = user.labMemberships.find(
    (m) => m.labId === labIdToCheck || m.slug === labIdToCheck
  );

  if (!membership) {
    // Log security alert for unauthorized cross-tenant attempt
    await recordAuditLog({
      actorUserId: user.userId,
      actorRole: user.role,
      action: AuditAction.SECURITY_ALERT,
      entityType: "TenantIsolationGuard",
      entityId: labIdToCheck,
      labId: user.labMemberships[0]?.labId ?? null,
      metadata: {
        attemptedLabId: labIdToCheck,
        authorizedLabs: user.labMemberships.map((m) => m.labId),
        reason: "Cross-tenant access attempted by laboratory staff",
      },
    });

    throw new AuthorizationError(
      `Access denied: You are not an authorized member of laboratory '${labIdToCheck}'.`,
      403
    );
  }

  return {
    user,
    labMembership: membership,
  };
}

/**
 * Enforces that a user has a specific granular permission.
 * If in a laboratory context, checks lab role + custom granted permissions.
 * If in a platform context, checks platform role permissions.
 */
export async function requirePermission(
  requiredPermission: string,
  targetLabId?: string
): Promise<{ user: SessionUser; labMembership?: LabMembership }> {
  const user = await requireAuth();

  // 1. Check if user has platform-level permission
  if (isPlatformRole(user.role)) {
    const hasPerm = hasEffectivePermission(user.role, [], requiredPermission);
    if (!hasPerm) {
      throw new AuthorizationError(
        `Access denied: Platform role '${user.role}' lacks permission '${requiredPermission}'.`,
        403
      );
    }
    return { user };
  }

  // 2. Otherwise check within the laboratory membership context
  const { labMembership } = await requireLabAccess(targetLabId);
  const hasPerm = hasEffectivePermission(
    labMembership.role,
    labMembership.permissions,
    requiredPermission
  );

  if (!hasPerm) {
    throw new AuthorizationError(
      `Access denied: Laboratory role '${labMembership.role}' lacks permission '${requiredPermission}'.`,
      403
    );
  }

  return { user, labMembership };
}

/**
 * Validates that an incoming database query parameter for labId strictly matches the user's authorized labId.
 * Never trust a client-supplied labId without this check!
 */
export async function assertAuthorizedTenantParam(clientSuppliedLabId: string): Promise<string> {
  const { labMembership } = await requireLabAccess(clientSuppliedLabId);
  return labMembership.labId;
}
