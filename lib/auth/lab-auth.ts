import { requireLabAccess, AuthorizationError } from "@/lib/auth/context";
import { hasEffectivePermission } from "@/lib/auth/permissions";
import { SessionUser, LabMembership } from "@/lib/auth/session";

/**
 * Enforces that the request has an active authenticated user with a valid laboratory membership,
 * and optionally validates that the user possesses a specific required permission.
 * Guarantees that labMembership is always defined.
 */
export async function requireLabTenant(requiredPermission?: string): Promise<{
  user: SessionUser;
  labMembership: LabMembership;
}> {
  const { user, labMembership } = await requireLabAccess();

  if (requiredPermission) {
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
  }

  return { user, labMembership };
}
