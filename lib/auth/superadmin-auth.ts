/**
 * Gyrex Labs - Superadmin Authorization & Session Guard
 *
 * Enforces platform-level authentication and role/permission checks for
 * /superadmin routes and /api/superadmin/* handlers.
 *
 * Strict Rule:
 * LAB_OWNER, LAB_ADMIN, LAB_STAFF, and PATIENT roles must NEVER be able to
 * access the Superadmin application.
 */

import { redirect } from "next/navigation";
import { getCurrentUser, requirePlatformAccess, AuthorizationError } from "./context";
import { isPlatformRole, hasEffectivePermission } from "./permissions";
import { SessionUser } from "./session";
import { recordAuditLog } from "../db/audit";
import { AuditAction } from "@prisma/client";

/**
 * Server-side helper for Superadmin React Server Component pages and layouts.
 * Checks authentication and platform role.
 * If not authenticated, redirects to /login?from=...
 * If user is a lab tenant user or patient, throws 403 / redirects with error.
 */
export async function requireSuperadminAccess(
  requiredPermission?: string
): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=platform_auth_required&from=/superadmin");
  }

  if (!isPlatformRole(user.role)) {
    // Log security alert for unauthorized tenant traversal into Superadmin
    await recordAuditLog({
      actorUserId: user.userId,
      actorRole: user.role,
      action: AuditAction.SECURITY_ALERT,
      entityType: "SuperadminGuard",
      entityId: user.userId,
      metadata: {
        userRole: user.role,
        reason: "Tenant user attempted to access /superadmin portal",
      },
    });

    throw new AuthorizationError(
      `Access denied: Role '${user.role}' is not authorized to access Superadmin platform administration.`,
      403
    );
  }

  if (requiredPermission) {
    const isAuthorized = hasEffectivePermission(user.role, [], requiredPermission);
    if (!isAuthorized) {
      throw new AuthorizationError(
        `Access denied: Missing required platform permission '${requiredPermission}'.`,
        403
      );
    }
  }

  return user;
}

/**
 * API route helper for /api/superadmin/* endpoints.
 * Throws typed AuthorizationError (401 or 403) directly.
 */
export async function requireSuperadminApi(
  requiredPermission?: string
): Promise<SessionUser> {
  const user = await requirePlatformAccess();

  if (requiredPermission) {
    const isAuthorized = hasEffectivePermission(user.role, [], requiredPermission);
    if (!isAuthorized) {
      throw new AuthorizationError(
        `Access denied: Missing required platform permission '${requiredPermission}'.`,
        403
      );
    }
  }

  return user;
}
