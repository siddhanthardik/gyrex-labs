import { prisma } from "../db/prisma";
import { verifyPassword } from "./password";
import { createSessionToken, setSessionCookie, SessionUser, LabMembership, clearSessionCookie } from "./session";
import { checkRateLimit, recordRateLimitAttempt, resetRateLimit } from "./rate-limiter";
import { recordAuditLog } from "../db/audit";
import { AuditAction } from "@prisma/client";

export interface LoginParams {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  success: boolean;
  user?: SessionUser;
  error?: string;
  statusCode?: number;
  redirectUrl?: string;
}

/**
 * Authenticates a user securely and establishes an HTTP-only session.
 */
export async function loginUser(params: LoginParams): Promise<LoginResult> {
  const { email, password, ipAddress = "127.0.0.1", userAgent } = params;

  // 1. Input validation
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return {
      success: false,
      error: "Email and password are required.",
      statusCode: 400,
    };
  }

  // 2. Brute-force rate limiting check
  const rateLimitKey = `login:${ipAddress}:${normalizedEmail}`;
  const rateLimitStatus = checkRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });

  if (!rateLimitStatus.success) {
    await recordAuditLog({
      actorIp: ipAddress,
      actorUserAgent: userAgent,
      action: AuditAction.LOGIN_FAILED,
      entityType: "UserAuth",
      entityId: normalizedEmail,
      metadata: {
        reason: "Rate limit exceeded. Too many failed attempts.",
        retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
      },
    });

    return {
      success: false,
      error: `Too many failed login attempts. Please try again in ${rateLimitStatus.retryAfterSeconds} seconds.`,
      statusCode: 429,
    };
  }

  // 3. User lookup
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      labUsers: {
        where: { isActive: true },
        include: {
          lab: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  // Generic failure message to prevent email enumeration
  const genericFailure = "Invalid email or password.";

  if (!user) {
    recordRateLimitAttempt(rateLimitKey);
    await recordAuditLog({
      actorIp: ipAddress,
      actorUserAgent: userAgent,
      action: AuditAction.LOGIN_FAILED,
      entityType: "UserAuth",
      entityId: normalizedEmail,
      metadata: { reason: "User not found" },
    });

    return {
      success: false,
      error: genericFailure,
      statusCode: 401,
    };
  }

  // 4. Account status check (ACTIVE vs SUSPENDED/DISABLED)
  if (!user.isActive) {
    await recordAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      actorIp: ipAddress,
      actorUserAgent: userAgent,
      action: AuditAction.SECURITY_ALERT,
      entityType: "UserAuth",
      entityId: user.id,
      metadata: { reason: "Attempted login to disabled/suspended account" },
    });

    return {
      success: false,
      error: "Your account has been deactivated. Please contact your administrator.",
      statusCode: 403,
    };
  }

  // 5. Password verification
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    recordRateLimitAttempt(rateLimitKey);
    await recordAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      actorIp: ipAddress,
      actorUserAgent: userAgent,
      action: AuditAction.LOGIN_FAILED,
      entityType: "UserAuth",
      entityId: user.id,
      metadata: { reason: "Invalid password credential" },
    });

    return {
      success: false,
      error: genericFailure,
      statusCode: 401,
    };
  }

  // 6. Reset rate limit counter on successful credentials
  resetRateLimit(rateLimitKey);

  // 7. Update lastLoginAt timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 8. Construct Lab Memberships
  const labMemberships: LabMembership[] = user.labUsers.map((lu) => ({
    labId: lu.lab.id,
    slug: lu.lab.slug,
    name: lu.lab.name,
    role: lu.role,
    permissions: lu.permissions,
  }));

  const sessionUser: SessionUser = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    labMemberships,
    activeLabId: labMemberships[0]?.labId ?? null,
  };

  // 9. Generate & set HTTP-only cookie
  const token = await createSessionToken(sessionUser);
  await setSessionCookie(token);

  // 10. Determine redirection target based on role
  let redirectUrl = "/";
  if (["SUPERADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN", "CATALOGUE_ADMIN"].includes(user.role)) {
    redirectUrl = "/superadmin";
  } else if (["LAB_OWNER", "LAB_ADMIN", "LAB_STAFF"].includes(user.role)) {
    redirectUrl = "/lab";
  }

  return {
    success: true,
    user: sessionUser,
    redirectUrl,
  };
}

/**
 * Logs out the active user and clears the session.
 */
export async function logoutUser(): Promise<void> {
  await clearSessionCookie();
}
