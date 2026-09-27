import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "gyrex_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface LabMembership {
  labId: string;
  slug: string;
  name: string;
  role: UserRole;
  permissions: string[];
}

export interface SessionUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  labMemberships: LabMembership[];
  activeLabId?: string | null;
}

/**
 * Derives the signing secret key for jose from AUTH_SECRET
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "gyrex-labs-development-fallback-secret-minimum-32-characters";
  return new TextEncoder().encode(secret);
}

/**
 * Creates and signs an HTTP-only session JWT.
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  const secretKey = getSecretKey();

  return new SignJWT({
    sub: user.userId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    labMemberships: user.labMemberships,
    activeLabId: user.activeLabId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey);
}

/**
 * Verifies a session token string and returns the decoded SessionUser.
 * Returns null if token is invalid, expired, or tampered with.
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      email: (payload.email as string) || "",
      fullName: (payload.fullName as string) || "",
      role: payload.role as UserRole,
      labMemberships: (payload.labMemberships as LabMembership[]) || [],
      activeLabId: (payload.activeLabId as string | null) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the secure HTTP-only session cookie in Next.js response.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Clears the session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Retrieves and validates the current session from incoming HTTP-only cookies.
 */
export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
